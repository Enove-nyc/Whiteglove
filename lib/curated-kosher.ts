import { kosherEateries, type KosherEatery } from "@/data/kosher-eateries";
import { coordinatesToPoint } from "@/data/route-utils";

export type CuratedKosherPlace = {
  id: string;
  name: string;
  category: KosherEatery["kind"];
  diet: KosherEatery["diet"];
  city: string;
  country: string;
  summary: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  hechsher: KosherEatery["hechsher"];
};

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitude = radians(b.lat - a.lat);
  const longitude = radians(b.lng - a.lng);
  const haversine =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

const CURATED_KOSHER_PLACES: readonly CuratedKosherPlace[] = kosherEateries.map((eatery) => {
  const point = coordinatesToPoint(eatery.coordinates);
  return {
    id: `eatery:${eatery.slug}`,
    name: eatery.name,
    category: eatery.kind,
    diet: eatery.diet,
    city: eatery.city,
    country: eatery.country,
    summary: eatery.summary,
    address: eatery.address,
    lat: point?.lat,
    lng: point?.lng,
    phone: eatery.phone,
    website: eatery.website,
    hechsher: eatery.hechsher,
  };
});

const CURATED_KOSHER_PLACE_IDS = new Set(CURATED_KOSHER_PLACES.map((place) => place.id));

export function curatedKosherPlaces(): readonly CuratedKosherPlace[] {
  return CURATED_KOSHER_PLACES;
}

export function isCuratedKosherPlaceId(id: string): boolean {
  return CURATED_KOSHER_PLACE_IDS.has(id);
}

export function searchCuratedKosherPlaces(query: string): CuratedKosherPlace[] {
  const terms = query.trim().toLocaleLowerCase("en").split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...CURATED_KOSHER_PLACES];

  return CURATED_KOSHER_PLACES.filter((place) => {
    const haystack = [
      place.name,
      place.category,
      place.diet,
      place.city,
      place.country,
      place.summary,
      place.address ?? "",
    ].join(" ").toLocaleLowerCase("en");
    return terms.every((term) => haystack.includes(term));
  });
}

export function curatedKosherPlacesNear(
  center: { lat: number; lng: number },
  radiusKm: number,
): Array<CuratedKosherPlace & { km: number }> {
  return CURATED_KOSHER_PLACES.flatMap((place) => {
    if (place.lat === undefined || place.lng === undefined) return [];
    const km = distanceKm(center, { lat: place.lat, lng: place.lng });
    return km <= radiusKm ? [{ ...place, km }] : [];
  }).sort((left, right) => left.km - right.km);
}
