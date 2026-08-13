// What else is within reach of a kever, worked out from the coordinates the
// listings already carry.
//
// Almost nobody flies to Poland or Ukraine for one kever, and until now a town
// guide was a dead end about that: it named the tzaddik, and the only way to
// discover that Sokołów Małopolski is thirty kilometres from Leżajsk was to
// already know. The listings hold coordinates for most of the ground, so the
// answer is derivable rather than something anybody has to write town by town.
//
// STRAIGHT-LINE, NOT DRIVING. Every distance here is as the crow flies, and
// the pages that print it say so — a road distance dressed up as fact is how
// somebody plans a morning around a drive that takes twice as long.

import { cemeteries, type Cemetery } from "@/data/cemeteries";
import { coordinatesToPoint } from "@/data/route-utils";

export type NearbyKever = {
  slug: string;
  city: string;
  name: string;
  country: string;
  /** Straight-line kilometres, rounded. */
  km: number;
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * The point to measure from.
 *
 * `airportRef` is a town-level pin and explicitly not a grave location, but
 * for "how far is this from that" a town-level pin is exactly right, and it is
 * present on many listings that have no exact grave GPS. Ranking by it is the
 * difference between a nearby list on most towns and one on a handful.
 */
function pointFor(cemetery: Cemetery) {
  return coordinatesToPoint(cemetery.coordinates) ?? coordinatesToPoint(cemetery.airportRef);
}

/**
 * The closest other kevarim to a given one, nearest first.
 *
 * `withinKm` is a real limit rather than a display choice: beyond a couple of
 * hours' drive it stops being "nearby" and becomes a different trip, and a
 * list that quietly reaches across a country teaches nobody anything about
 * where these towns actually sit.
 */
export function nearbyKevarim(
  slug: string,
  {
    count = 4,
    withinKm = 120,
    // Where to measure from when this town has no beis hachaim listing of its
    // own, or has one with no coordinates. Lelov and Ropshitz have no listing
    // at all — the guide carries the only point they have.
    from: fallback,
  }: { count?: number; withinKm?: number; from?: string } = {},
): NearbyKever[] {
  const origin = cemeteries.find((cemetery) => cemetery.slug === slug);
  const from = (origin ? pointFor(origin) : undefined) ?? coordinatesToPoint(fallback);
  if (!from) return [];
  return cemeteries
    .filter((cemetery) => cemetery.slug !== slug)
    .flatMap((cemetery) => {
      const to = pointFor(cemetery);
      if (!to) return [];
      const km = haversineKm(from, to);
      if (km > withinKm) return [];
      return [{ slug: cemetery.slug, city: cemetery.city, name: cemetery.name, country: cemetery.country, km: Math.round(km) }];
    })
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}
