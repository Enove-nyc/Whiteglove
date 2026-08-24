// Live travel information — a flight's real status, and the trip alerts that
// come out of a meaningful change in it. Pure data model + pure transforms,
// the same discipline every other data/*.ts file here keeps.
//
// DO NOT FLOOD CHANGES WITH INSIGNIFICANT UPDATES. alertsFromStatusChange
// below is the one place that decides what counts as worth telling somebody
// about — a flight going from "scheduled" to "on-time" is not news; a 30+
// minute delay, a cancellation, or an actual gate/terminal change is.

import { flightRouteLabel, type Itinerary } from "@/data/itinerary";

export type FlightStatusValue = "scheduled" | "on-time" | "delayed" | "cancelled" | "diverted" | "departed" | "landed" | "unknown";

/** What was last read from the flight-status provider for one flight. */
export type FlightStatusSnapshot = {
  flightId: string;
  status: FlightStatusValue;
  departureGate?: string;
  departureTerminal?: string;
  arrivalGate?: string;
  arrivalTerminal?: string;
  /** Minutes late against the scheduled departure; absent/0 means on time. */
  delayMinutes?: number;
  checkedAt: string; // ISO timestamp
};

export type TripAlertKind =
  | "flight_delay"
  | "flight_cancelled"
  | "flight_diverted"
  | "gate_change"
  | "terminal_change"
  | "flight_time_changed"
  | "flight_removed"
  | "lodging_changed"
  | "lodging_removed"
  | "activity_time_changed"
  | "activity_removed";

export type TripAlert = {
  id: string;
  kind: TripAlertKind;
  /** The flight, lodging or activity this is about — whichever the kind names. */
  flightId: string;
  title: string;
  note: string;
  createdAt: string; // ISO timestamp
  acknowledged: boolean;
};

/** Below this, a delay is not worth an alert — see the file note above. */
const SIGNIFICANT_DELAY_MINUTES = 30;

/**
 * What changed between two readings of the same flight's status, worth
 * telling somebody about. Returns an empty array for "nothing significant
 * changed" — a same-status recheck, or a delay under the threshold, is not
 * silently upgraded into an alert just because it is now known.
 */
export function alertsFromStatusChange(
  flightLabel: string,
  previous: FlightStatusSnapshot | undefined,
  next: FlightStatusSnapshot,
  idFor: () => string,
): TripAlert[] {
  const out: TripAlert[] = [];
  const now = next.checkedAt;

  if (next.status === "cancelled" && previous?.status !== "cancelled") {
    out.push({ id: idFor(), kind: "flight_cancelled", flightId: next.flightId, title: `${flightLabel} cancelled`, note: "The airline has cancelled this flight.", createdAt: now, acknowledged: false });
  } else if (next.status === "diverted" && previous?.status !== "diverted") {
    out.push({ id: idFor(), kind: "flight_diverted", flightId: next.flightId, title: `${flightLabel} diverted`, note: "This flight has been diverted from its original destination.", createdAt: now, acknowledged: false });
  } else if ((next.delayMinutes ?? 0) >= SIGNIFICANT_DELAY_MINUTES && (next.delayMinutes ?? 0) !== (previous?.delayMinutes ?? 0)) {
    out.push({
      id: idFor(),
      kind: "flight_delay",
      flightId: next.flightId,
      title: `${flightLabel} delayed`,
      note: `Now running about ${next.delayMinutes} minutes late.`,
      createdAt: now,
      acknowledged: false,
    });
  }

  if (next.departureGate && previous?.departureGate && next.departureGate !== previous.departureGate) {
    out.push({ id: idFor(), kind: "gate_change", flightId: next.flightId, title: `${flightLabel} gate changed`, note: `Now departing from gate ${next.departureGate}.`, createdAt: now, acknowledged: false });
  }
  if (next.departureTerminal && previous?.departureTerminal && next.departureTerminal !== previous.departureTerminal) {
    out.push({ id: idFor(), kind: "terminal_change", flightId: next.flightId, title: `${flightLabel} terminal changed`, note: `Now departing from terminal ${next.departureTerminal}.`, createdAt: now, acknowledged: false });
  }

  return out;
}

/**
 * "What Changed?" — the same discipline as alertsFromStatusChange, applied
 * to an advisor's own edits instead of a live flight-status reading.
 *
 * ONLY A CHANGE TO SOMETHING ALREADY SCHEDULED IS NEWS. A stop matched by id
 * between the two itineraries whose date/time moved, or that disappeared
 * outright, is worth telling a traveler about. A brand-new stop being added,
 * or a stop that had no date yet gaining one, is ordinary trip-building —
 * not a change to something the traveler already knew about — so neither is
 * reported here. That is what keeps this from firing on every autosave
 * while a trip is still being put together, long before anyone has seen it.
 */
export function alertsFromItineraryDiff(previous: Itinerary, next: Itinerary, idFor: () => string): TripAlert[] {
  const out: TripAlert[] = [];
  const now = new Date().toISOString();
  const nextFlights = new Map(next.flights.map((f) => [f.id, f]));
  const nextLodging = new Map(next.lodging.map((l) => [l.id, l]));
  const nextActivities = new Map(next.activities.map((a) => [a.id, a]));

  for (const before of previous.flights) {
    const label = flightRouteLabel(before);
    const after = nextFlights.get(before.id);
    if (!after) {
      if (before.date || before.departTime) {
        out.push({ id: idFor(), kind: "flight_removed", flightId: before.id, title: `${label} removed`, note: "This flight is no longer on the itinerary.", createdAt: now, acknowledged: false });
      }
      continue;
    }
    if ((before.date || before.departTime) && (before.date !== after.date || before.departTime !== after.departTime)) {
      const when = [after.date, after.departTime].filter(Boolean).join(" at ");
      out.push({ id: idFor(), kind: "flight_time_changed", flightId: before.id, title: `${label} changed`, note: when ? `Now ${when}.` : "The date or time has changed.", createdAt: now, acknowledged: false });
    }
  }

  for (const before of previous.lodging) {
    const after = nextLodging.get(before.id);
    const label = before.name || "Lodging";
    if (!after) {
      if (before.checkIn) {
        out.push({ id: idFor(), kind: "lodging_removed", flightId: before.id, title: `${label} removed`, note: "This stay is no longer on the itinerary.", createdAt: now, acknowledged: false });
      }
      continue;
    }
    if (before.checkIn && (before.checkIn !== after.checkIn || before.checkOut !== after.checkOut || before.name !== after.name)) {
      out.push({
        id: idFor(),
        kind: "lodging_changed",
        flightId: before.id,
        title: `${after.name || label} updated`,
        note: `Now ${after.checkIn} → ${after.checkOut}.`,
        createdAt: now,
        acknowledged: false,
      });
    }
  }

  for (const before of previous.activities) {
    const after = nextActivities.get(before.id);
    const label = before.name || "Stop";
    if (!after) {
      if (before.date) {
        out.push({ id: idFor(), kind: "activity_removed", flightId: before.id, title: `${label} removed`, note: "This stop is no longer on the itinerary.", createdAt: now, acknowledged: false });
      }
      continue;
    }
    if (before.date && (before.date !== after.date || before.startTime !== after.startTime)) {
      const when = [after.date, after.startTime].filter(Boolean).join(" at ");
      out.push({ id: idFor(), kind: "activity_time_changed", flightId: before.id, title: `${after.name || label} moved`, note: when ? `Now ${when}.` : "The date or time has changed.", createdAt: now, acknowledged: false });
    }
  }

  return out;
}
