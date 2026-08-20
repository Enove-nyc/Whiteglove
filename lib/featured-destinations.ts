/**
 * What the front page's "Featured" row shows, and why it never says why.
 *
 * CHOSEN BY USE, NOT BY HAND. The row is built from the destinations people
 * actually opened over the trailing week (lib/site-analytics.ts keeps one day
 * bucket per day for exactly this), so it stays honest as the site is used
 * rather than being six places somebody picked once. The heading is just
 * "Featured": the visitor is never told "trending" or "most searched",
 * because the selection mechanism is the site's business and a popularity
 * claim on a young site is a number in disguise.
 *
 * WHY THERE IS A FALLBACK AT ALL. A new site — or a week with no redis —
 * has thin search data, and a Featured row with one card in it announces the
 * traffic. When fewer than a full row's worth of destinations have been
 * searched, the balance comes from FEATURED_FALLBACK, in its written order,
 * and the two halves are indistinguishable on the page.
 *
 * UNKNOWN SLUGS ARE DROPPED, not rendered hopefully. Analytics outlive a
 * renamed or retired destination; joining back against the published list
 * means a stale slug in redis costs a row in a zset and never a dead card.
 *
 * The choosing is pure and takes its data as arguments — the same shape as
 * lib/vacation-ideas.ts — so the tests exercise the merge without a redis,
 * and the IO stays at the one async edge.
 */

import { vacationDestinations, type VacationDestination } from "@/data/vacation-destinations";
import { topSearchedDestinations } from "@/lib/site-analytics";
import { destinationHref } from "@/lib/vacation-ideas";
import type { VacationDestinationItem } from "@/lib/vacation-destinations-view";

/**
 * The row a stranger sees before anybody has searched anything.
 *
 * Six, for variety of trip rather than of continent alone: four cities with
 * strong kosher answers, a beach, and mountains. Every slug must exist in
 * data/vacation-destinations.ts — the test says so, because a typo here
 * shows as a shorter row rather than an error.
 */
export const FEATURED_FALLBACK: readonly string[] = [
  "rome",
  "paris",
  "jerusalem",
  "london",
  "miami-beach",
  "jungfrau-region",
];

export type FeaturedDestination<T extends VacationDestination = VacationDestination> = {
  destination: T;
  /** Where the whole card goes — the destination's own page. */
  href: string;
};

/**
 * The pure core: searched slugs first in searched order, unknowns dropped,
 * duplicates kept once, topped up from the fallback to the limit.
 */
export function pickFeatured<T extends VacationDestination = VacationDestination>(
  searchedSlugs: readonly string[],
  options?: {
    limit?: number;
    destinations?: readonly T[];
    fallback?: readonly string[];
  },
): FeaturedDestination<T>[] {
  const { limit = 6, destinations = vacationDestinations as readonly T[], fallback = FEATURED_FALLBACK } = options ?? {};
  const bySlug = new Map(destinations.map((destination) => [destination.slug, destination]));
  const chosen: T[] = [];
  const seen = new Set<string>();
  for (const slug of [...searchedSlugs, ...fallback]) {
    if (chosen.length >= limit) break;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const destination = bySlug.get(slug);
    if (destination) chosen.push(destination);
  }
  return chosen.map((destination) => ({ destination, href: destinationHref(destination) }));
}

/**
 * The IO edge the front page calls.
 *
 * Fails safe in both directions: no redis configured reads as an empty week
 * (pure fallback), and a redis that throws is caught here rather than taking
 * the front page down with it.
 */
export async function featuredDestinations(limit = 6): Promise<FeaturedDestination<VacationDestinationItem>[]> {
  let searched: string[] = [];
  try {
    searched = await topSearchedDestinations(7);
  } catch {
    searched = [];
  }
  // Read through the view so a destination the owner added can be featured,
  // and one they hid stops being. pickFeatured stays pure and takes the list.
  const { getVacationDestinations } = await import("@/lib/vacation-destinations-view");
  return pickFeatured(searched, { limit, destinations: await getVacationDestinations() });
}
