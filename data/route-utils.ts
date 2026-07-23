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
  const location = (place: SavedPlace) => place.coordinates || place.address;
  const params = new URLSearchParams({ api: "1", origin: location(places[0]), destination: location(places[places.length - 1]) });
  if (places.length > 2) params.set("waypoints", places.slice(1, -1).map(location).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
