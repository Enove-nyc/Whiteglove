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

// There is a third half-rule, added later, and it belongs here for the same
// reason the first two do: a booking cannot start in the past. Nobody flies
// last Tuesday. It is separate from the pair rule above because it applies to
// the START of a range as well as the end, and because it applies only to
// dates that are being BOOKED — an admin recording the day they last checked a
// listing is writing down the past on purpose, and a floor there would be a
// bug rather than a guard. So it is applied at the booking call sites and not
// inside DateField.

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The day after, as YYYY-MM-DD. Returns "" for anything unreadable. */
export function nextDay(date: string): string {
  const m = ISO.exec(date ?? "");
  if (!m) return "";
  // Noon UTC, so a daylight-saving shift cannot move it to the wrong day.
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return new Date(t + 86_400_000).toISOString().slice(0, 10);
}

/** The day before, as YYYY-MM-DD. Returns "" for anything unreadable. */
export function previousDay(date: string): string {
  const m = ISO.exec(date ?? "");
  if (!m) return "";
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return new Date(t - 86_400_000).toISOString().slice(0, 10);
}

/**
 * Today, as a date input spells it.
 *
 * Read off the LOCAL clock rather than `toISOString()`, which is UTC: at nine
 * in the evening in New York the UTC date is already tomorrow, and a floor of
 * tomorrow would refuse a flight leaving today. The date the person can see on
 * their own calendar is the one their booking is against.
 */
export function today(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * A date that can still be booked, or "".
 *
 * Past dates and unreadable values are dropped rather than clamped: sending
 * yesterday to a partner is worse than sending no date, and inventing today
 * would search a trip nobody asked for. Same rule as a remembered hotel
 * search whose check-in has gone (lib/search-memory.ts).
 */
export function usableBookingDate(value: string | undefined, floor: string = today()): string {
  const date = (value ?? "").trim();
  if (!ISO.test(date) || date < floor) return "";
  return date;
}

/**
 * Outbound and return for a partner widget or deep link.
 *
 * If the outbound has gone, the return goes with it — half a range opens the
 * partner on one date and asks for the other. A return before the outbound,
 * or a return that has itself gone, is dropped and the outbound is kept.
 */
export function usableFlightDates(
  depart: string | undefined,
  ret: string | undefined,
  floor: string = today(),
): { departDate: string; returnDate: string } {
  const departDate = usableBookingDate(depart, floor);
  if (!departDate) return { departDate: "", returnDate: "" };
  const returnDate = usableBookingDate(ret, floor);
  if (!returnDate || returnDate < departDate) return { departDate, returnDate: "" };
  return { departDate, returnDate };
}

/**
 * Why these dates cannot be searched, or null.
 *
 * Format and "return before outbound" stay with the caller, which already
 * names those in its own words. This is the floor a picker already applies:
 * nobody flies last Tuesday.
 */
export function flightDateProblem(depart: string, ret?: string, floor: string = today()): string | null {
  if (ISO.test(depart) && depart < floor) return "Departure cannot be in the past.";
  if (ret && ISO.test(ret) && ret < floor) return "Return date cannot be in the past.";
  return null;
}

/**
 * The tightest of several floors, for a `min`.
 *
 * A return date has two: it cannot be before the outbound, and it cannot be in
 * the past. The later of the two is the real one. Undefined entries are floors
 * that do not apply yet — an outbound date nobody has chosen — and are
 * ignored rather than treated as "no restriction at all".
 */
export function notBefore(...floors: Array<string | undefined>): string | undefined {
  let latest: string | undefined;
  for (const floor of floors) {
    if (!floor) continue;
    if (!latest || floor > latest) latest = floor;
  }
  return latest;
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
