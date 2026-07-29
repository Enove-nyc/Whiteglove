// The end of something cannot come before the start of it.
//
// Every date pair on the site — a trip, a hotel stay, a car hire, an
// advertisement's run — has the same rule, and it was being written out again
// at each one, sometimes half of it and sometimes not at all. A person could
// set a trip ending the week before it began and the planner would quietly
// build zero days.
//
// The rule has two halves, and both are needed:
//
//   1. The picker should not offer an impossible date at all — `min`.
//   2. Moving the start past the end should carry the end along with it,
//      rather than leaving a range that is now backwards.
//
// The second is the one that gets forgotten. `min` only stops somebody typing
// a bad end date; it does nothing when they go back and push the start forward.
//
// Two kinds of range, because "after" means different things:
//
//   inclusive — the end may equal the start. A one-day trip is a real trip,
//               and a flight out and back the same day is a real flight.
//   exclusive — the end must be at least the next day. A hotel stay is a
//               number of nights, and a stay of no nights is nothing.

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The day after, as YYYY-MM-DD. Returns "" for anything unreadable. */
export function nextDay(date: string): string {
  const m = ISO.exec(date ?? "");
  if (!m) return "";
  // Noon UTC, so a daylight-saving shift cannot move it to the wrong day.
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return new Date(t + 86_400_000).toISOString().slice(0, 10);
}

export type RangeKind = "inclusive" | "exclusive";

/**
 * The earliest the end may be, for the `min` attribute.
 *
 * Undefined when there is no start yet — an end date on its own is allowed,
 * because people fill these in in whatever order they like.
 */
export function earliestEnd(start: string, kind: RangeKind = "inclusive"): string | undefined {
  if (!ISO.test(start ?? "")) return undefined;
  return kind === "exclusive" ? nextDay(start) : start;
}

/**
 * What the end date should be once the start is what it is.
 *
 * Returns the end unchanged when it is already fine, and the earliest allowed
 * date when it is not. An empty end stays empty: somebody part-way through
 * filling a form has not made a mistake yet, and filling it in for them would
 * put a date on a trip that has none.
 */
export function correctedEnd(start: string, end: string, kind: RangeKind = "inclusive"): string {
  const earliest = earliestEnd(start, kind);
  if (!earliest) return end;
  if (!ISO.test(end ?? "")) return end;
  return end < earliest ? earliest : end;
}

/** True when this pair is the wrong way round. */
export function rangeIsBackwards(start: string, end: string, kind: RangeKind = "inclusive"): boolean {
  const earliest = earliestEnd(start, kind);
  if (!earliest || !ISO.test(end ?? "")) return false;
  return end < earliest;
}
