// Suggests nearby stops from the site's own kever/cemetery listings, ranked by
// straight-line distance — powers the "you have free hours, here's what's near"
// feature in the itinerary builder.

import { cemeteries } from "@/data/cemeteries";
import { kmBetween } from "@/data/itinerary";

export type NearbySuggestion = {
  name: string;
  yiddishName?: string;
  address: string;
  coordinates: string;
  href: string;
  km: number;
};

export function nearbyPlaces(
  coordinates: string,
  opts: { excludeNames?: string[]; limit?: number; maxKm?: number } = {},
): NearbySuggestion[] {
  const exclude = new Set((opts.excludeNames ?? []).map((n) => n.toLowerCase()));
  const limit = opts.limit ?? 6;
  const maxKm = opts.maxKm ?? 150;

  return cemeteries
    .filter((c) => c.coordinates && !exclude.has(c.name.toLowerCase()))
    .map((c) => ({
      name: c.name,
      yiddishName: c.yiddishName,
      address: c.address,
      coordinates: c.coordinates as string,
      href: `/cemeteries/${c.slug}`,
      km: kmBetween(coordinates, c.coordinates) ?? Number.POSITIVE_INFINITY,
    }))
    .filter((s) => Number.isFinite(s.km) && s.km <= maxKm && s.km > 0.05)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}
