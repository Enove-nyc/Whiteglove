import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { flightArrivalDate, readOvernightFlight, type ItinFlight } from "../data/itinerary";

// Almost nobody fills in an arrival date, and most flights to Poland or Israel
// land the morning after they leave. Read that wrong and the plan puts the
// landing on the day before it happens, asks for a hotel on a night spent in
// the air, and shows an empty day that was really spent flying.

const flight = (over: Partial<ItinFlight>): ItinFlight => ({
  id: "f",
  from: "JFK",
  to: "WAW",
  date: "2026-08-11",
  ...over,
});

describe("a flight that crosses the night", () => {
  test("landing earlier in the clock than it left means the next day", () => {
    const f = flight({ departTime: "22:40", arriveTime: "12:15" });
    const reading = readOvernightFlight(f);
    assert.equal(reading.arrivalDate, "2026-08-12");
    assert.equal(reading.overnight, true);
    assert.equal(reading.detected, true);
    assert.equal(flightArrivalDate(f), "2026-08-12");
  });

  test("says why, in words a traveler can check", () => {
    const reading = readOvernightFlight(flight({ departTime: "22:40", arriveTime: "12:15" }));
    assert.match(reading.note ?? "", /22:40/);
    assert.match(reading.note ?? "", /12:15/);
  });

  test("a late departure with no landing time is still a night in the air", () => {
    // But the landing day is left alone: we know the night is spent aboard,
    // not which day it ends, and a guessed date lands on the wrong page.
    const reading = readOvernightFlight(flight({ departTime: "23:30" }));
    assert.equal(reading.overnight, true);
    assert.equal(reading.arrivalDate, "2026-08-11");
    assert.match(reading.note ?? "", /add the landing time/i);
  });

  test("a connection held past eight hours counts as the night", () => {
    const reading = readOvernightFlight(
      flight({ departTime: "16:00", arriveTime: "14:00", stops: [{ airport: "CDG", arriveTime: "20:00", departTime: "09:00" }] }),
    );
    assert.equal(reading.overnight, true);
    assert.equal(reading.arrivalDate, "2026-08-12");
    assert.match(reading.note ?? "", /CDG/);
  });

  test("a short connection is not a night", () => {
    const reading = readOvernightFlight(
      flight({ departTime: "08:00", arriveTime: "18:00", stops: [{ airport: "CDG", arriveTime: "12:00", departTime: "14:00" }] }),
    );
    assert.equal(reading.overnight, false);
    assert.equal(reading.arrivalDate, "2026-08-11");
  });
});

describe("a flight that does not", () => {
  test("a daytime flight lands the day it left", () => {
    const reading = readOvernightFlight(flight({ departTime: "09:15", arriveTime: "13:40" }));
    assert.equal(reading.overnight, false);
    assert.equal(reading.arrivalDate, "2026-08-11");
    assert.equal(reading.note, undefined);
  });

  test("no times at all says nothing rather than guessing", () => {
    const reading = readOvernightFlight(flight({}));
    assert.equal(reading.overnight, false);
    assert.equal(reading.note, undefined);
  });
});

describe("what the traveler said wins", () => {
  test("an arrival date they typed is used, and not called a detection", () => {
    // They may know something we do not — a diversion, a date-line crossing,
    // a schedule change. Working it out is a fallback, never an override.
    const reading = readOvernightFlight(flight({ departTime: "09:00", arriveTime: "17:00", arriveDate: "2026-08-13" }));
    assert.equal(reading.arrivalDate, "2026-08-13");
    assert.equal(reading.detected, false);
    assert.match(reading.note ?? "", /you have said/i);
  });
});
