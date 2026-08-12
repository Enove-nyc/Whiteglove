/**
 * A city, town or postcode anywhere in the world, turned into a point with a
 * real clock on it.
 *
 * ONLY FOR THE ZMANIM LOOKUP. This is not how the site learns about places:
 * nothing here becomes a listing, nothing is stored, and a result is never
 * treated as White Glove having checked anything. The itinerary's own address
 * fields still do not geocode what is typed into them, for the reason written
 * in components/AddressAutocomplete.tsx — a resolved address there would look
 * like a verified one. Asking "what time is shkia in Boro Park" is a different
 * act: the visitor types a place precisely so it will be looked up.
 *
 * THE ANSWER IS A LIST, NOT A GUESS. "11219" is a postcode in Brooklyn, in
 * Vilnius and in Stockholm, and OpenStreetMap offers Vilnius first. Picking one
 * for the traveller would silently hand a Boro Park family Lithuanian zmanim.
 * So every match is returned with its country, and somebody chooses.
 *
 * THE TIMEZONE IS NOT TAKEN FROM THE GEOCODER. It comes from tz-lookup, which
 * carries the timezone boundaries and answers offline — so it is right for Los
 * Angeles and Brisbane, where a country name is not enough, and it needs no
 * second request to get there.
 */

import tz from "tz-lookup";

export type FoundPlace = {
  /** Stable enough to key a list on. */
  id: string;
  /** "Borough Park, Brooklyn, New York" — what the traveller reads. */
  name: string;
  /** Spelled out, so two identical names are told apart. */
  country: string;
  latitude: number;
  longitude: number;
  /** A real IANA zone, with daylight saving in it. */
  timeZoneId: string;
};

function endpoint(): string {
  return process.env.NOMINATIM_URL?.trim() || "https://nominatim.openstreetmap.org/search";
}

/**
 * OpenStreetMap asks for a real identifier with a way to make contact, and
 * refuses traffic that does not carry one. NOMINATIM_URL exists so the tests
 * can aim this at a stub instead of spending somebody else's quota.
 */
const USER_AGENT = "WhiteGloveItineraries/1.0 (+https://whitegloveitineraries.com; whitegloveitineraries@gmail.com)";

/** Enough to tell the Brooklyn one from the Vilnius one; more is a directory. */
const MOST_RESULTS = 6;

type NominatimRow = {
  place_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  address?: Record<string, string>;
};

/**
 * The shortest name that still says which place this is.
 *
 * display_name runs to eight comma-separated parts ("Borough Park, Brooklyn,
 * Kings County, New York, 11219, United States"), and the county and the
 * postcode are noise to somebody scanning four results. The country is dropped
 * here because it is shown on its own.
 */
function shortName(row: NominatimRow): string {
  const address = row.address ?? {};
  const locality =
    address.city ?? address.town ?? address.village ?? address.suburb ?? address.municipality ?? address.county;
  const region = address.state ?? address.region ?? "";
  const leading = row.name?.trim() || row.display_name?.split(",")[0]?.trim() || "";

  const parts: string[] = [];
  for (const part of [leading, locality, region]) {
    const value = part?.trim();
    // A postcode search names the place after the postcode, and the town is
    // then the same word again — "11219, 11219, Brooklyn" helps nobody.
    if (value && !parts.some((held) => held.toLocaleLowerCase("en") === value.toLocaleLowerCase("en"))) {
      parts.push(value);
    }
  }
  return parts.join(", ") || (row.display_name ?? "");
}

function toPlace(row: NominatimRow): FoundPlace | null {
  const latitude = Number(row.lat);
  const longitude = Number(row.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  let timeZoneId: string;
  try {
    timeZoneId = tz(latitude, longitude);
  } catch {
    // A point in the open ocean has no zone to give. Nothing to show.
    return null;
  }

  return {
    id: String(row.place_id ?? `${latitude},${longitude}`),
    name: shortName(row),
    country: row.address?.country ?? "",
    latitude,
    longitude,
    timeZoneId,
  };
}

/**
 * Look a place up. Returns [] rather than throwing: a search that cannot reach
 * OpenStreetMap should leave the page usable, with the curated list and the
 * coordinate boxes both still working.
 */
export async function findPlaces(query: string, signal?: AbortSignal): Promise<FoundPlace[]> {
  const q = query.trim();
  // Two characters cannot pick a place out of the world, and asking anyway
  // spends a request on a result nobody can use.
  if (q.length < 3) return [];

  const url = new URL(endpoint());
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(MOST_RESULTS));
  // Otherwise Bnei Brak comes back as בני ברק and Antwerp as Antwerpen, which
  // is correct and unreadable to the person who typed the English.
  url.searchParams.set("accept-language", "en");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal,
      // The world's cities do not move. Held for a day so a hundred people
      // asking for Antwerp cost one request to somebody else's server.
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return [];
    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows)) return [];

    const seen = new Set<string>();
    const places: FoundPlace[] = [];
    for (const row of rows) {
      const place = toPlace(row as NominatimRow);
      if (!place || !place.name) continue;
      // Three "Antwerpen, Flanders" rows a few kilometres apart are one answer.
      const key = `${place.name}|${place.country}`.toLocaleLowerCase("en");
      if (seen.has(key)) continue;
      seen.add(key);
      places.push(place);
    }
    return places;
  } catch {
    return [];
  }
}

/**
 * The timezone for coordinates somebody typed in themselves.
 *
 * Here so the page never has to fall back to an offset worked out from the
 * longitude, which has no daylight saving in it and reads an hour wrong for
 * half the year — the failure this whole lookup exists to stop.
 */
export function timeZoneAt(latitude: number, longitude: number): string | null {
  try {
    return tz(latitude, longitude);
  } catch {
    return null;
  }
}
