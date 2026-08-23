// A general hotel/lodging lookup — type a name, get the real place: address,
// coordinates, phone. Backed by Google's Places API (New), server-side only.
//
// THIS IS NOT THE SITE'S RESEARCHED LODGING (lib/lodging-search.ts). That list
// is the kosher-friendly stays the owner has actually vetted, and it stays
// exactly as it is — the picker for it is offered first, in the itinerary
// builder, on both brands. This is the fallback for everything that list does
// not cover: any hotel, anywhere, looked up live rather than pre-researched.
// Brand-neutral by design — it is plumbing, not kosher-specific content, so it
// is available on White Glove Itineraries exactly as it is on Kosher Travel.
//
// "Free for now": Google's Places API has a monthly free credit, and this
// stays inside it by being asked for sparingly rather than by being clever —
// see the rate limiting in app/api/lodging/places-search/route.ts, which is
// the actual budget control.

import { apiKey } from "@/lib/api-key";

export type PlaceLodgingResult = {
  name: string;
  address?: string;
  /** "lat, lng" — same format AddressAutocomplete and the route-times API use. */
  coordinates?: string;
  phone?: string;
  website?: string;
};

type PlacesTextSearchResponse = {
  places?: Array<{
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    internationalPhoneNumber?: string;
    websiteUri?: string;
  }>;
};

const FIELD_MASK = [
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.internationalPhoneNumber",
  "places.websiteUri",
].join(",");

/**
 * Look up hotels/lodging by name (and, loosely, place — "Marriott Vienna"
 * works the same as "Marriott" typed while planning a Vienna day). Returns an
 * empty array rather than throwing when the key is missing or Google refuses
 * the request — a caller with no autofill is a smaller problem than a broken
 * form.
 */
export async function searchHotelPlaces(query: string, limit = 8): Promise<PlaceLodgingResult[]> {
  const q = query.trim();
  if (!q) return [];

  const key = apiKey("GOOGLE_PLACES_API_KEY");
  if (!key) return [];

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: q,
        includedType: "lodging",
        maxResultCount: Math.min(Math.max(limit, 1), 10),
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      console.error("[hotel-places] Google Places returned", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return [];
    }

    const data = (await res.json()) as PlacesTextSearchResponse;
    return (data.places ?? [])
      .map((p): PlaceLodgingResult | null => {
        const name = p.displayName?.text?.trim();
        if (!name) return null;
        const lat = p.location?.latitude;
        const lng = p.location?.longitude;
        return {
          name,
          address: p.formattedAddress || undefined,
          coordinates: typeof lat === "number" && typeof lng === "number" ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : undefined,
          phone: p.internationalPhoneNumber || undefined,
          website: p.websiteUri || undefined,
        };
      })
      .filter((p): p is PlaceLodgingResult => p !== null);
  } catch (error) {
    console.error("[hotel-places] request failed:", error);
    return [];
  }
}
