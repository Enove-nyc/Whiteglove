// Turning what somebody typed into the code Duffel should be asked about.
//
// The old rule was one line: take the last three letters of the box. So
// "London (LHR)" searched Heathrow, and a traveler who did not mind which
// London airport they landed at was shown Heathrow's prices and nothing else —
// with the cheap Gatwick flight sitting there unsearched.
//
// IATA already solved this. A city served by several airports has a code of its
// own — LON, NYC, PAR, CHI, WAS, MIL — and Duffel accepts one in place of an
// airport code and searches the whole area in a single request. So "London" is
// not a vague version of "Heathrow"; it is a different and usually better
// question, and this file is what tells the two apart.

import { AIRPORTS, type Airport, METRO_AREAS } from "@/data/airports";

export type Endpoint = {
  /** What goes to Duffel: an airport code, or a metropolitan code. */
  code: string;
  /** For the traveler: "London — all airports", or "Kraków (KRK)". */
  label: string;
  /** True when this covers more than one airport. */
  wholeCity: boolean;
  /** The airports this covers, for showing what was actually searched. */
  airports: string[];
};

/** The airports inside a metropolitan code, in a stable order. */
export function airportsInMetro(metro: string): string[] {
  return AIRPORTS.filter((a) => a.cityCode === metro)
    .sort((a, b) => (a.size === b.size ? a.code.localeCompare(b.code) : a.size === "major" ? -1 : 1))
    .map((a) => a.code);
}

function metroEndpoint(code: string): Endpoint {
  const area = METRO_AREAS[code];
  return { code, label: area?.label ?? code, wholeCity: true, airports: airportsInMetro(code) };
}

/**
 * Read a typed or picked value into something searchable.
 *
 * Accepts what the box actually contains at each stage: a bare code the
 * traveler typed ("LHR", "LON"), the label the picker writes back
 * ("London — all airports", "Kraków (KRK)"), or a plain city name.
 *
 * Returns null when nothing recognisable is in there, so the caller can say so
 * rather than sending a guess.
 */
export function resolveEndpoint(input: unknown): Endpoint | null {
  const text = String(input ?? "").trim();
  if (!text) return null;
  const upper = text.toUpperCase();

  // A code in brackets, as the picker writes it, or typed bare.
  const bracketed = /\(([A-Z]{3})\)\s*$/.exec(upper)?.[1];
  const bare = /^[A-Z]{3}$/.test(upper) ? upper : undefined;
  const typed = bracketed ?? bare;

  if (typed) {
    if (METRO_AREAS[typed]) return metroEndpoint(typed);
    const airport = AIRPORTS.find((a) => a.code === typed);
    if (airport) {
      return { code: airport.code, label: `${airport.city} (${airport.code})`, wholeCity: false, airports: [airport.code] };
    }
    // A real code we do not carry — Duffel knows far more airports than this
    // list does, so pass it through rather than refusing it.
    return { code: typed, label: typed, wholeCity: false, airports: [typed] };
  }

  // The label the picker writes back, in case it was stored without its code —
  // by an older version of this box, or by somebody typing what they saw.
  const byLabel = Object.entries(METRO_AREAS).find(([, area]) => area.label.toLowerCase() === text.toLowerCase());
  if (byLabel) return metroEndpoint(byLabel[0]);

  // A city name. Prefer the whole area when that city has one, because that is
  // what somebody typing a city rather than an airport is asking for.
  // "London — all airports" reduces to "London" here.
  const lower = text.toLowerCase().replace(/\s*[—-]\s*all airports\s*$/i, "").trim();
  const named = AIRPORTS.filter(
    (a) => a.city.toLowerCase() === lower || a.aliases.includes(lower) || a.city.toLowerCase().includes(lower),
  );
  const metro = named.find((a) => a.cityCode)?.cityCode;
  if (metro) return metroEndpoint(metro);
  const single = named[0];
  if (single) return { code: single.code, label: `${single.city} (${single.code})`, wholeCity: false, airports: [single.code] };

  return null;
}

/**
 * The whole-city options a query should offer, above the airport list.
 *
 * Only where the city genuinely has more than one airport — offering
 * "Kraków — all airports" for a city with one would be noise.
 */
export function metroMatches(
  query: string,
  // The lists to search. Default to the built-in ones, so every existing
  // caller is unchanged; the airport picker passes the merged lists so groups
  // the owner added are offered too.
  airports: Airport[] = AIRPORTS,
  metros: Record<string, { label: string; country: string }> = METRO_AREAS,
): Array<{ code: string; label: string; airports: string[] }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const inGroup = (code: string) =>
    airports.filter((a) => a.cityCode?.toUpperCase() === code.toUpperCase()).map((a) => a.code);
  return Object.entries(metros)
    .filter(([code, area]) => {
      const inside = inGroup(code);
      // A group holding one airport is a duplicate row saying the same thing
      // twice, so it is never offered — see lib/airport-admin.ts.
      if (inside.length < 2) return false;
      return `${code} ${area.label} ${area.country} ${inside.join(" ")}`.toLowerCase().includes(q);
    })
    .map(([code, area]) => ({ code, label: area.label, airports: inGroup(code) }));
}
