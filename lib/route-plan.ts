// Automatic route planning for the itinerary.
//
// The rule the traveler asked for: a stop that has been given a specific date
// is FIXED to that date — everything else is arranged around it. Stops with no
// date float, and get placed on whichever day keeps the driving shortest. Every
// day is then ordered into the fastest sensible run (nearest-neighbour from
// where the day starts), so stop 1, 2, 3 read in driving order.
//
// Pure functions — no network, no browser APIs. Distances are straight-line
// (the same estimate the day cards show); the exact road time always comes from
// the live Maps links.

import { eachDate, estimateTravelMinutes, kmBetween, lodgingForNight, sortDayActivities, type ItinActivity, type Itinerary } from "@/data/itinerary";
import { coordinatesToPoint } from "@/data/route-utils";

const USABLE_DAY_MINS = 14 * 60;
const DEFAULT_ACTIVITY_MINS = 90;

const located = (a: ItinActivity) => Boolean(coordinatesToPoint(a.coordinates));
const stopMins = (a: ItinActivity) => a.durationMins ?? DEFAULT_ACTIVITY_MINS;

/** Where a day begins: last night's lodging, else that day's first fixed stop. */
function dayAnchor(itin: Itinerary, dates: string[], index: number): string | undefined {
  const prevNight = index > 0 ? lodgingForNight(itin, dates[index - 1]) : null;
  if (prevNight?.coordinates) return prevNight.coordinates;
  return lodgingForNight(itin, dates[index])?.coordinates;
}

/** Order one day's stops into the shortest run from the day's starting point. */
export function orderDay(acts: ItinActivity[], anchor?: string): ItinActivity[] {
  // Stops with a clock time are commitments — keep them in time order and let
  // the untimed ones fill in around them.
  const timed = acts.filter((a) => a.startTime).sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  const untimed = acts.filter((a) => !a.startTime);
  const routable = untimed.filter(located);
  const unlocated = untimed.filter((a) => !located(a));

  const ordered: ItinActivity[] = [];
  let cursor = anchor ?? timed[0]?.coordinates ?? routable[0]?.coordinates;
  const pool = [...routable];
  while (pool.length) {
    let bestIndex = 0;
    let bestKm = Number.POSITIVE_INFINITY;
    pool.forEach((candidate, i) => {
      const km = kmBetween(cursor, candidate.coordinates);
      if (km !== null && km < bestKm) {
        bestKm = km;
        bestIndex = i;
      }
    });
    const next = pool.splice(bestIndex, 1)[0];
    ordered.push(next);
    cursor = next.coordinates ?? cursor;
  }

  // Timed stops first (they anchor the day), then the shortest run, then any
  // stop we could not place geographically.
  return [...timed, ...ordered, ...unlocated];
}

/** Total straight-line driving minutes for a day, including the start anchor. */
function dayTravelMins(acts: ItinActivity[], anchor?: string): number {
  let total = 0;
  let cursor = anchor;
  for (const a of acts) {
    if (cursor) total += estimateTravelMinutes(kmBetween(cursor, a.coordinates)) ?? 0;
    cursor = a.coordinates ?? cursor;
  }
  return total;
}

export type PlanResult = {
  itinerary: Itinerary;
  placed: number; // undated stops given a day
  unplaceable: ItinActivity[]; // stops with no location, left unscheduled
  reordered: boolean;
};

/**
 * Plan the whole trip: keep every dated stop on its date, place the undated
 * ones on the day that adds the least driving, and order each day fastest-first.
 */
export function planRoute(itin: Itinerary): PlanResult {
  const dates = eachDate(itin.startDate, itin.endDate);
  if (!dates.length) return { itinerary: itin, placed: 0, unplaceable: [], reordered: false };

  // Dated stops are fixed — the traveler chose that date deliberately.
  const byDate = new Map<string, ItinActivity[]>();
  dates.forEach((d) => byDate.set(d, []));
  const floating: ItinActivity[] = [];
  for (const a of itin.activities) {
    if (a.date && byDate.has(a.date)) byDate.get(a.date)!.push(a);
    else floating.push(a);
  }

  // Place each floating stop on the day where it adds the least driving and
  // still fits the day. Stops with no location can't be placed geographically.
  const unplaceable: ItinActivity[] = [];
  const placeable = floating.filter(located);
  unplaceable.push(...floating.filter((a) => !located(a)));

  // Longest-first tends to give a better greedy result than arbitrary order.
  placeable.sort((a, b) => stopMins(b) - stopMins(a));

  let placed = 0;
  for (const stop of placeable) {
    let bestDate: string | null = null;
    let bestCost = Number.POSITIVE_INFINITY;
    dates.forEach((date, index) => {
      const current = byDate.get(date)!;
      const anchor = dayAnchor(itin, dates, index);
      const busyMins = current.reduce((s, a) => s + stopMins(a), 0) + dayTravelMins(orderDay(current, anchor), anchor);
      const withStop = orderDay([...current, stop], anchor);
      const nextMins = current.reduce((s, a) => s + stopMins(a), 0) + stopMins(stop) + dayTravelMins(withStop, anchor);
      if (nextMins > USABLE_DAY_MINS) return; // would overfill the day
      const added = nextMins - busyMins;
      if (added < bestCost) {
        bestCost = added;
        bestDate = date;
      }
    });
    if (bestDate) {
      byDate.get(bestDate)!.push({ ...stop, date: bestDate });
      placed += 1;
    } else {
      unplaceable.push(stop); // every day is already full
    }
  }

  // Order each day into the fastest run and stamp the positions.
  const activities: ItinActivity[] = [];
  dates.forEach((date, index) => {
    const ordered = orderDay(byDate.get(date)!, dayAnchor(itin, dates, index));
    ordered.forEach((a, i) => activities.push({ ...a, date, order: i }));
  });
  // Anything we could not place keeps its place in the trip, still unscheduled.
  unplaceable.forEach((a) => activities.push({ ...a, date: "", order: undefined }));

  return { itinerary: { ...itin, activities }, placed, unplaceable, reordered: true };
}

/** Move one stop up or down within its day, rewriting that day's positions. */
export function moveStop(itin: Itinerary, id: string, direction: -1 | 1): Itinerary {
  const target = itin.activities.find((a) => a.id === id);
  if (!target) return itin;
  const dayStops = sortDayActivities(itin.activities.filter((a) => a.date === target.date));
  const from = dayStops.findIndex((a) => a.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= dayStops.length) return itin;
  const reordered = [...dayStops];
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
  const positions = new Map(reordered.map((a, i) => [a.id, i]));
  return {
    ...itin,
    // Hand-ordering wins over clock time, so clear a time that would fight it.
    activities: itin.activities.map((a) => (positions.has(a.id) ? { ...a, order: positions.get(a.id) } : a)),
  };
}
