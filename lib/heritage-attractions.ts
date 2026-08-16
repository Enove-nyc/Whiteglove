/**
 * Heritage towns, shaped as attractions — the "Jewish heritage" filter on
 * /things-to-do, not a separate section of their own.
 *
 * CORRECTS AN EARLIER READING of the same instruction. Heritage was first
 * given its own "Heritage journeys" block on /destinations, grouped by
 * country. The owner's actual intent was narrower and reused something that
 * already existed: AttractionKind already has a "Jewish heritage" value —
 * 35 attractions in data/attractions.ts already carry it — so heritage towns
 * belong in that same filterable list, not a new section beside it.
 *
 * ONLY GUIDED DESTINATIONS, not all 123. A stub town (data/destinations-bulk.ts)
 * has a name and a country and nothing checked yet — no source. Every other
 * public listing on this site (mikvaos, shuls, the attractions themselves)
 * refuses to publish without a real source behind it; this does the same
 * rather than becoming the one exception.
 *
 * TOWN COORDINATES, NEVER THE GRAVE'S. lib/attractions-view.ts is explicit
 * that an attraction's coordinates are "public landmarks... safe to navigate
 * to" — the opposite of the rule for a kever. CityGuide keeps the two
 * separate for exactly this reason; this reads townCoordinates only.
 */

import { destinationHref, guidedDestinations } from "@/data/destinations";
import type { Attraction } from "@/data/attractions";

export function heritageAsAttractions(): Attraction[] {
  return guidedDestinations()
    .filter((destination) => Boolean(destination.guide.sourceUrl))
    .map((destination): Attraction => {
      const guide = destination.guide;
      return {
        slug: `heritage-${destination.slug}`,
        name: `${guide.city} — ${guide.tzaddik}`,
        city: guide.city,
        country: guide.country,
        kind: "Jewish heritage",
        summary: guide.overview,
        coordinates: guide.townCoordinates,
        notes: [`Kever of ${guide.tzaddik}.`],
        sourceUrl: guide.sourceUrl,
        internalHref: destinationHref(destination),
      };
    });
}
