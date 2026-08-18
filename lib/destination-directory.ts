/**
 * One directory, both kinds of destination.
 *
 * WHAT WAS WRONG. The site had two lists of places to go and told a visitor
 * they were one thing. /destinations showed twenty-one holiday destinations;
 * the hundred-odd heritage towns — Lizhensk, Uman, Belz — were reachable by
 * search and from /heritage and appeared in the directory not at all. The
 * navigation says Destinations, the writing says heritage places are part of
 * the normal destination directory, and the page behind that word held only
 * half of them.
 *
 * THEY ARE THE SAME CATEGORY. A town you go to for the kevarim and a city you
 * go to for a week are both answers to "where should we go", and splitting
 * them by which file they happen to live in is a fact about this codebase
 * rather than about travelling.
 *
 * WHAT A HERITAGE CARD MAY SAY. Only what is true of it. The holiday
 * destinations carry editorial — why go, who it suits, an outline of the days
 * — and a heritage town has none of that written for it; inventing a sentence
 * so the cards match would be the site claiming something nobody wrote. So a
 * heritage card carries its name, its country, its own one-line summary when
 * there is one, and how many kevarim are on record. Nothing else, and no
 * signals it has not been assessed for.
 *
 * ONLY THE ONES WITH SOMETHING ON THEM. Seventy-three of the towns are records
 * with no kever, no listing and no sentence yet — they are already noindexed
 * and kept out of the sitemap for exactly that reason (lib/site-map.ts), and
 * putting them in the directory would undo that decision from the other end.
 * The same condition is asked here, so the two can never disagree.
 */

import { getDestinationRecord } from "@/data/destination-database";
import { destinations as heritageDestinations } from "@/data/destinations";
import { heritageTownHref } from "@/lib/route-migration";

export type HeritageCardModel = {
  slug: string;
  name: string;
  /** The Yiddish name, shown under the English one where the card has room. */
  yiddishName: string;
  country: string;
  href: string;
  /** How many kevarim are on record here. The only count that is true of it. */
  kevarim: number;
  /** Its own line, when somebody has written one. Never invented. */
  summary?: string;
};

/** True when a town has anything on it at all — the sitemap's test, asked once. */
export function heritageTownHasContent(slug: string, summary?: string): boolean {
  return Boolean(getDestinationRecord(slug)?.cemeteries.length) || Boolean(summary);
}

/**
 * Every heritage town worth putting in front of somebody, as a card.
 *
 * Guides first, the same order data/destinations.ts holds them in: a town
 * somebody has written a guide for is a better answer than a town with one
 * line, and the list is not sorted here so the hub can sort it with the rest.
 */
export function heritageCards(): HeritageCardModel[] {
  return heritageDestinations
    .filter((town) => heritageTownHasContent(town.slug, town.summary))
    .map((town) => ({
      slug: town.slug,
      name: town.city,
      yiddishName: town.yiddishCity,
      country: town.country,
      href: heritageTownHref(town.slug),
      kevarim: getDestinationRecord(town.slug)?.cemeteries.length ?? 0,
      summary: town.summary,
    }));
}
