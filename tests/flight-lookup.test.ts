import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { parseLocal } from "../lib/flight-lookup";
import { flightArrivalDate, readOvernightFlight, type ItinFlight } from "../data/itinerary";

// Looking a flight up is only worth having if the times come back right. A
// wrong destination or a wrong landing day puts the traveler on the wrong page
// of their own itinerary and asks for a hotel in a city they never leave the
// airport of.
//
// This used to test readAmadeusFlight, which read Amadeus's multi-point
// schedule shape. Amadeus is gone — see app/api/flights/lookup/route.ts — so
// what is exercised here is the shape AeroDataBox actually returns: one leg,
// a scheduled local time at each end.

/** What the route does with an AeroDataBox leg, in the two lines that matter. */
function readLeg(from: string, to: string, departLocal: string, arriveLocal: string) {
  const dep = parseLocal(departLocal)!;
  const arr = parseLocal(arriveLocal)!;
  return {
    from,
    to,
    date: dep.date,
    departTime: dep.time,
    arriveTime: arr.time,
    arriveDate: arr.date > dep.date ? arr.date : "",
  };
}

describe("reading the times off a leg", () => {
  test("a daytime hop lands the day it left", () => {
    const f = readLeg("TLV", "KRK", "2026-08-11T09:00:00+03:00", "2026-08-11T12:20:00+02:00");
    assert.equal(f.date, "2026-08-11");
    assert.equal(f.departTime, "09:00");
    assert.equal(f.arriveTime, "12:20");
    // Empty means "same day". The planner works the rest out from the times.
    assert.equal(f.arriveDate, "");
  });

  test("a red-eye is marked as landing on the next day", () => {
    const f = readLeg("JFK", "TLV", "2026-08-11T23:40:00-04:00", "2026-08-12T17:15:00+03:00");
    assert.equal(f.date, "2026-08-11");
    assert.equal(f.arriveDate, "2026-08-12");
  });

  test("the local clock is read as written, not converted", () => {
    // Both ends are local to their own airport. Turning either into UTC would
    // show a traveler a departure time no board anywhere is displaying.
    const f = readLeg("SFO", "SIN", "2026-08-20T22:50:00-07:00", "2026-08-22T06:15:00+08:00");
    assert.equal(f.departTime, "22:50");
    assert.equal(f.arriveTime, "06:15");
    assert.equal(f.arriveDate, "2026-08-22");
  });
});

describe("what the planner then makes of it", () => {
  // The lookup and the planner have to agree, or the flight lands on one page
  // and the day card is drawn on another.
  const asItinFlight = (f: ReturnType<typeof readLeg>): ItinFlight => ({
    id: "f",
    from: f.from,
    to: f.to,
    date: f.date,
    departTime: f.departTime,
    arriveTime: f.arriveTime,
    arriveDate: f.arriveDate || undefined,
    stops: [],
  });

  test("a looked-up red-eye reads as an overnight in the planner", () => {
    const flight = asItinFlight(readLeg("JFK", "TLV", "2026-08-11T23:40:00-04:00", "2026-08-12T17:15:00+03:00"));
    assert.equal(flightArrivalDate(flight), "2026-08-12");
    assert.equal(readOvernightFlight(flight).overnight, true);
  });

  test("a looked-up daytime flight is not called an overnight", () => {
    const flight = asItinFlight(readLeg("TLV", "KRK", "2026-08-11T09:00:00+03:00", "2026-08-11T12:20:00+02:00"));
    assert.equal(flightArrivalDate(flight), "2026-08-11");
    assert.equal(readOvernightFlight(flight).overnight, false);
  });
});

describe("nothing usable", () => {
  test("an unreadable timestamp fills nothing in rather than guessing", () => {
    assert.equal(parseLocal("tomorrow"), null);
    assert.equal(parseLocal(undefined), null);
    assert.equal(parseLocal(""), null);
  });
});

describe("reading the pieces", () => {
  test("a local timestamp splits into a date and a clock time", () => {
    assert.deepEqual(parseLocal("2026-08-11T23:40:00-04:00"), { date: "2026-08-11", time: "23:40" });
    assert.deepEqual(parseLocal("2026-08-11 23:40+03:00"), { date: "2026-08-11", time: "23:40" });
  });
});
