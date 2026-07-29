// Live kosher-place lookup from OpenStreetMap via the free Overpass API.
//
// This runs FROM THE BROWSER (like the Photon address autocomplete) — the data
// is real, community-maintained OSM data (names + coordinates), not anything we
// invent. Coverage varies by region. We never fabricate a listing; if OSM has
// nothing for an area, the finder simply shows nothing there.

export type KosherPlace = {
  id: string;
  name: string;
  category: string; // human label, e.g. "Restaurant", "Bakery"
  cuisine?: string;
  address?: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  kosherTag?: string; // yes / only / limited / dairy / meat, when present
  /**
   * Who OSM says certifies it, when a mapper has recorded that.
   *
   * "diet:kosher=yes" means someone believes the food is kosher; it does not
   * say under whose hechsher. A handful of these tags do, and that is worth
   * showing — attributed to OSM, never as something confirmed here.
   */
  reportedHechsher?: string;
  km?: number;
};

// Public Overpass mirrors, tried in order if one is slow/unavailable.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const AMENITY_LABEL: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  fast_food: "Fast food",
  pub: "Pub",
  bar: "Bar",
  food_court: "Food court",
  ice_cream: "Ice cream",
};
const SHOP_LABEL: Record<string, string> = {
  bakery: "Bakery",
  butcher: "Butcher",
  supermarket: "Supermarket",
  convenience: "Grocery",
  greengrocer: "Grocery",
  deli: "Deli",
  pastry: "Pastry",
  confectionery: "Sweets",
  frozen_food: "Frozen food",
  food: "Food shop",
};

function labelFor(tags: Record<string, string>): string {
  if (tags.amenity && AMENITY_LABEL[tags.amenity]) return AMENITY_LABEL[tags.amenity];
  if (tags.shop && SHOP_LABEL[tags.shop]) return SHOP_LABEL[tags.shop];
  if (tags.amenity) return tags.amenity.replace(/_/g, " ");
  if (tags.shop) return `${tags.shop.replace(/_/g, " ")} shop`;
  return "Kosher place";
}

function addressFrom(tags: Record<string, string>): string | undefined {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
    tags["addr:country"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

// The tags mappers actually use to record supervision. None is standard, so
// all of them are read and the first with a real value wins.
const CERT_TAGS = [
  "kosher:certification",
  "kosher:certificate",
  "kosher:supervision",
  "diet:kosher:certification",
  "hechsher",
  "kashrut",
  "kashrut:certification",
  "supervision",
];

function certificationFrom(tags: Record<string, string>): string | undefined {
  for (const key of CERT_TAGS) {
    const value = tags[key]?.trim();
    // "yes" only repeats that it is kosher; it names nobody.
    if (value && !/^(yes|no|true|false)$/i.test(value)) return value.replace(/[_;]+/g, " ");
  }
  return undefined;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function overpassQuery(lat: number, lng: number, radiusM: number): string {
  const a = `(around:${Math.round(radiusM)},${lat},${lng})`;
  return (
    `[out:json][timeout:25];(` +
    `nwr["diet:kosher"~"yes|only|limited"]${a};` +
    `nwr["kosher"~"yes|only"]${a};` +
    `);out center tags 120;`
  );
}

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export function parseOverpass(elements: OverpassElement[], center?: { lat: number; lng: number }): KosherPlace[] {
  const seen = new Set<string>();
  const out: KosherPlace[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name || tags["name:en"] || tags.brand;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!name || lat === undefined || lng === undefined) continue;
    const dedupe = `${name.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push({
      id: `${el.type}/${el.id}`,
      name,
      category: labelFor(tags),
      cuisine: tags.cuisine?.replace(/[_;]/g, " "),
      address: addressFrom(tags),
      lat,
      lng,
      phone: tags.phone || tags["contact:phone"] || tags["contact:mobile"],
      website: tags.website || tags["contact:website"],
      kosherTag: tags["diet:kosher"] || tags.kosher,
      reportedHechsher: certificationFrom(tags),
      km: center ? haversineKm(center.lat, center.lng, lat, lng) : undefined,
    });
  }
  return out.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
}

/**
 * Fetch kosher places near a point from OpenStreetMap. Runs in the browser.
 * Tries mirrors in order; returns [] on total failure (never throws).
 */
export async function fetchKosherPlaces(center: { lat: number; lng: number }, radiusKm = 8): Promise<KosherPlace[]> {
  const body = `data=${encodeURIComponent(overpassQuery(center.lat, center.lng, radiusKm * 1000))}`;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements?: OverpassElement[] };
      return parseOverpass(data.elements ?? [], center);
    } catch {
      // try the next mirror
    }
  }
  return [];
}
