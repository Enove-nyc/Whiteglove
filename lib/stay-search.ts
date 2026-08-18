/**
 * A search for somewhere to stay: reading it, writing it, and answering it.
 *
 * WHERE THE MONEY IS AND WHERE THE REASON IS. A hotel search on this site has
 * to do two different things at once. The commission is earned when somebody
 * leaves for a partner with a real date range in hand — that is /go, and it
 * needs the dates and the party size. But the reason anybody would search here
 * rather than on a comparison site is the other half: which quarter to be in,
 * what is walkable for Shabbos, and whether the kosher hotel in that town is a
 * place or a season.
 *
 * So a search lands on /hotels, which answers the second half out of what this
 * site already holds, and only then hands the first half to the partner with
 * everything typed already carried across. Nobody is sent off-site before they
 * have been told the thing they came for.
 *
 * THE PARAMETER NAMES ARE DELIBERATELY THE SAME AS /go's — destination, in,
 * out, adults, children, rooms. One vocabulary from the front-page form,
 * through this page, into the partner hand-off, so a search survives the whole
 * journey without anything being renamed in the middle and quietly dropped.
 *
 * WHAT THIS FILE WILL NOT DO: claim a match it does not have. A town nobody
 * here has written about returns nothing, and the page says so plainly rather
 * than showing the nearest thing it could find and letting somebody assume it
 * is an answer.
 */

import { normalize } from "@/lib/place-search";
import { vacationDestinations, type VacationDestination } from "@/data/vacation-destinations";

export type StaySearch = {
  /** What the visitor typed, kept as typed for the heading. */
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
};

/** No destination typed: the page is the directory rather than a result. */
export function isSearch(search: StaySearch): boolean {
  return search.destination.length > 0;
}

export const DEFAULT_STAY_SEARCH: StaySearch = {
  destination: "",
  checkIn: "",
  checkOut: "",
  adults: 2,
  children: 0,
  rooms: 1,
};

type RawParams = Record<string, string | string[] | undefined>;

function one(params: RawParams, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function date(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function count(value: string, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * Everything here is an outside input, including the links this site wrote
 * itself — a query string is the one part of a request anybody can edit.
 */
export function readStaySearch(params: RawParams): StaySearch {
  const checkIn = date(one(params, "in"));
  let checkOut = date(one(params, "out"));
  // A check-out before the check-in is not a short stay, it is a typo or a
  // hand-edited URL. Dropping it asks the question again rather than sending
  // somebody to a partner with a range that cannot be booked.
  if (checkIn && checkOut && checkOut <= checkIn) checkOut = "";
  return {
    destination: one(params, "destination").slice(0, 80),
    checkIn,
    checkOut,
    adults: count(one(params, "adults"), 2, 1, 30),
    children: count(one(params, "children"), 0, 0, 30),
    rooms: count(one(params, "rooms"), 1, 1, 10),
  };
}

/** The address for a search. The one place a /hotels link is written. */
export function staySearchHref(search: Partial<StaySearch>): string {
  const query = new URLSearchParams();
  const put = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === 0) return;
    query.set(key, String(value));
  };
  put("destination", search.destination);
  put("in", search.checkIn);
  put("out", search.checkOut);
  // The defaults are not worth carrying — "two adults, one room" in every
  // link on the site is noise in the address bar and in the click records.
  if (search.adults !== undefined && search.adults !== 2) put("adults", search.adults);
  put("children", search.children);
  if (search.rooms !== undefined && search.rooms !== 1) put("rooms", search.rooms);
  const suffix = query.toString();
  return suffix ? `/hotels?${suffix}` : "/hotels";
}

/** How many nights, when both dates are known. Used for the summary line. */
export function nights(search: StaySearch): number | null {
  if (!search.checkIn || !search.checkOut) return null;
  const from = Date.parse(`${search.checkIn}T00:00:00Z`);
  const to = Date.parse(`${search.checkOut}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  return Math.round((to - from) / 86_400_000);
}

/**
 * The cities a typed destination means.
 *
 * FOUR WAYS IN, IN ORDER OF CONFIDENCE. A destination record names its own
 * cities, so "Dolomites" and "Italian Lakes" resolve to the towns the site
 * actually holds records for — which is the case a plain text match on a city
 * name would miss entirely. Then a city by name, then a country. Anything else
 * resolves to nothing, and nothing is a real answer here.
 */
export function citiesFor(
  destination: string,
  /**
   * The merged destination list, when the caller has read it. Defaults to
   * the built-in list, so a caller outside a request still resolves the
   * twenty shipped destinations without touching the database.
   */
  known: readonly VacationDestination[] = vacationDestinations,
): { cities: string[]; label: string } | null {
  const query = normalize(destination);
  if (!query) return null;

  for (const record of known) {
    const names = [record.name, record.slug, record.region ?? ""].map(normalize).filter(Boolean);
    if (names.some((name) => name === query || (query.length >= 4 && name.includes(query)))) {
      return { cities: [...record.cities, ...(record.kosherBase?.cities ?? [])], label: record.name };
    }
  }

  const cities = new Set<string>();
  for (const record of known) {
    for (const city of record.cities) if (normalize(city) === query) cities.add(city);
  }
  if (cities.size > 0) return { cities: [...cities], label: destination };

  for (const record of known) {
    if (normalize(record.country) === query) for (const city of record.cities) cities.add(city);
  }
  if (cities.size > 0) return { cities: [...cities], label: destination };

  return null;
}

/**
 * Narrow a list of things that live in a city to the ones a search asked for.
 *
 * When the destination resolves to known cities, that list decides — an exact
 * membership test rather than a substring, so "Lake Como" does not also return
 * Como's neighbours by accident. When it does not resolve, the typed text is
 * matched against the city and the country, which is how somebody who typed a
 * town this site holds a stay in but no destination record for still finds it.
 */
export function inDestination<T extends { city: string; country: string }>(
  items: readonly T[],
  destination: string,
): T[] {
  const query = normalize(destination);
  if (!query) return [...items];
  const resolved = citiesFor(destination);
  if (resolved) {
    const wanted = new Set(resolved.cities.map(normalize));
    return items.filter((item) => wanted.has(normalize(item.city)));
  }
  return items.filter(
    (item) => normalize(item.city).includes(query) || normalize(item.country) === query,
  );
}
