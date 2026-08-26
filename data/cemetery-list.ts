/**
 * Choosing what the batei hachaim directory shows, on the SERVER.
 *
 * WHY THIS EXISTS. The page shipped both sets to the browser so the browser
 * could search and merge them: 242 curated guides with every name buried in
 * each, and 1,952 location-only grounds from Nesiya Tova — 576KB of JSON, to
 * draw a grid of cards that show a town and a country.
 *
 * The whole selection moved here: the filtering, the four orders, the rule
 * that keeps the located set out of the default view, and the town matching
 * that stops a guide and a located ground appearing as the same place twice.
 * All of it was in the component and none of it changed — this is the same
 * logic, on the other side of the wire, so the page shows what it always
 * showed.
 *
 * WHAT THE BROWSER STOPS RECEIVING. The names of everybody buried in each
 * ground, and the counts. Both are searched and sorted on — "the Chozeh"
 * finds Lublin, "most kevarim first" needs the number — and neither is drawn
 * on a card. They stay here.
 */

import { listMatches } from "@/lib/list-search";
import { extraSpellings } from "@/lib/place-search";
import type { CemeteryListItem } from "@/lib/cemeteries-view";

export type Order = "city" | "country" | "tzaddik" | "kevarim";

/** A Nesiya Tova located ground — a place with a source, not a full guide. */
export type HeritageEntry = { slug: string; city: string; country: string; address?: string };

/**
 * A row as the grid draws it, and nothing more.
 *
 * A guide card shows four strings; the burials and the count that decide where
 * it SORTS are not among them.
 */
export type CemeteryRow =
  | { kind: "guide"; slug: string; name: string; yiddishName: string; city: string; country: string }
  | { kind: "located"; slug: string; city: string; country: string; address?: string };

export type CemeteryQuery = {
  query?: string;
  country?: string;
  order?: Order;
  offset?: number;
  limit?: number;
};

export type CemeteryResults = {
  rows: CemeteryRow[];
  more: boolean;
  /**
   * Whether a town or a country has narrowed the list — which is what lets the
   * located set in. The page says something different in each case, so it is
   * told rather than left to work it out from the rows.
   */
  narrowed: boolean;
};

/** What the page draws before it stops and asks. */
export const PAGE = 48;
/** The largest page anyone can ask for, so a crafted limit cannot pull the lot. */
export const MAX_PAGE = 144;

/**
 * A town name reduced to what two records have to agree on to be the same
 * town: no diacritics, no alias in brackets, no punctuation. "Aleksandrów
 * Łódzki (Aleksander)" and "Aleksandrów Łódzki" are one place.
 */
export function townKey(city: string, country: string): string {
  const flatten = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\(.*?\)/g, "")
      .toLowerCase()
      .replace(/[^a-z ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return `${flatten(city)}|${flatten(country)}`;
}

const ORDERS: Record<Order, (a: CemeteryListItem, b: CemeteryListItem) => number> = {
  city: (a, b) => a.city.localeCompare(b.city),
  country: (a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city),
  // The name people actually come for. A ground with nobody named yet sorts
  // last rather than first, so the list opens with the ones that have
  // something to show.
  tzaddik: (a, b) => (a.burials[0] ?? "￿").localeCompare(b.burials[0] ?? "￿"),
  kevarim: (a, b) => b.burialCount - a.burialCount || a.city.localeCompare(b.city),
};

export function isOrder(value: string): value is Order {
  return value === "city" || value === "country" || value === "tzaddik" || value === "kevarim";
}

export function searchCemeteryList(
  sets: { guides: readonly CemeteryListItem[]; heritage: readonly HeritageEntry[] },
  q: CemeteryQuery,
): CemeteryResults {
  const query = (q.query ?? "").trim();
  const country = q.country ?? "";
  const order: Order = q.order && isOrder(q.order) ? q.order : "city";
  const offset = Math.max(0, Math.trunc(q.offset ?? 0));
  const limit = Math.min(Math.max(1, Math.trunc(q.limit ?? PAGE)), MAX_PAGE);

  const guides = sets.guides
    .filter(
      (c) =>
        (!country || c.country === country) &&
        // The same alternate spellings the /stops search has always used. A
        // kever town is written a dozen ways: "Lezajsk" and "Leżajsk" have to
        // find what "Lizhensk" finds.
        listMatches(
          [c.city, c.yiddishCity, c.name, c.yiddishName, c.country, ...c.burials, extraSpellings([c.slug, c.city])].join(" "),
          query,
        ),
    )
    .sort(ORDERS[order]);

  // The located set joins in only once the list is narrowed — otherwise nearly
  // two thousand location-only entries would swamp the guides on first sight.
  const narrowed = Boolean(country || query.trim());
  // A located ground in a town White Glove has its own guide for is dropped:
  // the guide is the same place said properly, and listing the town again
  // underneath it as a bare "Location" was a doubling this page used to show.
  const guideTowns = new Set(sets.guides.map((c) => townKey(c.city, c.country)));
  const located = !narrowed
    ? []
    : sets.heritage
        .filter((h) => (!country || h.country === country) && listMatches([h.city, h.country, extraSpellings([h.slug, h.city])].join(" "), query))
        .filter((h) => !guideTowns.has(townKey(h.city, h.country)))
        .sort((a, b) =>
          order === "country" ? a.country.localeCompare(b.country) || a.city.localeCompare(b.city) : a.city.localeCompare(b.city),
        );

  // ONE list, not two. Ordering by town or country interleaves the two sets by
  // that key; the guide-only orders (by tzaddik, most kevarim) keep the guides
  // in that order and let the located grounds — which have neither — follow.
  const guideRows: CemeteryRow[] = guides.map((c) => ({
    kind: "guide",
    slug: c.slug,
    name: c.name,
    yiddishName: c.yiddishName,
    city: c.city,
    country: c.country,
  }));
  const locatedRows: CemeteryRow[] = located.map((h) => ({
    kind: "located",
    slug: h.slug,
    city: h.city,
    country: h.country,
    ...(h.address ? { address: h.address } : {}),
  }));

  let merged = [...guideRows, ...locatedRows];
  if (order === "city") merged = merged.sort((a, b) => a.city.localeCompare(b.city));
  if (order === "country") merged = merged.sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city));

  return {
    rows: merged.slice(offset, offset + limit),
    more: merged.length > offset + limit,
    narrowed,
  };
}

/** Every country either set knows, so the one dropdown reaches all of them. */
export function cemeteryCountries(sets: {
  guides: readonly CemeteryListItem[];
  heritage: readonly HeritageEntry[];
}): string[] {
  return [...new Set([...sets.guides.map((c) => c.country), ...sets.heritage.map((h) => h.country)])].sort((a, b) =>
    a.localeCompare(b),
  );
}
