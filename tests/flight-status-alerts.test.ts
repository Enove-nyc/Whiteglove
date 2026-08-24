import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { alertsFromItineraryDiff, alertsFromStatusChange, type FlightStatusSnapshot } from "@/data/trip-alerts";
import { emptyItinerary, type Itinerary } from "@/data/itinerary";

let seq = 0;
const idFor = () => `alert-${++seq}`;

function snapshot(overrides: Partial<FlightStatusSnapshot> = {}): FlightStatusSnapshot {
  return { flightId: "f1", status: "on-time", checkedAt: "2026-06-01T10:00:00.000Z", ...overrides };
}

describe("do not flood Changes with insignificant updates", () => {
  it("a first-ever on-time reading is not an alert — nothing changed from anything", () => {
    assert.deepEqual(alertsFromStatusChange("LY1", undefined, snapshot(), idFor), []);
  });

  it("a delay under the significant threshold is not an alert", () => {
    const next = snapshot({ status: "delayed", delayMinutes: 15 });
    assert.deepEqual(alertsFromStatusChange("LY1", undefined, next, idFor), []);
  });

  it("re-reading the exact same delay again is not a second alert", () => {
    const previous = snapshot({ status: "delayed", delayMinutes: 45 });
    const next = snapshot({ status: "delayed", delayMinutes: 45, checkedAt: "2026-06-01T13:00:00.000Z" });
    assert.deepEqual(alertsFromStatusChange("LY1", previous, next, idFor), []);
  });

  it("a same-status recheck with no real change produces nothing", () => {
    const previous = snapshot();
    const next = snapshot({ checkedAt: "2026-06-01T11:00:00.000Z" });
    assert.deepEqual(alertsFromStatusChange("LY1", previous, next, idFor), []);
  });
});

describe("what does count as worth telling somebody about", () => {
  it("a delay at or past the threshold is an alert", () => {
    const next = snapshot({ status: "delayed", delayMinutes: 30 });
    const alerts = alertsFromStatusChange("LY1", undefined, next, idFor);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, "flight_delay");
    assert.match(alerts[0].note, /30 minutes/);
  });

  it("a delay that grows past the threshold again is a new alert", () => {
    const previous = snapshot({ status: "delayed", delayMinutes: 40 });
    const next = snapshot({ status: "delayed", delayMinutes: 90, checkedAt: "2026-06-01T12:00:00.000Z" });
    const alerts = alertsFromStatusChange("LY1", previous, next, idFor);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].note, /90 minutes/);
  });

  it("cancellation is always an alert, no matter the delay", () => {
    const next = snapshot({ status: "cancelled" });
    const alerts = alertsFromStatusChange("LY1", undefined, next, idFor);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, "flight_cancelled");
  });

  it("a cancellation already known is not repeated", () => {
    const previous = snapshot({ status: "cancelled" });
    const next = snapshot({ status: "cancelled", checkedAt: "2026-06-01T11:00:00.000Z" });
    assert.deepEqual(alertsFromStatusChange("LY1", previous, next, idFor), []);
  });

  it("diversion is always an alert", () => {
    const next = snapshot({ status: "diverted" });
    assert.equal(alertsFromStatusChange("LY1", undefined, next, idFor)[0].kind, "flight_diverted");
  });

  it("a real gate change, once the gate was already known, is an alert", () => {
    const previous = snapshot({ departureGate: "12" });
    const next = snapshot({ departureGate: "22", checkedAt: "2026-06-01T11:00:00.000Z" });
    const alerts = alertsFromStatusChange("LY1", previous, next, idFor);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, "gate_change");
  });

  it("a gate appearing for the first time is not a 'change' — there was nothing to change from", () => {
    const previous = snapshot({});
    const next = snapshot({ departureGate: "22", checkedAt: "2026-06-01T11:00:00.000Z" });
    assert.deepEqual(alertsFromStatusChange("LY1", previous, next, idFor), []);
  });

  it("a real terminal change is its own alert", () => {
    const previous = snapshot({ departureTerminal: "1" });
    const next = snapshot({ departureTerminal: "3", checkedAt: "2026-06-01T11:00:00.000Z" });
    assert.equal(alertsFromStatusChange("LY1", previous, next, idFor)[0].kind, "terminal_change");
  });

  it("every new alert starts unacknowledged", () => {
    const next = snapshot({ status: "cancelled" });
    assert.equal(alertsFromStatusChange("LY1", undefined, next, idFor)[0].acknowledged, false);
  });
});

