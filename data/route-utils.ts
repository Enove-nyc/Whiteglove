export type SavedPlace = {
  id: string;
  name: string;
  yiddishName?: string;
  address: string;
  coordinates?: string;
  href?: string;
  plannedDate?: string;
};

const dmsPattern = /(\d+)°(\d+)'([\d.]+)"?([NSEW])/g;

export function coordinatesToPoint(coordinates?: string) {
  if (!coordinates) return null;
  const decimal = coordinates.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (decimal) return { lat: Number(decimal[1]), lng: Number(decimal[2]) };
  const matches = [...coordinates.matchAll(dmsPattern)];
  if (matches.length < 2) return null;
  const convert = (match: RegExpMatchArray) => {
    const value = Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600;
    return match[4] === "S" || match[4] === "W" ? -value : value;
  };
  return { lat: convert(matches[0]), lng: convert(matches[1]) };
}

/**
 * A Google Maps destination string. When we have real coordinates we use ONLY
 * the "lat,lng" (so Maps drops the pin on the exact spot instead of resolving
 * the address text, which can land at the wrong place or "address not found").
 * Falls back to the address only when there are no coordinates.
 */
export function mapsDestination(address?: string | null, coordinates?: string | null): string {
  const point = coordinatesToPoint(coordinates ?? undefined);
  if (point) return `${point.lat},${point.lng}`;
  return (address ?? "").trim();
}

/** "Show this place" — drops a pin (exact coordinates when we have them). */
export function placeMapUrl(address?: string | null, coordinates?: string | null): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsDestination(address, coordinates))}`;
}

/** "Navigate here" — opens turn-by-turn directions to the exact coordinates. */
export function placeDirectionsUrl(address?: string | null, coordinates?: string | null): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsDestination(address, coordinates))}`;
}

/** Directions between two places — used to check the exact travel time. */
export function directionsBetweenUrl(
  from: { address?: string | null; coordinates?: string | null },
  to: { address?: string | null; coordinates?: string | null },
  mode: "driving" | "transit" = "driving",
): string {
  const origin = mapsDestination(from.address, from.coordinates);
  const destination = mapsDestination(to.address, to.coordinates);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`;
}

function distance(first: SavedPlace, second: SavedPlace) {
  const a = coordinatesToPoint(first.coordinates);
  const b = coordinatesToPoint(second.coordinates);
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const calculation = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(calculation), Math.sqrt(1 - calculation));
}

export function optimizeRoute(places: SavedPlace[]) {
  if (places.length < 3) return places;
  const optimizeFlexible = (items: SavedPlace[]) => {
    const routable = items.filter((place) => coordinatesToPoint(place.coordinates));
    const unlocated = items.filter((place) => !coordinatesToPoint(place.coordinates));
    if (routable.length < 2) return items;
    const ordered = [routable.shift()!];
    while (routable.length) {
      const current = ordered[ordered.length - 1];
      let closestIndex = 0;
      for (let index = 1; index < routable.length; index += 1) if (distance(current, routable[index]) < distance(current, routable[closestIndex])) closestIndex = index;
      ordered.push(routable.splice(closestIndex, 1)[0]);
    }
    return [...ordered, ...unlocated];
  };

  const plannedIndexes = places.map((place, index) => place.plannedDate ? index : -1).filter((index) => index >= 0);
  if (plannedIndexes.length === 0) return optimizeFlexible(places);
  const ordered: SavedPlace[] = [];
  let segmentStart = 0;
  for (const anchorIndex of plannedIndexes) {
    ordered.push(...optimizeFlexible(places.slice(segmentStart, anchorIndex)));
    ordered.push(places[anchorIndex]);
    segmentStart = anchorIndex + 1;
  }
  return [...ordered, ...optimizeFlexible(places.slice(segmentStart))];
}

export function directionsUrl(places: SavedPlace[]) {
  if (places.length < 2) return "";
  const location = (place: SavedPlace) => mapsDestination(place.address, place.coordinates);
  const params = new URLSearchParams({ api: "1", origin: location(places[0]), destination: location(places[places.length - 1]) });
  if (places.length > 2) params.set("waypoints", places.slice(1, -1).map(location).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
