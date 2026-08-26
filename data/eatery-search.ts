/**
 * Searching the kosher listings, on the SERVER.
 *
 * WHY THIS EXISTS. /kosher filtered in the browser, which meant every one of
 * the 1,466 listings had to be sent to it — the whole record, notes and
 * summaries included — so that a visitor could type "Antwerp" and see four.
 * That was a megabyte of data for a page that draws sixty cards, downloaded
 * by somebody on hotel wifi who wanted one restaurant.
 *
 * So the matching happens here, on the server, and only the listings actually
 * shown are sent. The fields that exist ONLY to be searched — the summary, the
 * notes, the quarter — never leave the server at all now.
 *
 * THE MATCHER IS THE SAME ONE. lib/list-search.ts, which every other public
 * list on this site uses, so a query gives the same answer as it always did
 * and as it does everywhere else. Moving a search to the server is not an
 * excuse to change what it finds.
 */

import { listMatches, listRank } from "@/lib/list-search";
import { extraSpellings } from "@/lib/place-search";
import type { KosherEatery } from "@/data/kosher-eateries";

/**
 * A listing as the page draws it — and nothing more.
 *
 * Deliberately not KosherEatery. The card shows these fields; summary, notes,
 * nearQuarter and sourceUrl are searched or used elsewhere and have no reason
 * to travel. Keeping the two types apart is what stops the payload quietly
 * growing back when a field is added to the record.
 */
export type EateryCard = {
  slug: string;
  name: string;
  city: string;
  country: string;
  kind: string;
  diet?: string;
  address?: string;
  coordinates?: string;
  website?: string;
  phone?: string;
  hechsher: KosherEatery["hechsher"];
};

export function toCard(e: KosherEatery): EateryCard {
  return {
    slug: e.slug,
    name: e.name,
    city: e.city,
    country: e.country,
    kind: e.kind,
    ...(e.diet ? { diet: e.diet } : {}),
    ...(e.address ? { address: e.address } : {}),
    ...(e.coordinates ? { coordinates: e.coordinates } : {}),
    ...(e.website ? { website: e.website } : {}),
    ...(e.phone ? { phone: e.phone } : {}),
    hechsher: e.hechsher,
  };
}

/**
 * Everything about a listing that a query is matched against.
 *
 * Unchanged from what the browser used to join together, down to the order:
 * somebody types "Villeurbanne" or "Wien" or "badatz", and all three live in
 * the notes rather than the name.
 */
function haystack(e: KosherEatery): string {
  return [
    e.name,
    e.city,
    e.country,
    e.kind,
    e.diet,
    e.summary,
    (e.notes ?? []).join(" "),
    e.nearQuarter ?? "",
    extraSpellings([e.slug, e.city]),
  ].join(" ");
}

export type EateryQuery = {
  query?: string;
  country?: string;
  kind?: string;
  /** How many to skip — the Show more offset. */
  offset?: number;
  /** How many to return. */
  limit?: number;
};

export type EateryResults = {
  rows: EateryCard[];
  /** Whether anything follows these, so the page knows to offer Show more. */
  more: boolean;
};

/** The largest page anyone can ask for, so a crafted limit cannot pull the lot. */
export const MAX_PAGE = 120;

export function searchEateries(all: readonly KosherEatery[], q: EateryQuery): EateryResults {
  const query = (q.query ?? "").trim();
  const country = q.country ?? "";
  const kind = q.kind ?? "";
  const offset = Math.max(0, Math.trunc(q.offset ?? 0));
  const limit = Math.min(Math.max(1, Math.trunc(q.limit ?? 60)), MAX_PAGE);

  const matched = all
    .filter((e) => (!country || e.country === country) && (!kind || e.kind === kind) && listMatches(haystack(e), query))
    .sort((a, b) => listRank(query, a.city, a.name) - listRank(query, b.city, b.name));

  return {
    rows: matched.slice(offset, offset + limit).map(toCard),
    more: matched.length > offset + limit,
  };
}

/** The country and kind options, which the page needs whole rather than paged. */
export function eateryFacets(all: readonly KosherEatery[]): { countries: string[]; kinds: string[] } {
  return {
    countries: [...new Set(all.map((e) => e.country))].sort(),
    kinds: [...new Set(all.map((e) => e.kind))].sort(),
  };
}
