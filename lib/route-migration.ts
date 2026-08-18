/**
 * Two things called "destinations", and only one of them can have the address.
 *
 * WHAT THE COLLISION WAS. `/destinations/[place]` was the heritage TOWN route —
 * a town with kevarim in it, no researched guide, reached from the cemetery
 * records. Meanwhile the primary navigation needed an item called
 * "Destinations" meaning places to go on holiday, and pointing it at a
 * directory of towns with graves in them is the exact mistake the whole
 * repositioning was about.
 *
 * The owner's decision was to move heritage rather than to name the vacation
 * hub something else. So:
 *
 *   /destinations            the vacation hub        (was /vacation-ideas)
 *   /destinations/rome       a vacation destination  (was /vacation-ideas/rome)
 *   /heritage/towns/warsaw   a heritage town         (was /destinations/warsaw)
 *
 * ONLY THE TOWNS WITHOUT A RESEARCHED GUIDE ARE AFFECTED. A town with a guide
 * — Uman, Lizhensk, Belz — has always lived at the root, `/uman`, and still
 * does; `destinationHref()` in data/destinations.ts picks between the two and
 * is the only place that decides. So this rename touches a hundred and nine
 * addresses, not the whole heritage section.
 *
 * WHY THE HERITAGE REDIRECT CANNOT BE ONE WILDCARD. `/destinations/:slug` now
 * serves two different kinds of page depending on the slug: eighteen of them
 * are vacation destinations and a hundred and nine were heritage towns. A
 * blanket rule sending `/destinations/:slug` to `/heritage/towns/:slug` would
 * swallow every vacation page on the site. So the redirect is decided per slug,
 * from the two lists, and this module is where that decision lives so it can be
 * tested rather than trusted.
 *
 * THE ONE SLUG IN BOTH LISTS IS `prague`. It is a heritage town and a vacation
 * destination, and the address can only serve one of them. The vacation page
 * wins — that is what the navigation now means by the word — and the heritage
 * town is still at /heritage/towns/prague, linked from the vacation page. No
 * URL 404s either way; one of them changes what it shows, which is the honest
 * cost of the rename and is worth recording here rather than discovering later.
 *
 * Pure, and takes both lists as arguments, so the middleware, the sitemap and
 * the tests all read the same rule.
 */

import { bulkDestinations } from "@/data/destinations-bulk";
import { vacationDestinations } from "@/data/vacation-destinations";

export const HERITAGE_TOWNS_PREFIX = "/heritage/towns";
export const VACATION_HUB = "/destinations";

/** Where a heritage town page lives now. */
export function heritageTownHref(slug: string): string {
  return `${HERITAGE_TOWNS_PREFIX}/${slug}`;
}

/** Where a vacation destination page lives now. */
export function vacationDestinationHref(slug: string): string {
  return `${VACATION_HUB}/${slug}`;
}

function firstSegment(pathname: string): { head: string; rest: string } {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const parts = clean.split("/").filter(Boolean);
  return { head: `/${parts[0] ?? ""}`, rest: parts.slice(1).join("/") };
}

/**
 * The two lists, read from the data files.
 *
 * Held here rather than passed in by the middleware because the middleware
 * runs on the edge and cannot reach the database.
 *
 * DELIBERATELY THE BUILT-IN LIST, not the merged one from
 * lib/vacation-destinations-view.ts. This map exists to send an address that
 * USED to be served elsewhere to where it lives now — it is a record of the
 * site's own past. A destination the owner adds in the admin has no past
 * address to redirect, so its absence here is correct rather than a gap, and
 * the edge could not read it anyway.
 */
export const MIGRATION_LISTS: MigrationLists = {
  vacationSlugs: vacationDestinations.map((destination) => destination.slug),
  heritageTownSlugs: bulkDestinations.map((destination) => destination.slug),
};

export type MigrationLists = {
  /** Slugs served by the vacation destination page. These keep /destinations/. */
  vacationSlugs: readonly string[];
  /** Slugs that used to be served by /destinations/[place]. */
  heritageTownSlugs: readonly string[];
};

/**
 * The address a request should be sent to permanently, or null to leave it be.
 *
 * Deliberately conservative: anything it is not certain about is left alone and
 * handled by the ordinary routing, because a wrong redirect is worse than a
 * 404 — it sends somebody somewhere confidently and they never find out what
 * they were looking for.
 */
export function movedTo(pathname: string, lists: MigrationLists): string | null {
  const { head, rest } = firstSegment(pathname);

  // The hub and its destinations, renamed wholesale.
  if (head === "/vacation-ideas") {
    return rest ? `${VACATION_HUB}/${rest}` : VACATION_HUB;
  }

  // A heritage town that used to sit under /destinations. Decided per slug,
  // and never for a slug the vacation pages now serve.
  if (head === VACATION_HUB && rest && !rest.includes("/")) {
    if (lists.vacationSlugs.includes(rest)) return null;
    if (lists.heritageTownSlugs.includes(rest)) return heritageTownHref(rest);
  }

  return null;
}

/**
 * Slugs whose old address now shows something else entirely.
 *
 * Not a redirect and not a bug — a consequence of the rename that somebody
 * should be able to look up rather than deduce. Today this is `prague` and
 * nothing else.
 */
export function contestedSlugs(lists: MigrationLists): string[] {
  return lists.heritageTownSlugs.filter((slug) => lists.vacationSlugs.includes(slug)).sort();
}
