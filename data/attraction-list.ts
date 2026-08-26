/**
 * Searching the things-to-do directory, on the SERVER.
 *
 * TWO PROBLEMS, ONE CAUSE. The page held all 781 attractions in the browser to
 * filter them there, and drew 24 of them — so it was the heaviest page on the
 * site (183KB compressed) while showing three per cent of what it carried.
 *
 * And a link to any of the other 757 landed nowhere. /stops and the itinerary
 * planner link straight to /things-to-do#slug, the entry's own anchor, and
 * that anchor only exists if the entry happens to be among the drawn 24:
 * /things-to-do#polin-museum drew the usual 24 cards, no POLIN Museum, and no
 * scroll. The comment above the Show more button says numbered pages would
 * break those links — which was right, and they were already broken.
 *
 * So the search runs here, only what is drawn is sent, and `slug` fetches the
 * one entry an anchor asks for however deep in the list it sits.
 *
 * THE MATCHER IS THE SAME ONE every other list on this site uses
 * (lib/list-search.ts), so a query finds what it always found.
 */

import { listMatches, listRank } from "@/lib/list-search";
import { extraSpellings } from "@/lib/place-search";
import type { Attraction } from "@/data/attractions";

/**
 * An attraction as the card draws it.
 *
 * Nearly the whole record, because this card genuinely shows nearly all of it
 * — summary and notes included. Only sourceUrl stays behind. The saving here
 * is not narrower records but FEWER of them: 24 instead of 781.
 */
export type AttractionCard = Omit<Attraction, "sourceUrl">;

export function toAttractionCard(a: Attraction): AttractionCard {
  // Named rather than destructured-and-discarded: the lint rule is right that
  // an unused binding is usually a mistake, and spelling out what is being
  // left behind is clearer here than silencing it.
  const card: AttractionCard = {
    slug: a.slug,
    name: a.name,
    city: a.city,
    country: a.country,
    kind: a.kind,
    summary: a.summary,
    ...(a.address ? { address: a.address } : {}),
    ...(a.coordinates ? { coordinates: a.coordinates } : {}),
    ...(a.website ? { website: a.website } : {}),
    ...(a.internalHref ? { internalHref: a.internalHref } : {}),
    ...(a.notes ? { notes: a.notes } : {}),
  };
  return card;
}

/** Everything a query is matched against — unchanged from the browser's version. */
function haystack(a: Attraction): string {
  return [a.name, a.city, a.country, a.kind, a.summary, (a.notes ?? []).join(" "), extraSpellings([a.slug, a.city])].join(" ");
}

export type AttractionQuery = {
  query?: string;
  country?: string;
  kind?: string;
  city?: string;
  offset?: number;
  limit?: number;
};

export type AttractionResults = {
  rows: AttractionCard[];
  more: boolean;
};

/** The largest page anyone can ask for, so a crafted limit cannot pull the lot. */
export const MAX_PAGE = 96;
/** What the page draws before it stops and asks. */
export const PAGE = 24;

export function searchAttractionList(all: readonly Attraction[], q: AttractionQuery): AttractionResults {
  const query = (q.query ?? "").trim();
  const country = q.country ?? "";
  const kind = q.kind ?? "";
  const city = q.city ?? "";
  const offset = Math.max(0, Math.trunc(q.offset ?? 0));
  const limit = Math.min(Math.max(1, Math.trunc(q.limit ?? PAGE)), MAX_PAGE);

  const matched = all
    .filter(
      (a) =>
        (!country || a.country === country) &&
        (!kind || a.kind === kind) &&
        (!city || a.city === city) &&
        listMatches(haystack(a), query),
    )
    .sort((a, b) => listRank(query, a.city, a.name) - listRank(query, b.city, b.name));

  return {
    rows: matched.slice(offset, offset + limit).map(toAttractionCard),
    more: matched.length > offset + limit,
  };
}

/**
 * One entry by its slug, for an anchor.
 *
 * A fragment never reaches the server — /things-to-do#polin-museum arrives as
 * /things-to-do — so the page has to ask for it once it is running. This is
 * what it asks.
 */
export function attractionBySlug(all: readonly Attraction[], slug: string): AttractionCard | null {
  const found = all.find((a) => a.slug === slug);
  return found ? toAttractionCard(found) : null;
}

/**
 * The filter options, whole.
 *
 * Cities come grouped by country because the select narrows to the chosen
 * country — this page runs to several hundred entries across a dozen
 * countries, and a flat list of every city is not a filter anybody uses. It is
 * only strings, so sending all of them costs a fraction of what one attraction
 * record did.
 */
export type AttractionFacets = {
  countries: string[];
  kinds: string[];
  citiesByCountry: Record<string, string[]>;
  cities: string[];
};

export function attractionFacets(all: readonly Attraction[]): AttractionFacets {
  const citiesByCountry: Record<string, string[]> = {};
  for (const a of all) {
    const list = (citiesByCountry[a.country] ??= []);
    if (!list.includes(a.city)) list.push(a.city);
  }
  for (const list of Object.values(citiesByCountry)) list.sort();
  return {
    countries: [...new Set(all.map((a) => a.country))].sort(),
    kinds: [...new Set(all.map((a) => a.kind))].sort(),
    citiesByCountry,
    cities: [...new Set(all.map((a) => a.city))].sort(),
  };
}
