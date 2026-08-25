import type { ItinActivity, Itinerary } from "@/data/itinerary";

/**
 * What an editor may do to somebody else's trip, as pure rules.
 *
 * WHY A ROLE THAT WORKED HAD NOTHING TO WORK WITH. "Can edit" has existed for
 * a while: the sharing screen offers it, the server honours it, and
 * app/api/account/itinerary/shared enforces it properly. Nothing in the site
 * ever called that endpoint. So somebody granted edit was told "you can change
 * it" and handed the same read-only page a viewer gets, which is a promise the
 * site did not keep.
 *
 * STOPS, NOT BOOKINGS. An editor moves the day around: the kevarim, the
 * towns, the things to do. Flights and where everybody is sleeping stay with
 * the owner, and the panel says so rather than leaving somebody to discover
 * it. That is not a limitation of the endpoint — it would take any itinerary —
 * it is a decision about what a person helping plan a trip should be able to
 * do to a booking somebody else has paid for.
 *
 * EVERY FUNCTION RETURNS A NEW LIST. Nothing here mutates what it was given,
 * so a failed save leaves the editor's screen exactly as it was rather than
 * showing changes that were never stored.
 */

/** Stops on one day, in the order they happen. */
export type EditableDay = { date: string; stops: ItinActivity[] };

/** Undated stops are kept together under this, and never dropped. */
export const NO_DATE = "";

/**
 * The trip's stops grouped by day, each day in order.
 *
 * Sorted by `order` where it is set, then by time, then by the order they were
 * already in — so a list where nobody has ever reordered anything still comes
 * back the way the owner sees it rather than shuffled by a missing field.
 */
export function daysOf(itinerary: Itinerary): EditableDay[] {
  const byDate = new Map<string, ItinActivity[]>();
  for (const stop of itinerary.activities ?? []) {
    const key = stop.date?.trim() || NO_DATE;
    byDate.set(key, [...(byDate.get(key) ?? []), stop]);
  }
  const dates = [...byDate.keys()].sort((a, b) => {
    // Undated last: they are the ones still to be placed, not the ones first.
    if (a === NO_DATE) return 1;
    if (b === NO_DATE) return -1;
    return a.localeCompare(b);
  });
  return dates.map((date) => ({
    date,
    stops: [...(byDate.get(date) ?? [])].sort(compareStops),
  }));
}

function compareStops(a: ItinActivity, b: ItinActivity): number {
  const orderA = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
  const orderB = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA - orderB;
  const timeA = a.startTime?.trim() || "99:99";
  const timeB = b.startTime?.trim() || "99:99";
  return timeA.localeCompare(timeB);
}

/**
 * Write the days back into the itinerary, stamping each stop's position.
 *
 * `order` is set from the position in the list rather than left alone, because
 * that is the only thing that makes a reorder survive a save — two stops with
 * no order at all come back sorted by time, which is exactly what somebody was
 * overriding when they moved one.
 */
export function withDays(itinerary: Itinerary, days: readonly EditableDay[]): Itinerary {
  const activities = days.flatMap((day) =>
    day.stops.map((stop, index) => ({ ...stop, date: day.date, order: index })),
  );
  return { ...itinerary, activities };
}

/** Move a stop one place earlier or later within its own day. */
export function moveWithinDay(days: readonly EditableDay[], date: string, id: string, delta: -1 | 1): EditableDay[] {
  return days.map((day) => {
    if (day.date !== date) return day;
    const index = day.stops.findIndex((stop) => stop.id === id);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= day.stops.length) return day;
    const stops = [...day.stops];
    [stops[index], stops[target]] = [stops[target], stops[index]];
    return { ...day, stops };
  });
}

/**
 * Move a stop to another day, onto the end of it.
 *
 * The day it lands on must already exist, so a stop cannot be sent to a date
 * outside the trip by a mistyped value. Moving to the day it is already on is
 * a no-op rather than a removal.
 */
export function moveToDay(days: readonly EditableDay[], id: string, toDate: string): EditableDay[] {
  const from = days.find((day) => day.stops.some((stop) => stop.id === id));
  if (!from || from.date === toDate) return [...days];
  if (!days.some((day) => day.date === toDate)) return [...days];
  const stop = from.stops.find((entry) => entry.id === id);
  if (!stop) return [...days];
  return days.map((day) => {
    if (day.date === from.date) return { ...day, stops: day.stops.filter((entry) => entry.id !== id) };
    if (day.date === toDate) return { ...day, stops: [...day.stops, { ...stop, date: toDate }] };
    return day;
  });
}