describe("the live-travel-information wiring keeps the same fences everything else does", () => {
  const STORE = readFileSync("lib/account-store.ts", "utf8");
  const STATUS = readFileSync("lib/flight-status.ts", "utf8");
  const ALERTS_ROUTE = readFileSync("app/api/account/alerts/route.ts", "utf8");
  const APP = readFileSync("components/companion/CompanionApp.tsx", "utf8");

  it("a flight check is throttled — it does not re-query a flight checked recently", () => {
    const fn = STORE.slice(STORE.indexOf("export async function checkTripFlightStatus"), STORE.indexOf("export async function getTripAlerts"));
    assert.match(fn, /FLIGHT_RECHECK_MS/);
  });

  it("only checks flights departing soon, not the whole itinerary regardless of date", () => {
    const fn = STORE.slice(STORE.indexOf("export async function checkTripFlightStatus"), STORE.indexOf("export async function getTripAlerts"));
    assert.match(fn, /FLIGHT_CHECK_WINDOW_DAYS/);
  });

  it("never invents a status the provider did not actually report", () => {
    assert.match(STATUS, /return raw \? "unknown" : "unknown"|: "unknown"/);
    assert.doesNotMatch(STATUS, /status: "delayed"(?!.*mapStatus)/); // never hand-set a status outside mapStatus's own mapping
  });

  it("delay minutes are only ever a real difference between two real timestamps, never estimated", () => {
    assert.match(STATUS, /revised > scheduled \? revised - scheduled : undefined/);
  });

  it("dismissing an alert is gated to the signed-in owner, and checks same-origin first", () => {
    assert.match(ALERTS_ROUTE, /sameOrigin/);
    assert.match(ALERTS_ROUTE, /Please log in first/);
    assert.ok(ALERTS_ROUTE.indexOf("sameOrigin") < ALERTS_ROUTE.indexOf("Please log in first"));
  });

  it("a client viewer never gets the Dismiss control — only the trip's own side does", () => {
    const marker = APP.indexOf("[...liveAlerts].reverse()");
    const block = APP.slice(marker, marker + 1500);
    assert.match(block, /!isClientViewer && !a\.acknowledged/);
  });

  it("still does not add a sixth tab for live alerts — they live on the existing Changes screen", () => {
    const tabsBlock = APP.slice(APP.indexOf("const tabs ="), APP.indexOf("const tabs =") + 600);
    assert.doesNotMatch(tabsBlock, /"alertsLive"|"liveAlerts"/);
  });
});

describe("\"What Changed?\" — diffing an advisor's own edit", () => {
  let seq2 = 0;
  const idFor2 = () => `change-${++seq2}`;

  function itin(over: Partial<Itinerary> = {}): Itinerary {
    return { ...emptyItinerary(), ...over };
  }

  it("says nothing the first time a flight is entered — there is nothing to change from", () => {
    const next = itin({ flights: [{ id: "f1", from: "JFK", to: "WAW", date: "2026-06-10", departTime: "10:00" }] });
    assert.deepEqual(alertsFromItineraryDiff(itin(), next, idFor2), []);
  });

  it("a flight's date or time moving, once it already had one, is an alert", () => {
    const previous = itin({ flights: [{ id: "f1", from: "JFK", to: "WAW", date: "2026-06-10", departTime: "10:00" }] });
    const next = itin({ flights: [{ id: "f1", from: "JFK", to: "WAW", date: "2026-06-10", departTime: "14:30" }] });
    const alerts = alertsFromItineraryDiff(previous, next, idFor2);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, "flight_time_changed");
    assert.match(alerts[0].note, /14:30/);
  });

  it("a scheduled flight disappearing is an alert", () => {
    const previous = itin({ flights: [{ id: "f1", from: "JFK", to: "WAW", date: "2026-06-10", departTime: "10:00" }] });
    const alerts = alertsFromItineraryDiff(previous, itin(), idFor2);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, "flight_removed");
  });

  it("a stop added that was never there before is ordinary trip-building, not a change", () => {
    const next = itin({ activities: [{ id: "a1", name: "Old Town", date: "2026-06-11" }] });
    assert.deepEqual(alertsFromItineraryDiff(itin(), next, idFor2), []);
  });

  it("a scheduled stop moving to a new date is an alert", () => {
    const previous = itin({ activities: [{ id: "a1", name: "Old Town", date: "2026-06-11" }] });
    const next = itin({ activities: [{ id: "a1", name: "Old Town", date: "2026-06-12" }] });
    const alerts = alertsFromItineraryDiff(previous, next, idFor2);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, "activity_time_changed");
  });

  it("a hotel's check-in date changing, once it had one, is an alert", () => {
    const previous = itin({ lodging: [{ id: "l1", type: "hotel", name: "Hotel Bristol", checkIn: "2026-06-10", checkOut: "2026-06-12" }] });
    const next = itin({ lodging: [{ id: "l1", type: "hotel", name: "Hotel Bristol", checkIn: "2026-06-11", checkOut: "2026-06-12" }] });
    const alerts = alertsFromItineraryDiff(previous, next, idFor2);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, "lodging_changed");
  });

  it("re-saving with nothing actually different produces nothing", () => {
    const same = itin({
      flights: [{ id: "f1", from: "JFK", to: "WAW", date: "2026-06-10", departTime: "10:00" }],
      lodging: [{ id: "l1", type: "hotel", name: "Hotel Bristol", checkIn: "2026-06-10", checkOut: "2026-06-12" }],
      activities: [{ id: "a1", name: "Old Town", date: "2026-06-11" }],
    });
    assert.deepEqual(alertsFromItineraryDiff(same, { ...same }, idFor2), []);
  });
});
