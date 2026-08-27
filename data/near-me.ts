/**
 * What is near where somebody is staying — and, on Shabbos, whether it is
 * near enough to walk.
 *
 * WHAT THE DATA ACTUALLY SUPPORTS, WHICH IS NOT WHAT YOU WOULD GUESS. The
 * obvious version of this feature is "kosher food near your hotel", and the
 * site cannot honestly answer it: 28 of its 1466 kosher listings carry
 * coordinates, one per city, and the mikvaos carry none at all. Sorting 1438
 * addressless restaurants by distance is not possible, and a page that looked
 * like it had done so would be inventing the answer.
 *
 * SO THE JEWISH QUARTER IS THE ANCHOR, and it turns out to be the better one.
 * All 32 quarters have coordinates, and "the Ghetto is 400m from your hotel,
 * a five-minute walk" tells a traveller more than a distance to one
 * restaurant would, because the quarter is where the food, the shul and the
 * rest of it actually are. The thing the data can support is also the thing
 * worth saying.
 *
 * WALKING TIMES ARE ESTIMATES AND SAY SO. Straight-line distance is not street
 * distance, and 80m/min is an average nobody walks exactly. On an ordinary day
 * that is fine. Before Shabbos it is not fine to be precise-looking and wrong,
 * so anything close to the line is flagged rather than timed to the minute —
 * see walkingNote().
 */

import { kmBetween } from "@/data/itinerary";

/** Metres per minute at an ordinary walking pace. */
const WALK_METRES_PER_MINUTE = 80;

/**
 * How much further the streets are than the crow flies. Straight-line distance
 * always understates a walk; a modest uplift keeps the estimate from reading
 * shorter than the walk actually is, which is the direction that matters when
 * somebody is deciding whether to make it before Shabbos.
 */
const STREET_FACTOR = 1.25;

export type Coordinates = { latitude: number; longitude: number };

/** "41.8921, 12.4780" → a point, or null when it is not one. */
export function parsePoint(value: string | null | undefined): Coordinates | null {
  if (!value) return null;
  const parts = value.split(",");
  if (parts.length !== 2) return null;
  const latitude = Number(parts[0].trim());
  const longitude = Number(parts[1].trim());
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  // 0,0 is the Atlantic. It is what an empty pair of fields parses to, and no
  // listing on this site is there.
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

/**
 * Great-circle distance in metres.
 *
 * THE ARITHMETIC IS kmBetween's, not a second copy of it. data/itinerary.ts
 * has carried a haversine since the planner needed one, and two
 * implementations of the same formula in one repo is how they drift. This
 * takes parsed points and gives metres, because that is what a walk is
 * measured in; the maths underneath is the one that was already here.
 */
export function metresBetween(a: Coordinates, b: Coordinates): number {
  const km = kmBetween(`${a.latitude},${a.longitude}`, `${b.latitude},${b.longitude}`);
  return (km ?? 0) * 1000;
}

/** "400 m" / "1.2 km". Rounded the way somebody reads a distance, not to the metre. */
export function distanceLabel(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 50) * 50} m`;
  return `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`;
}

/**
 * "About 5 minutes' walk", or null when it is far enough that a walking time
 * is not the useful answer. Past about an hour on foot somebody is taking a
 * car, and a page saying "about 94 minutes' walk" is being unhelpful
 * precisely.
 */
export function walkingLabel(metres: number): string | null {
  const minutes = Math.round((metres * STREET_FACTOR) / WALK_METRES_PER_MINUTE);
  if (minutes > 60) return null;
  if (minutes <= 1) return "A minute's walk";
  return `About ${minutes} minutes' walk`;
}

/**
 * The caution that belongs beside a walking time, or null.
 *
 * Straight-line distance plus an average pace is a good guess and nothing
 * more. Somewhere past twenty minutes the error is big enough to matter to
 * somebody walking it before Shabbos with a bag, so it is said out loud
 * rather than left implied by a confident-looking number.
 */
export function walkingNote(metres: number): string | null {
  const minutes = Math.round((metres * STREET_FACTOR) / WALK_METRES_PER_MINUTE);
  if (minutes > 60) return null;
  if (minutes >= 20) return "Estimated from the map, not from the streets — allow more than this before Shabbos.";
  return null;
}

export type NearbyThing<T> = {
  item: T;
  metres: number;
  distance: string;
  /** Null when it is too far for walking to be the answer. */
  walk: string | null;
  walkNote: string | null;
};

/**
 * The nearest of something, closest first.
 *
 * Anything without usable coordinates is skipped rather than sorted to the
 * end: an item with no position is not "far away", it is unknown, and putting
 * it in a distance-ordered list would say something the data does not.
 */
export function nearest<T>(
  from: Coordinates,
  items: readonly T[],
  options: {
    coordinatesOf: (item: T) => string | null | undefined;
    /** Ignore anything beyond this, in metres. */
    within: number;
    limit: number;
  },
): NearbyThing<T>[] {
  const found: NearbyThing<T>[] = [];
  for (const item of items) {
    const point = parsePoint(options.coordinatesOf(item));
    if (!point) continue;
    const metres = metresBetween(from, point);
    if (metres > options.within) continue;
    found.push({
      item,
      metres,
      distance: distanceLabel(metres),
      walk: walkingLabel(metres),
      walkNote: walkingNote(metres),
    });
  }
  found.sort((a, b) => a.metres - b.metres);
  return found.slice(0, options.limit);
}

/**
 * How far out each kind of thing is worth looking, in metres.
 *
 * WRITTEN FOR A HOTEL, WHICH IS WHERE THIS STARTED. Somebody standing where
 * they are sleeping is asking whether they can walk it, and eight kilometres
 * is already further than that question means.
 */
export const RANGES = {
  /** A quarter further than this is not "where you are staying" in any useful sense. */
  quarter: 8_000,
  shul: 5_000,
  /** Somewhere to see is worth a bus ride in a way a shul on Shabbos is not. */
  thingToDo: 15_000,
  food: 5_000,
} as const;

/**
 * The same question asked from an airport, where nobody walks anywhere.
 *
 * WHY IT IS NOT ONE SET OF NUMBERS. Measured from a hotel, five kilometres is
 * generous — it is an hour on foot. Measured from JFK it is the runway: the
 * nearest listed shul is 23km away and the whole of Manhattan is 21, so the
 * walking ranges answered "nothing on this site is close enough" to somebody
 * standing in the arrivals hall of the busiest Jewish gateway on earth. That
 * is not a true answer, it is the wrong ruler.
 *
 * A traveler who has just landed has a car or a train and will happily hear
 * about somewhere half an hour away. So the ranges widen when the anchor is an
 * airport, and only then — a postcode, a landmark and a hotel are all still
 * places somebody is standing.
 */
export const DRIVING_RANGES = {
  quarter: 40_000,
  shul: 30_000,
  thingToDo: 40_000,
  food: 30_000,
} as const;

export type NearMode = "walk" | "drive";

/** The ruler to measure with. Unknown modes fall back to walking, the stricter one. */
export function rangesFor(mode: NearMode | string | null | undefined) {
  return mode === "drive" ? DRIVING_RANGES : RANGES;
}
