import { emptyItinerary, type Itinerary } from "@/data/itinerary";
import type { SavedPlace } from "@/data/route-utils";

/**
 * Keys the old planner wrote into this browser.
 *
 * New saves do not use these. They stay readable so a trip somebody already
 * built here can be offered once, after they sign in, rather than silently
 * deleted. After a confirmed import they are cleared.
 */

export const LEGACY_ITINERARY_KEY = "whiteGloveItinerary";
export const LEGACY_ROUTE_KEY = "whiteGloveMyRoute";
export const LEGACY_FAVORITES_KEY = "whiteGloveFavorites";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readLegacyItinerary(): Itinerary | null {
  const parsed = readJson<Partial<Itinerary> | null>(LEGACY_ITINERARY_KEY, null);
  if (!parsed || typeof parsed !== "object") return null;
  const itinerary = { ...emptyItinerary(), ...parsed };
  if (!legacyItineraryHasContent(itinerary)) return null;
  return itinerary;
}

export function readLegacyRoute(): SavedPlace[] {
  const list = readJson<SavedPlace[]>(LEGACY_ROUTE_KEY, []);
  return Array.isArray(list) ? list.filter((place) => place && typeof place.id === "string") : [];
}

export function readLegacyFavorites(): SavedPlace[] {
  const list = readJson<SavedPlace[]>(LEGACY_FAVORITES_KEY, []);
  return Array.isArray(list) ? list.filter((place) => place && typeof place.id === "string") : [];
}

export function legacyItineraryHasContent(itin: Itinerary): boolean {
  return Boolean(
    itin.flights?.length ||
      itin.lodging?.length ||
      itin.activities?.length ||
      (itin.startDate && itin.endDate) ||
      (itin.title && itin.title.trim() && itin.title.trim() !== "My trip") ||
      itin.notes?.trim(),
  );
}

export function hasLegacyTrip(): boolean {
  return Boolean(readLegacyItinerary() || readLegacyRoute().length || readLegacyFavorites().length);
}

export function describeLegacyTrip(): string {
  const itinerary = readLegacyItinerary();
  const route = readLegacyRoute();
  const favorites = readLegacyFavorites();
  const parts: string[] = [];
  if (itinerary) {
    const stops = (itinerary.activities?.length ?? 0) + (itinerary.lodging?.length ?? 0) + (itinerary.flights?.length ?? 0);
    parts.push(stops ? `a trip with ${stops} ${stops === 1 ? "item" : "items"}` : "a trip started in this browser");
  }
  if (route.length) parts.push(`${route.length} ${route.length === 1 ? "stop" : "stops"} on a route`);
  if (favorites.length) parts.push(`${favorites.length} saved ${favorites.length === 1 ? "place" : "places"}`);
  if (!parts.length) return "what was kept in this browser";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function clearLegacyTrip(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_ITINERARY_KEY);
    localStorage.removeItem(LEGACY_ROUTE_KEY);
    localStorage.removeItem(LEGACY_FAVORITES_KEY);
  } catch {
    /* ignore */
  }
}
