// The destination database.
//
// One list, one type, one place to look — the same arrangement as the cemetery
// database next door. Destinations arrive at two levels of completeness and
// that difference is a field on the record, not a separate database:
//
//   • a researched guide (tzaddik, yahrzeit, grave location, access contacts)
//     lives in data/destinations-detailed.ts;
//   • a place still being checked is one compact row in
//     data/destinations-bulk.ts.
//
// Both are storage formats for the same thing. Everything on the site reads
// this module, so a place can be promoted from a stub to a full guide by
// moving one record, and nothing that links to it has to change.

import { bulkDestinations } from "@/data/destinations-bulk";
import { cityGuides, type CityGuide } from "@/data/destinations-detailed";

export type Destination = {
  slug: string;
  city: string;
  yiddishCity: string;
  country: string;
  aliases: string[];
  /** One line about the place, when there is one. */
  summary?: string;
  /**
   * The researched guide, when we have one. Its absence is what "still being
   * checked" means — there is no second list of unfinished places.
   */
  guide?: CityGuide;
};

const detailed: Destination[] = cityGuides.map((guide) => ({
  slug: guide.slug,
  city: guide.city,
  yiddishCity: guide.yiddishCity,
  country: guide.country,
  aliases: guide.aliases ?? [],
  summary: guide.overview,
  guide,
}));

const stubs: Destination[] = bulkDestinations.map((d) => ({
  slug: d.slug,
  city: d.city,
  yiddishCity: d.yiddishCity,
  country: d.country,
  aliases: d.aliases,
  summary: d.summary,
}));

/** Every destination the site knows about, guides first. */
export const destinations: Destination[] = [...detailed, ...stubs];

export function getDestination(slug: string): Destination | undefined {
  return destinations.find((d) => d.slug === slug);
}

/** A destination we have finished researching — `guide` is always present. */
export type GuidedDestination = Destination & { guide: CityGuide };

/** Destinations with a researched guide behind them. */
export function guidedDestinations(): GuidedDestination[] {
  return destinations.filter((d): d is GuidedDestination => Boolean(d.guide));
}

/** Destinations whose details are still being checked. */
export function unguidedDestinations(): Destination[] {
  return destinations.filter((d) => !d.guide);
}

/**
 * Where a destination lives. Guides have had their own top-level address since
 * before there was a directory, and people have those links saved, so the
 * shape of the URL follows the record rather than the other way round.
 */
export function destinationHref(destination: Destination): string {
  return destination.guide ? `/${destination.slug}` : `/destinations/${destination.slug}`;
}

/**
 * Everything a search should look at for one destination: names, country, the
 * tzaddik and their seforim. Deliberately NOT the overview paragraph — matching
 * against prose turns every common word into a hit and buries the real answer.
 */
export function destinationHaystack(destination: Destination): string {
  const g = destination.guide;
  return [
    destination.city,
    destination.yiddishCity,
    destination.country,
    destination.aliases.join(" "),
    g?.tzaddik,
    g?.yiddishTzaddik,
    g?.seforim,
  ]
    .filter(Boolean)
    .join(" ");
}

export type { CityGuide };
