/**
 * Which partner each search opens, and the address it opens on.
 *
 * WHY THIS MODULE EXISTS. The site used to have Kayak typed into it as a fact:
 * `SLOTS` said the flights and car searches open `www.kayak.com`, the URL was
 * built for Kayak, and the paste-a-link check on the earnings screen refused
 * anything that forwarded anywhere else. That was correct while Kayak was the
 * only plan. It stopped being correct the moment Travelpayouts approved the
 * account for Aviasales, Kiwi and EconomyBookings but NOT Kayak: the owner
 * held three programmes he could earn from and the site would have refused all
 * three, because a link forwarding to aviasales.com is not a kayak.com link.
 * Waiting for Kayak was never the constraint. The hard-coding was.
 *
 * So the partner is a setting. The owner picks it per search on
 * /admin/settings/earnings, pastes that programme's link, and the same screen
 * checks the two against each other. When Kayak does come through, it is
 * already in the list — a dropdown, not a deploy.
 *
 * TWO AXES, KEPT APART, which is the distinction lib/affiliate/partners.ts
 * already draws and this extends: the NETWORK (Travelpayouts) is who records
 * the referral and pays; the PARTNER here is where the traveller lands. Adding
 * a partner does not add a network.
 *
 * THE URL FORMATS ARE NOT GUESSED. Every one below is from Travelpayouts' own
 * documentation, cited at the builder. This matters more than it looks: a
 * wrong deep link does not throw. It opens the partner's front page instead of
 * the traveller's search, they shrug and search again by hand, and the referral
 * is lost with nothing anywhere reporting a fault. Where a partner's format is
 * not documented — EconomyBookings and dates — this module carries what is
 * documented and no more, rather than inventing a parameter that looks right.
 */

import type { SearchShape } from "@/lib/kayak-search";

/** The three searches that hand off to somebody else. */
export type SearchSlot = "flights" | "hotels" | "cars";

export type PartnerKey = "kayak" | "aviasales" | "kiwi" | "booking" | "economybookings" | "discovercars";

export type TravelPartner = {
  key: PartnerKey;
  label: string;
  /** Which search this partner can serve. */
  slot: SearchSlot;
  /**
   * The registered domain a pasted link must forward to.
   *
   * Matched on the domain rather than the exact host, because the link builder
   * and the search page do not always agree: an Aviasales search is built on
   * search.aviasales.com while a link generated for the programme may forward
   * to aviasales.com. Both are the same programme and the same money, and
   * refusing one of them would be a false alarm the owner cannot act on.
   */
  domain: string;
  /** What the owner needs to know when choosing it. Shown in the admin. */
  note: string;
};

export const TRAVEL_PARTNERS: readonly TravelPartner[] = [
  {
    key: "aviasales",
    label: "Aviasales",
    slot: "flights",
    domain: "aviasales.com",
    note: "Travelpayouts' own flight search. Carries the route, the dates and the passengers.",
  },
  {
    key: "kiwi",
    label: "Kiwi.com",
    slot: "flights",
    domain: "kiwi.com",
    note: "Strong on budget carriers. Some of its fares are self-transfer, which is a different product from an ordinary ticket.",
  },
  {
    key: "kayak",
    label: "Kayak",
    slot: "flights",
    domain: "kayak.com",
    note: "Opens Kayak with the route and both dates. Earns when a Stay22 (or Travelpayouts) wrap for Kayak is pasted on this row — the account is approved via Stay22.",
  },
  {
    key: "economybookings",
    label: "EconomyBookings",
    slot: "cars",
    domain: "economybookings.com",
    note: "Carries the pick-up city. Its link format has no dates, so the traveller chooses those on arrival.",
  },
  {
    key: "discovercars",
    label: "DiscoverCars",
    slot: "cars",
    domain: "discovercars.com",
    note: "Opens the city's own hire page where we have checked one exists, and their front page otherwise. No dates in the format, so the traveller picks those there. Usually pays better than EconomyBookings — worth comparing.",
  },
  {
    key: "kayak",
    label: "Kayak",
    slot: "cars",
    domain: "kayak.com",
    note: "Opens Kayak with the city and both dates. Earns when a Stay22 (or Travelpayouts) wrap for Kayak is pasted on this row.",
  },
  {
    key: "booking",
    label: "Booking.com",
    slot: "hotels",
    domain: "booking.com",
    note: "Only earns through Travelpayouts. Booking.com turned this site down for their own programme; hotels normally go through Stay22 instead.",
  },
] as const;

