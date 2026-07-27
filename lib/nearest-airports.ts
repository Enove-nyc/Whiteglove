// Rank the closest commercial airports to a beis hachaim, for the "nearest
// airport" note on each cemetery page. Uses the airports in data/airports.ts
// (real, scheduled-service airports with coordinates). Exact driving/transit
// times come from the live Google Maps links the page builds from these.

import { AIRPORTS, type Airport } from "@/data/airports";
import { coordinatesToPoint, mapsDestination } from "@/data/route-utils";

export type RankedAirport = { airport: Airport; km: number | null };

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const norm = (s: string) => s.toLowerCase().trim();

/** The `count` closest airports to a coordinate string, nearest first. */
export function nearestAirports(coordinates: string | undefined, count = 3): RankedAirport[] {
  const point = coordinatesToPoint(coordinates);
  if (!point) return [];
  return AIRPORTS.map((airport) => ({ airport, km: haversineKm(point.lat, point.lng, airport.lat, airport.lng) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}

/** Fallback when a kever has no coordinates: the main airports of its country. */
export function airportsForCountry(country: string | undefined, count = 3): RankedAirport[] {
  if (!country) return [];
  // Take the primary country token ("Israel / Judea" -> "israel") and match the
  // airport country EXACTLY (so "Ukraine" never matches "UK").
  const c = norm(country).split(/[/,]/)[0].trim();
  const alias: Record<string, string> = { "czech republic": "czechia", holland: "netherlands", "united kingdom": "uk", england: "uk", "united states": "usa", america: "usa" };
  const target = alias[c] ?? c;
  const matches = AIRPORTS.filter((a) => norm(a.country) === target);
  return matches
    .sort((a, b) => (a.size === b.size ? a.city.localeCompare(b.city) : a.size === "major" ? -1 : 1))
    .slice(0, count)
    .map((airport) => ({ airport, km: null }));
}

/** Google Maps directions from an airport to a destination, by car or transit. */
export function airportDirectionsUrl(airport: Airport, destAddress: string | undefined, destCoordinates: string | undefined, mode: "driving" | "transit"): string {
  const origin = `${airport.lat},${airport.lng}`;
  const destination = mapsDestination(destAddress, destCoordinates);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`;
}

export function formatKm(km: number | null): string {
  if (km === null) return "";
  const mi = km * 0.621371;
  return km < 10 ? `${km.toFixed(1)} km · ${Math.round(mi)} mi` : `${Math.round(km)} km · ${Math.round(mi)} mi`;
}