/** Change the three fields an editor may touch. Anything else is left alone. */
export function editStop(
  days: readonly EditableDay[],
  id: string,
  fields: { name?: string; startTime?: string; notes?: string },
): EditableDay[] {
  return days.map((day) => ({
    ...day,
    stops: day.stops.map((stop) =>
      stop.id === id
        ? {
            ...stop,
            ...(fields.name !== undefined ? { name: fields.name } : {}),
            // An emptied time is removed rather than stored as "", so a stop
            // with no time behaves like one that never had one.
            ...(fields.startTime !== undefined ? { startTime: fields.startTime.trim() || undefined } : {}),
            ...(fields.notes !== undefined ? { notes: fields.notes.trim() || undefined } : {}),
          }
        : stop,
    ),
  }));
}

export function removeStop(days: readonly EditableDay[], id: string): EditableDay[] {
  return days.map((day) => ({ ...day, stops: day.stops.filter((stop) => stop.id !== id) }));
}

/**
 * Add a stop to a day.
 *
 * The id carries where it came from. A stop added by a collaborator is not
 * different from any other in what it does, but the owner opening their own
 * planner should be able to tell that somebody else put it there, and an id
 * is the one field that survives every round trip.
 */
export function addStop(days: readonly EditableDay[], date: string, name: string, id: string): EditableDay[] {
  const clean = name.trim();
  if (!clean) return [...days];
  if (!days.some((day) => day.date === date)) return [...days];
  return days.map((day) =>
    day.date === date ? { ...day, stops: [...day.stops, { id, name: clean, date } as ItinActivity] } : day,
  );
}

/** A new stop's id, so one editor's addition cannot collide with another's. */
export function newStopId(random: () => string): string {
  return `shared-${random()}`;
}

/**
 * What changed, as a sentence.
 *
 * Shown before saving, because an editor is changing somebody ELSE's trip and
 * ought to see what they are about to do to it in words rather than only as a
 * screen they have been clicking around.
 */
export function describeEdits(before: Itinerary, after: Itinerary): string {
  const was = before.activities ?? [];
  const now = after.activities ?? [];
  const wasIds = new Set(was.map((stop) => stop.id));
  const nowIds = new Set(now.map((stop) => stop.id));
  const added = now.filter((stop) => !wasIds.has(stop.id)).length;
  const removed = was.filter((stop) => !nowIds.has(stop.id)).length;

  /**
   * WHERE A STOP SITS, NOT WHAT ITS ORDER FIELD SAYS.
   *
   * withDays stamps `order` on every stop, because that is the only thing that
   * makes a reorder survive a save. Comparing the raw field therefore reported
   * a move for every stop that had never had one — so opening the panel and
   * touching nothing said "1 moved" and offered a save, which is both untrue
   * and a needless write to somebody else's trip.
   *
   * Both sides are read through daysOf, so the comparison is like for like:
   * which day a stop is on, and where in that day it comes.
   */
  const placeOf = (itinerary: Itinerary) => {
    const places = new Map<string, string>();
    for (const day of daysOf(itinerary)) {
      day.stops.forEach((stop, index) => places.set(stop.id, `${day.date}#${index}`));
    }
    return places;
  };
  const wasPlace = placeOf(before);
  const nowPlace = placeOf(after);

  const byId = new Map(was.map((stop) => [stop.id, stop]));
  let changed = 0;
  let moved = 0;
  for (const stop of now) {
    const old = byId.get(stop.id);
    if (!old) continue;
    if (old.name !== stop.name || old.startTime !== stop.startTime || old.notes !== stop.notes) changed += 1;
    else if (wasPlace.get(stop.id) !== nowPlace.get(stop.id)) moved += 1;
  }

  const parts = [
    added ? `${added} stop${added === 1 ? "" : "s"} added` : null,
    removed ? `${removed} removed` : null,
    changed ? `${changed} changed` : null,
    moved ? `${moved} moved` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "Nothing changed yet";
}