/** The partners that can serve one search. */
export function partnersFor(slot: SearchSlot): TravelPartner[] {
  return TRAVEL_PARTNERS.filter((p) => p.slot === slot);
}

/** Which partner is used when the owner has not chosen one. */
export const DEFAULT_PARTNERS: Record<SearchSlot, PartnerKey> = {
  // Kayak via Stay22 is the programme that works and can earn. Aviasales deep
  // links 302 to aviasales.ru and discard the search; EconomyBookings carries
  // no dates. The owner can still override at /admin/settings/earnings.
  flights: "kayak",
  cars: "kayak",
  hotels: "booking",
};

/** The owner's choice per search. Absent means the default above. */
export type PartnerChoices = Partial<Record<SearchSlot, PartnerKey>>;

export function isPartnerKey(value: unknown): value is PartnerKey {
  return typeof value === "string" && TRAVEL_PARTNERS.some((p) => p.key === value);
}

/**
 * The partner a search uses right now. Never null.
 *
 * A stored choice that is not valid for this slot — a key from an older
 * version, or hotels somehow set to Aviasales — falls back to the default
 * rather than throwing. A settings screen cannot be allowed to take the
 * searches down.
 */
export function partnerFor(slot: SearchSlot, choices: PartnerChoices | undefined): TravelPartner {
  const wanted = choices?.[slot];
  const match = wanted ? TRAVEL_PARTNERS.find((p) => p.slot === slot && p.key === wanted) : undefined;
  if (match) return match;
  const fallback = TRAVEL_PARTNERS.find((p) => p.slot === slot && p.key === DEFAULT_PARTNERS[slot]);
  // Non-null by construction: every slot has its default in the list above.
  return fallback ?? partnersFor(slot)[0]!;
}

/** Whether a host belongs to a partner's domain. */
export function hostBelongsTo(host: string, domain: string): boolean {
  const lower = host.trim().toLowerCase().replace(/^www\./, "");
  const want = domain.toLowerCase().replace(/^www\./, "");
  return lower === want || lower.endsWith(`.${want}`);
}

/* ---- the addresses ------------------------------------------------------- */

function iso(value: string | undefined): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function count(value: number | undefined, fallback: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 30) : fallback;
}

export type FlightQuery = {
  shape: SearchShape;
  adults?: number;
  children?: number;
};

export type CarQuery = {
  /** A city name, or an airport code. */
  where: string;
  pickup?: string;
  dropoff?: string;
};

/**
 * The flight search address for a partner, or null when it cannot express it.
 *
 * NULL IS A REAL ANSWER. Aviasales and Kiwi are given one journey; a
 * multi-city itinerary is a shape their documented link format does not
 * carry, and the honest response is to say so rather than quietly send
 * somebody the first leg of a five-leg trip. The caller renders the refusal.
 *
 * Sources, both Travelpayouts' own help centre:
 *   search.aviasales.com/flights/?origin_iata=&destination_iata=&depart_date=
 *     &return_date=&adults=&children=&infants=&one_way=
 *   https://support.travelpayouts.com/hc/en-us/articles/5711895629714
 *   https://support.travelpayouts.com/hc/en-us/articles/360007365071
 */
export function flightUrl(partner: TravelPartner, query: FlightQuery): string | null {
  const { shape } = query;
  if (shape.trip === "multi-city" && partner.key !== "kayak") return null;

  const leg = shape.legs[0];
  if (!leg) return null;
  const from = leg.from.trim().toUpperCase();
  const to = leg.to.trim().toUpperCase();
  const depart = iso(leg.date);
  if (!from || !to || !depart) return null;
  const back = shape.trip === "round-trip" ? iso(shape.ret) : "";
  const adults = count(query.adults, 1);
  const children = count(query.children, 0);

  if (partner.key === "aviasales") {
    const params = new URLSearchParams({
      origin_iata: from,
      destination_iata: to,
      depart_date: depart,
      adults: String(adults),
      one_way: back ? "false" : "true",
      locale: "en",
    });
    if (back) params.set("return_date", back);
    if (children) params.set("children", String(children));
    return `https://search.aviasales.com/flights/?${params.toString()}`;
  }

  if (partner.key === "kiwi") {
    // Kiwi's search path is /search/results/<from>/<to>/<depart>/<return>.
    // The leading slash is added after filtering — filtering a leading "" out
    // of the parts is how this produced "www.kiwi.comsearch/results".
    const path = `/${["search", "results", from, to, depart, back].filter((part) => part !== "").join("/")}`;
    const params = new URLSearchParams({ adults: String(adults) });
    if (children) params.set("children", String(children));
    return `https://www.kiwi.com${path}?${params.toString()}`;
  }

  // Kayak keeps its own builder, which handles multi-city and is already
  // tested. The caller passes it through rather than this module duplicating
  // it — see lib/kayak-search.ts.
  return null;
}

