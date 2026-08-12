/**
 * The Kayak search a flight form hands off to.
 *
 * Flights are searched on Kayak (lib/booking-partners.ts), which means the
 * whole search has to survive being written as a URL. That is worth having in
 * one tested place rather than built inline: a wrong URL does not throw, it
 * opens Kayak on the wrong day, or in the wrong city, or with the filters
 * silently dropped — and nobody finds out until somebody has booked.
 */

import { AIRPORTS, METRO_AREAS } from "@/data/airports";
import { today } from "@/lib/date-range";

export type Leg = {
  /** Airport or metro code, e.g. JFK or NYC. */
  from: string;
  to: string;
  /** YYYY-MM-DD. */
  date: string;
};

export type SearchShape =
  | { trip: "round-trip"; legs: [Leg]; ret: string }
  | { trip: "one-way"; legs: [Leg] }
  | { trip: "multi-city"; legs: Leg[] };

/**
 * Every code this site knows — real airports and the metro areas that stand
 * for several of them.
 */
const KNOWN = new Set<string>([...AIRPORTS.map((a) => a.code), ...Object.keys(METRO_AREAS)].map((c) => c.toUpperCase()));

/**
 * The code out of what the airport box holds.
 *
 * The box reads "New York — all airports (NYC)" after a pick, and "KRK" when
 * somebody typed a code straight in. Both have to come out as a code.
 *
 * A BARE THREE LETTERS IS NOT ENOUGH. "New" is three letters and is somebody
 * halfway through typing New York; taking it as the code NEW would open a
 * search for a city they never chose, and the search would look like it
 * worked. So loose text is only a code when it is one this site actually
 * knows — otherwise it is nothing, and searchProblem says so.
 */
export function airportCode(value: string): string {
  const inBrackets = value.match(/\(([A-Za-z]{3})\)\s*$/);
  if (inBrackets) return inBrackets[1].toUpperCase();
  const bare = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(bare) && KNOWN.has(bare) ? bare : "";
}

/**
 * What the airport list should search on, given what is in the box.
 *
 * THE BUG THIS FIXES: once somebody picked an airport, the box held the whole
 * label — "New York — all airports (NYC)" — and the list matched nothing
 * against it. So the dropdown reopened empty and there was no way to choose a
 * different airport without deleting the text by hand first. Picking one
 * airport locked the field.
 *
 * A chosen label searches on its code, which brings back that airport and the
 * others in its city. Anything else searches on itself.
 */
export function searchTermFor(query: string): string {
  const code = query.match(/\(([A-Za-z]{3})\)\s*$/);
  return code ? code[1] : query.trim();
}

/** Why this search cannot be run, or null. */
export function searchProblem(shape: SearchShape): string | null {
  const legs = shape.legs;
  if (legs.length === 0) return "Add a flight.";
  for (const [index, leg] of legs.entries()) {
    const where = legs.length > 1 ? ` on flight ${index + 1}` : "";
    if (!airportCode(leg.from) || !airportCode(leg.to)) {
      return `Choose both airports${where} — pick from the list, or type a code like JFK.`;
    }
    if (airportCode(leg.from) === airportCode(leg.to)) return `The two airports${where} are the same.`;
    if (!leg.date) return `Choose a date${where}.`;
    if (leg.date < today()) return `That date${where} has already passed.`;
  }
  if (shape.trip === "round-trip") {
    if (!shape.ret) return "Choose a return date, or switch to one way.";
    if (shape.ret < legs[0].date) return "The return is before the departure.";
  }
  if (shape.trip === "multi-city") {
    // Out of order is almost always a typo, and Kayak takes the dates as given
    // — so it would search a journey nobody could fly and show nothing.
    for (let i = 1; i < legs.length; i++) {
      if (legs[i].date < legs[i - 1].date) return `Flight ${i + 1} leaves before flight ${i}.`;
    }
  }
  return null;
}

/**
 * The Kayak address for this search.
 *
 * Kayak's path is pairs of route and date, which is the same shape for one leg
 * or five — a round trip is the outbound path with the return date appended,
 * and a multi-city is the pairs repeated. Building all three the same way is
 * why this is one function rather than three.
 *
 * `nonstop` is a filter Kayak reads from the query string. It is a preference
 * rather than a promise: if Kayak ever changes the parameter the search still
 * opens on the right route and dates, showing everything, which is the safe
 * way for it to fail.
 */
export function kayakUrl(shape: SearchShape, options: { nonstop?: boolean; affiliate?: string } = {}): string {
  const legs = shape.legs.map((leg) => `${airportCode(leg.from)}-${airportCode(leg.to)}/${leg.date}`);
  const path = shape.trip === "round-trip" ? `${legs[0]}/${shape.ret}` : legs.join("/");

  const query = new URLSearchParams({ sort: "bestflight_a" });
  if (options.nonstop) query.set("fs", "stops=0");

  const url = `https://www.kayak.com/flights/${path}?${query.toString()}`;
  return withAffiliate(url, options.affiliate);
}

/**
 * The affiliate key, appended.
 *
 * Kept beside the URL building rather than in the component, because a search
 * that opens without it earns nothing and nobody would notice: the page looks
 * exactly the same.
 */
export function withAffiliate(url: string, params?: string): string {
  const extra = params?.trim().replace(/^[?&]/, "");
  if (!extra) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${extra}`;
}

/** How the trip reads on the "did you book it?" prompt afterwards. */
export function describeSearch(shape: SearchShape): string {
  const leg = (l: Leg) => `${airportCode(l.from)} → ${airportCode(l.to)}${l.date ? `, ${l.date}` : ""}`;
  if (shape.trip === "round-trip") return `${leg(shape.legs[0])} and back ${shape.ret}`;
  if (shape.trip === "one-way") return leg(shape.legs[0]);
  return shape.legs.map(leg).join("; ");
}
