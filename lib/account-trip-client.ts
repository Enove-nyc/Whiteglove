import { emptyItinerary, type ItinActivity, type Itinerary } from "@/data/itinerary";
import { withPlaceFirst, withPlaceLast, type SavedPlace } from "@/data/route-utils";
import {
  confirmationFor,
  type PendingSave,
  type SaveNotice,
  type TripPatch,
} from "@/lib/pending-save";
import { clearLegacyTrip, readLegacyFavorites, readLegacyItinerary, readLegacyRoute } from "@/lib/legacy-trip-storage";

export const PLACES_EVENT = "whiteglove-account-places";
export const TRIP_EVENT = "whiteglove-account-trip";

export function notifyPlacesChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PLACES_EVENT));
}

export function notifyTripChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TRIP_EVENT));
}

export function activityFromPlace(place: SavedPlace, extra?: Partial<ItinActivity>): ItinActivity {
  return {
    id: place.id,
    name: place.name,
    yiddishName: place.yiddishName,
    address: place.address,
    coordinates: place.coordinates,
    href: place.href,
    date: place.plannedDate || "",
    bookedOnSite: false,
    ...extra,
  };
}

export function mergeActivity(itin: Itinerary, activity: ItinActivity): { itinerary: Itinerary; added: boolean } {
  const activities = itin.activities ?? [];
  if (activities.some((item) => item.id === activity.id || item.name.toLowerCase() === activity.name.toLowerCase())) {
    return { itinerary: itin, added: false };
  }
  return { itinerary: { ...itin, activities: [...activities, activity] }, added: true };
}

export function mergePatch(itin: Itinerary, patch: TripPatch): Itinerary {
  const next: Itinerary = {
    ...itin,
    flights: [...(itin.flights ?? []), ...(patch.flights ?? [])],
    lodging: [...(itin.lodging ?? []), ...(patch.lodging ?? [])],
    activities: [...(itin.activities ?? []), ...(patch.activities ?? [])],
  };
  const dates = (patch.dates ?? []).filter(Boolean).sort();
  if (dates.length) {
    if (!next.startDate || dates[0] < next.startDate) next.startDate = dates[0];
    if (!next.endDate || dates[dates.length - 1] > next.endDate) next.endDate = dates[dates.length - 1];
  }
  return next;
}

export function addPlaceIfAbsent(places: SavedPlace[], place: SavedPlace): { places: SavedPlace[]; added: boolean } {
  if (places.some((item) => item.id === place.id)) return { places, added: false };
  return { places: [...places, place], added: true };
}

async function readJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null;
}

export async function fetchAccountItinerary(): Promise<{ itinerary: Itinerary; tripId?: string } | null> {
  const response = await fetch("/api/account/itinerary", { cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Could not load your trip.");
  const data = await readJson<{ itinerary?: Itinerary | null; tripId?: string }>(response);
  return {
    itinerary: data?.itinerary ? { ...emptyItinerary(), ...data.itinerary } : emptyItinerary(),
    tripId: data?.tripId,
  };
}

export async function saveAccountItinerary(itinerary: Itinerary, tripId?: string): Promise<boolean> {
  const response = await fetch("/api/account/itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itinerary, tripId }),
  });
  return response.ok;
}

type AccountPlaces = { route: SavedPlace[]; favorites: SavedPlace[] };

export async function fetchAccountPlaces(): Promise<AccountPlaces | null> {
  const response = await fetch("/api/account/me", { cache: "no-store" });
  if (!response.ok) return null;
  const data = await readJson<{ signedIn?: boolean; data?: { route?: SavedPlace[]; favorites?: SavedPlace[] } | null }>(response);
  if (!data?.signedIn) return null;
  return {
    route: Array.isArray(data.data?.route) ? data.data.route : [],
    favorites: Array.isArray(data.data?.favorites) ? data.data.favorites : [],
  };
}

export async function saveAccountPlaces(collection: "route" | "favorites", items: SavedPlace[]): Promise<boolean> {
  const response = await fetch("/api/account/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection, action: "replace", items }),
  });
  if (response.ok) notifyPlacesChanged();
  return response.ok;
}

