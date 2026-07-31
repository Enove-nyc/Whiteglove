export type SavedPlace = {
  id: string;
  name: string;
  yiddishName?: string;
  address: string;
  coordinates?: string;
  href?: string;
  plannedDate?: string;
  /**
   * Pinned to one end of the route.
   *
   * "Start route here" and "End route here" only set the order, and ordering
   * alone does not survive optimisation — the nearest-neighbour pass would
   * happily move the airport you land at into the middle of the trip. An
   * anchor says the position was chosen, not computed.
   */
  anchor?: "start" | "end";
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

/**
 * Coordinates in the degrees/minutes/seconds form Google Maps shows —
 * e.g. 50°15'04.1"N 22°25'21.4"E. This is what a traveler should paste into
 * Maps to land on the exact spot, rather than a street address that can
 * resolve somewhere nearby. Returns null when there is no usable coordinate.
 */
export function toDMS(coordinates?: string | null): string | null {
  const point = coordinatesToPoint(coordinates ?? undefined);
  if (!point) return null;
  const part = (value: number, positive: string, negative: string) => {
    const hemisphere = value >= 0 ? positive : negative;
    // Work in tenths of a second so the carry cases (59.97" -> next minute)
    // round correctly instead of printing 60.0".
    const totalSeconds = Math.round(Math.abs(value) * 36000) / 10;
    let degrees = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds - degrees * 3600) / 60);
    let seconds = Math.round((totalSeconds - degrees * 3600 - minutes * 60) * 10) / 10;
    if (seconds >= 60) { seconds -= 60; minutes += 1; }
    if (minutes >= 60) { minutes -= 60; degrees += 1; }
    return `${degrees}°${String(minutes).padStart(2, "0")}'${seconds.toFixed(1).padStart(4, "0")}"${hemisphere}`;
  };
  return `${part(point.lat, "N", "S")} ${part(point.lng, "E", "W")}`;
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

export function optimizeRoute(places: SavedPlace[], from?: SavedPlace): SavedPlace[] {
  // A stop pinned to an end was placed on purpose — you land at Kraków and you
  // finish at Uman — so the middle is what gets optimised, between them.
  //
  // The start is also passed down as the point to set off FROM. Without that,
  // the middle gets ordered starting from whichever stop happened to be first
  // in the list, and a route that begins at the airport can still have its
  // second stop be the furthest one on the trip.
  const start = places.find((place) => place.anchor === "start");
  const end = places.find((place) => place.anchor === "end" && place.id !== start?.id);
  if (start || end) {
    const middle = places.filter((place) => place.id !== start?.id && place.id !== end?.id);
    return [...(start ? [start] : []), ...optimizeRoute(middle, start), ...(end ? [end] : [])];
  }
  if (places.length < 3) return places;
  const optimizeFlexible = (items: SavedPlace[], seed?: SavedPlace) => {
    const routable = items.filter((place) => coordinatesToPoint(place.coordinates));
    const unlocated = items.filter((place) => !coordinatesToPoint(place.coordinates));
    if (routable.length < 2) return items;
    // Seeded from where the trip actually starts when there is one, otherwise
    // from the first stop, which is the old behaviour.
    const ordered: SavedPlace[] = [];
    if (seed && coordinatesToPoint(seed.coordinates)) {
      let closestIndex = 0;
      for (let index = 1; index < routable.length; index += 1) if (distance(seed, routable[index]) < distance(seed, routable[closestIndex])) closestIndex = index;
      ordered.push(routable.splice(closestIndex, 1)[0]);
    } else {
      ordered.push(routable.shift()!);
    }
    while (routable.length) {
      const current = ordered[ordered.length - 1];
      let closestIndex = 0;
      for (let index = 1; index < routable.length; index += 1) if (distance(current, routable[index]) < distance(current, routable[closestIndex])) closestIndex = index;
      ordered.push(routable.splice(closestIndex, 1)[0]);
    }
    return [...ordered, ...unlocated];
  };

  const plannedIndexes = places.map((place, index) => place.plannedDate ? index : -1).filter((index) => index >= 0);
  if (plannedIndexes.length === 0) return optimizeFlexible(places, from);
  const ordered: SavedPlace[] = [];
  let segmentStart = 0;
  for (const anchorIndex of plannedIndexes) {
    ordered.push(...optimizeFlexible(places.slice(segmentStart, anchorIndex), segmentStart === 0 ? from : places[segmentStart - 1]));
    ordered.push(places[anchorIndex]);
    segmentStart = anchorIndex + 1;
  }
  return [...ordered, ...optimizeFlexible(places.slice(segmentStart), places[segmentStart - 1] ?? from)];
}

export function directionsUrl(places: SavedPlace[]) {
  if (places.length < 2) return "";
  const location = (place: SavedPlace) => mapsDestination(place.address, place.coordinates);
  const params = new URLSearchParams({ api: "1", origin: location(places[0]), destination: location(places[places.length - 1]) });
  if (places.length > 2) params.set("waypoints", places.slice(1, -1).map(location).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Putting one place at the start or the end of a route.
 *
 * "Start here" and "End here" are how somebody actually plans a trip: they
 * know they land at Kraków and they know they finish at Uman, and everything
 * else arranges itself between the two. Both add the place if the route does
 * not have it yet, so a visitor does not have to save it first and then move
 * it — one press does what it says.
 *
 * Matching is by id. Two records for the same town — the guide and the beis
 * hachaim — are different stops and both belong on a route.
 */
export function withPlaceFirst(places: SavedPlace[], place: SavedPlace): SavedPlace[] {
  // Only one stop can be the start. Anything else claiming to be goes back to
  // being an ordinary stop rather than leaving two pinned firsts.
  const rest = places.filter((item) => item.id !== place.id).map((item) => (item.anchor === "start" ? { ...item, anchor: undefined } : item));
  return [{ ...place, anchor: "start" as const }, ...rest];
}

export function withPlaceLast(places: SavedPlace[], place: SavedPlace): SavedPlace[] {
  const rest = places.filter((item) => item.id !== place.id).map((item) => (item.anchor === "end" ? { ...item, anchor: undefined } : item));
  return [...rest, { ...place, anchor: "end" as const }];
}

/** Moves one stop by hand, one position at a time. Anchored ends stay put. */
export function movePlace(places: SavedPlace[], id: string, direction: -1 | 1): SavedPlace[] {
  const from = places.findIndex((item) => item.id === id);
  if (from === -1) return places;
  const to = from + direction;
  if (to < 0 || to >= places.length) return places;
  // Neither the stop being moved nor the one it would displace may be an
  // anchored end — otherwise a couple of clicks quietly unpins the airport
  // somebody deliberately put first.
  if (places[from].anchor || places[to].anchor) return places;
  const next = [...places];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** Where a place sits in a route, for labelling the buttons honestly. */
export function placeRole(places: SavedPlace[], id: string): "start" | "end" | "middle" | "absent" {
  const index = places.findIndex((item) => item.id === id);
  if (index === -1) return "absent";
  // A one-stop route is its own start; calling it the end as well would light
  // up both buttons and tell somebody nothing.
  if (index === 0) return "start";
  if (index === places.length - 1) return "end";
  return "middle";
}