/**
 * The car-hire search address for a partner, or null.
 *
 * ECONOMYBOOKINGS CARRIES NO DATES, and that is documented rather than an
 * omission here: its deep-link format takes `idpick` (a city name) or
 * `idpickval` (an airport code) and nothing else this site holds. Inventing
 * `date_from` because every other partner has one would produce a link that
 * looks right, opens, and drops the dates in silence. The traveller picks them
 * on arrival, which the admin note says out loud so the owner is not surprised.
 */
/**
 * DiscoverCars' own address for a city, for the cities this site sends people to.
 *
 * EVERY ONE OF THESE WAS FETCHED AND ANSWERED 200. That is the point of the
 * table and the reason it is a table rather than a rule: their slugs cannot be
 * derived. Italy is `italy-mainland`, not `italy`. The Czech Republic is
 * `czech-republic`, and `czechia` is a 404. Kraków is `krakow` and `cracow` is
 * a 404. Grindelwald has no page at all, so it is absent rather than guessed.
 *
 * A wrong deep link does not throw. It 404s or lands on a front page, the
 * traveller shrugs and leaves, and the referral is lost in silence — which is
 * exactly why nothing here is inferred from the country name.
 *
 * Keyed by the city as this site writes it, normalised — lower case, accents
 * stripped, anything that is not a letter or digit removed — so "Kraków",
 * "Krakow" and "KRAKÓW" all find the same row.
 *
 * Checked against discovercars.com in August 2026. A slug that goes stale
 * costs the city page and nothing else: `carUrl` falls back to their front
 * page, which still earns.
 */
const DISCOVERCARS_PLACES: Readonly<Record<string, string>> = {
  rome: "italy-mainland/rome",
  venice: "italy-mainland/venice",
  florence: "italy-mainland/florence",
  merano: "italy-mainland/merano",
  canazei: "italy-mainland/canazei",
  bolzano: "italy-mainland/bolzano",
  paris: "france/paris",
  nice: "france/nice",
  chamonix: "france/chamonix",
  annecy: "france/annecy",
  grenoble: "france/grenoble",
  lyon: "france/lyon",
  london: "united-kingdom/london",
  amsterdam: "netherlands/amsterdam",
  prague: "czech-republic/prague",
  vienna: "austria/vienna",
  innsbruck: "austria/innsbruck",
  salzburg: "austria/salzburg",
  zellamsee: "austria/zell-am-see",
  budapest: "hungary/budapest",
  zurich: "switzerland/zurich",
  lucerne: "switzerland/lucerne",
  interlaken: "switzerland/interlaken",
  geneva: "switzerland/geneva",
  munich: "germany/munich",
  jerusalem: "israel/jerusalem",
  krakow: "poland/krakow",
};

/** The key a place is looked up by. Accents off, punctuation and spaces out. */
export function placeKey(where: string): string {
  return where
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function carUrl(partner: TravelPartner, query: CarQuery): string | null {
  const where = query.where.trim();
  if (!where) return null;

  if (partner.key === "economybookings") {
    const params = new URLSearchParams();
    // A bare three-letter code is an airport; anything else is a city name.
    if (/^[A-Za-z]{3}$/.test(where)) params.set("idpickval", where.toUpperCase());
    else params.set("idpick", where);
    return `https://www.economybookings.com/en?${params.toString()}`;
  }

  if (partner.key === "discovercars") {
    // The city's own hire page when we have checked one exists, and their front
    // page when we have not. Never a slug built from the country name: those
    // 404, and a 404 costs the traveller rather than the commission.
    const slug = DISCOVERCARS_PLACES[placeKey(where)];
    return slug ? `https://www.discovercars.com/${slug}` : "https://www.discovercars.com/";
  }

  if (partner.key === "kayak") {
    const pickup = iso(query.pickup);
    const dropoff = iso(query.dropoff);
    if (!pickup || !dropoff) return null;
    return `https://www.kayak.com/cars/${encodeURIComponent(where)}/${pickup}/${dropoff}`;
  }

  return null;
}
