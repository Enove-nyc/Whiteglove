// Server read layer: never import this module into a client component.
import { discoveryPhotos } from "@/data/discovery-photos.generated";
import { attractions } from "@/data/attractions";
import { canonicalCountry, geographicKey } from "@/lib/destination-geography";
import type { PlacePhoto } from "@/lib/discovery-photo-types";

function key(city: string, country: string) {
  return `${geographicKey(city)}|${geographicKey(canonicalCountry(country))}`;
}

function display(photo: PlacePhoto, context?: string): PlacePhoto {
  const { src, alt, width, height, creditId } = photo;
  const label = context ?? photo.context;
  return { src, alt, width, height, creditId, ...(label ? { context: label } : {}) };
}

const cityPhotos = new Map(Object.entries(discoveryPhotos.city).map(([name, photo]) => {
  const [city, country] = name.split("|");
  return [key(city, country), photo] as const;
}));
const nearbyPhotos = new Map<string, PlacePhoto>();
for (const attraction of attractions) {
  const photo = discoveryPhotos.attraction[attraction.slug];
  const placeKey = key(attraction.city, attraction.country);
  if (photo && !nearbyPhotos.has(placeKey)) nearbyPhotos.set(placeKey, photo);
}

export function photoForCity(city: string, country: string): PlacePhoto | undefined {
  const placeKey = key(city, country);
  const cityPhoto = cityPhotos.get(placeKey);
  if (cityPhoto) return display(cityPhoto, `City view · ${city}`);
  const nearby = nearbyPhotos.get(placeKey);
  return nearby ? display(nearby, `${nearby.alt} · ${city}`) : undefined;
}

export function photoForAttraction(place: { slug: string; city: string; country: string }): PlacePhoto | undefined {
  const own = discoveryPhotos.attraction[place.slug];
  return own ? display(own) : photoForCity(place.city, place.country);
}

export function photoForVacation(place: { slug: string; cities: readonly string[]; country: string }): PlacePhoto | undefined {
  const own = discoveryPhotos.vacation[place.slug];
  if (own) return display(own);
  for (const city of place.cities) {
    const photo = photoForCity(city, place.country);
    if (photo) return photo;
  }
}
