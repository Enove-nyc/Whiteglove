import { coordinatesToPoint } from "@/data/route-utils";

/**
 * What goes on the map, and how much of it is near you.
 *
 * Kept apart from the drawing so both can be checked without a browser: which
 * markers fall inside a search area, how many of each kind, and where the map
 * has to look to show them all.
 */

export type MapKind = "center" | "kever" | "attraction" | "stay" | "kosher" | "airport";

export type MapMarker = {
  id: string;
  name: string;
  subtitle?: string;
  lat: number;
  lng: number;
  href?: string;
  address?: string;
  phone?: string;
  /** Distance from what was searched for. Absent when nothing was. */
  km?: number;
  kind: MapKind;
};

export type Point = { lat: number; lng: number };

export function kmBetween(a: Point, b: Point): number {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * An airport gets a wider net than everything else.
 *
 * You will happily fly into one two hours away and drive; you will not detour
 * two hours for a restaurant. Filtering both at the same radius either hides
 * the airport you would actually use or fills the map with food you never
 * would.
 */
export const AIRPORT_MINIMUM_RADIUS_KM = 120;

/**
 * Narrow a marker set to a search area, stamping the distance on each.
 *
 * A null centre means no search has been made, so nothing is narrowed and
 * nothing carries a distance — there is nothing to measure from.
 */
export function withinArea(markers: MapMarker[], center: Point | null, radiusKm: number): MapMarker[] {
  if (!center) return markers.map((marker) => ({ ...marker, km: undefined }));
  const out: MapMarker[] = [];
  for (const marker of markers) {
    const km = kmBetween(center, marker);
    const limit = marker.kind === "airport" ? Math.max(radiusKm, AIRPORT_MINIMUM_RADIUS_KM) : radiusKm;
    if (km > limit) continue;
    out.push({ ...marker, km });
  }
  return out;
}

export function countByKind(markers: MapMarker[]): Record<MapKind, number> {
  const counts: Record<MapKind, number> = { center: 0, kever: 0, attraction: 0, stay: 0, kosher: 0, airport: 0 };
  for (const marker of markers) counts[marker.kind] += 1;
  return counts;
}

export type Bounds = { north: number; south: number; east: number; west: number };

/**
 * The box that holds every marker, padded a little so pins are not on the edge.
 *
 * Used when the map opens with no search: it should show what the site holds
 * rather than a place somebody has to know to look for.
 */
export function boundsOf(markers: MapMarker[]): Bounds | null {
  const points = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  if (points.length === 0) return null;
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const p of points) {
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }
  // A single marker has no extent, and a zero-height box makes a map zoom to
  // the maximum and show one street.
  const padLat = Math.max((north - south) * 0.08, 0.25);
  const padLng = Math.max((east - west) * 0.08, 0.25);
  return {
    north: Math.min(90, north + padLat),
    south: Math.max(-90, south - padLat),
    east: Math.min(180, east + padLng),
    west: Math.max(-180, west - padLng),
  };
}

/** "everywhere" or "within 50 km of Kraków" — the same words on every screen. */
export function areaLabel(centerName: string | null, radiusKm: number): string {
  return centerName ? `within ${radiusKm} km of ${centerName}` : "everywhere";
}

/**
 * A coordinate string as a point, or nothing — refusing what cannot be plotted.
 *
 * The parsing itself is `coordinatesToPoint`, which already reads both decimal
 * and degrees-minutes-seconds and is used everywhere else in the site. What is
 * added here is the refusal: cemetery coordinates are written as "pending" or
 * "to be added" until somebody has checked them, and a marker dropped at 0,0 in
 * the Atlantic is worse than no marker at all.
 */
export function pointFrom(coordinates: string | undefined | null): Point | null {
  if (!coordinates || /pending|to be added|unknown|tbc/i.test(coordinates)) return null;
  const point = coordinatesToPoint(coordinates);
  if (!point) return null;
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  if (Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) return null;
  // 0,0 is what a half-filled record parses to, not a place anybody is going.
  if (point.lat === 0 && point.lng === 0) return null;
  return point;
}