export async function executePendingSave(action: PendingSave): Promise<SaveNotice> {
  try {
    switch (action.type) {
      case "add-place-to-route": {
        const current = await fetchAccountPlaces();
        if (!current) return { ok: false, message: "Please sign in to save your route." };
        const next = addPlaceIfAbsent(current.route, action.place);
        if (!(await saveAccountPlaces("route", next.places))) return { ok: false, message: "Could not save your route." };
        return confirmationFor(action);
      }
      case "remove-place-from-route": {
        const current = await fetchAccountPlaces();
        if (!current) return { ok: false, message: "Please sign in to save your route." };
        const next = current.route.filter((place) => place.id !== action.placeId);
        if (!(await saveAccountPlaces("route", next))) return { ok: false, message: "Could not update your route." };
        return confirmationFor(action);
      }
      case "replace-route": {
        if (!(await saveAccountPlaces("route", action.places))) return { ok: false, message: "Could not save your route." };
        return confirmationFor(action);
      }
      case "anchor-route": {
        const current = await fetchAccountPlaces();
        if (!current) return { ok: false, message: "Please sign in to save your route." };
        const next = action.anchor === "start" ? withPlaceFirst(current.route, action.place) : withPlaceLast(current.route, action.place);
        if (!(await saveAccountPlaces("route", next))) return { ok: false, message: "Could not save your route." };
        return confirmationFor(action);
      }
      case "add-favorite": {
        const current = await fetchAccountPlaces();
        if (!current) return { ok: false, message: "Please sign in to save this." };
        const next = addPlaceIfAbsent(current.favorites, action.place);
        if (!(await saveAccountPlaces("favorites", next.places))) return { ok: false, message: "Could not save that place." };
        return confirmationFor(action);
      }
      case "remove-favorite": {
        const current = await fetchAccountPlaces();
        if (!current) return { ok: false, message: "Please sign in to save this." };
        const next = current.favorites.filter((place) => place.id !== action.placeId);
        if (!(await saveAccountPlaces("favorites", next))) return { ok: false, message: "Could not update your saved places." };
        return confirmationFor(action);
      }
      case "add-activity-to-trip": {
        const loaded = await fetchAccountItinerary();
        if (!loaded) return { ok: false, message: "Please sign in to save your trip." };
        const merged = mergeActivity(loaded.itinerary, action.activity);
        if (!(await saveAccountItinerary(merged.itinerary, loaded.tripId))) return { ok: false, message: "Could not add that to your trip." };
        notifyTripChanged();
        return confirmationFor(action);
      }
      case "merge-trip-patch": {
        const loaded = await fetchAccountItinerary();
        if (!loaded) return { ok: false, message: "Please sign in to save your trip." };
        const next = mergePatch(loaded.itinerary, action.patch);
        if (!(await saveAccountItinerary(next, loaded.tripId))) return { ok: false, message: "Could not add that to your trip." };
        notifyTripChanged();
        return confirmationFor(action);
      }
      case "save-itinerary": {
        if (!(await saveAccountItinerary(action.itinerary))) return { ok: false, message: "Could not save your trip." };
        notifyTripChanged();
        return confirmationFor(action);
      }
      case "import-shared": {
        const response = await fetch("/api/account/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "import", itinerary: action.itinerary, name: action.itinerary.title }),
        });
        const data = await readJson<{ ok?: boolean; error?: string }>(response);
        if (!response.ok || !data?.ok) return { ok: false, message: data?.error ?? "Could not add it. Try again." };
        notifyTripChanged();
        return confirmationFor(action);
      }
      case "import-route-into-trip": {
        const places = await fetchAccountPlaces();
        if (!places) return { ok: false, message: "Please sign in to save your trip." };
        let next = action.itinerary;
        for (const place of places.route) {
          next = mergeActivity(next, activityFromPlace(place)).itinerary;
        }
        if (!(await saveAccountItinerary(next))) return { ok: false, message: "Could not add your route to this trip." };
        notifyTripChanged();
        return confirmationFor(action);
      }
    }
  } catch {
    return { ok: false, message: "Could not reach the server. Try again." };
  }
}

/**
 * One-time move of a browser-built trip into the account, after sign-in.
 *
 * Does not overwrite a trip that already has stops. Duplicate ids are skipped.
 */
export async function migrateLegacyTrip(): Promise<SaveNotice> {
  const loaded = await fetchAccountItinerary();
  const places = await fetchAccountPlaces();
  if (!loaded || !places) return { ok: false, message: "Please sign in first." };

  const legacyItinerary = readLegacyItinerary();
  const legacyRoute = readLegacyRoute();
  const legacyFavorites = readLegacyFavorites();

  const accountEmpty =
    !(loaded.itinerary.flights?.length || loaded.itinerary.lodging?.length || loaded.itinerary.activities?.length) &&
    places.route.length === 0 &&
    places.favorites.length === 0;

  if (!legacyItinerary && !legacyRoute.length && !legacyFavorites.length) {
    return { ok: false, message: "Nothing from this browser to import." };
  }
  if (!accountEmpty) {
    return { ok: false, message: "Your account already has a trip, so nothing was imported from this browser." };
  }

  const itinerary = legacyItinerary ?? loaded.itinerary;
  if (!(await saveAccountItinerary(itinerary, loaded.tripId))) return { ok: false, message: "Could not import that trip." };
  if (legacyRoute.length && !(await saveAccountPlaces("route", legacyRoute))) {
    return { ok: false, message: "The trip was imported, but the route could not be." };
  }
  if (legacyFavorites.length && !(await saveAccountPlaces("favorites", legacyFavorites))) {
    return { ok: false, message: "The trip was imported, but saved places could not be." };
  }
  clearLegacyTrip();
  notifyTripChanged();
  return {
    ok: true,
    message: "Imported into your account. It will be there on any device you sign in on.",
    viewHref: "/itinerary",
    viewLabel: "View trip",
  };
}
