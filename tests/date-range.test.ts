import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { correctedEnd, earliestEnd, flightDateProblem, nextDay, notBefore, previousDay, rangeIsBackwards, today, usableBookingDate, usableFlightDates } from "../lib/date-range";

// A trip that ends before it begins builds zero days and says nothing about
// why. These hold the rule that stops it.

describe("the day after", () => {
  test("moves one day on", () => {
    assert.equal(nextDay("2026-08-11"), "2026-08-12");
  });

  test("crosses a month, a year and a leap day without drifting", () => {
    assert.equal(nextDay("2026-08-31"), "2026-09-01");
    assert.equal(nextDay("2026-12-31"), "2027-01-01");
    assert.equal(nextDay("2028-02-28"), "2028-02-29");
    assert.equal(nextDay("2027-02-28"), "2027-03-01");
  });

  test("survives the clocks changing", () => {
    // Worked at noon UTC on purpose: at midnight local, a daylight-saving
    // shift lands the answer on the wrong day.
    assert.equal(nextDay("2026-03-29"), "2026-03-30");
    assert.equal(nextDay("2026-10-25"), "2026-10-26");
  });

  test("says nothing about a date it cannot read", () => {
    assert.equal(nextDay(""), "");
    assert.equal(nextDay("next tuesday"), "");
  });
});

describe("the earliest the end may be", () => {
  test("a trip may start and end the same day", () => {
    assert.equal(earliestEnd("2026-08-11", "inclusive"), "2026-08-11");
  });

  test("a hotel stay may not — a stay of no nights is nothing", () => {
    assert.equal(earliestEnd("2026-08-11", "exclusive"), "2026-08-12");
  });

  test("with no start there is no limit, because people fill forms in any order", () => {
    assert.equal(earliestEnd("", "inclusive"), undefined);
    assert.equal(earliestEnd("nonsense"), undefined);
  });
});

describe("carrying the end along", () => {
  test("an end before the start is pulled forward", () => {
    assert.equal(correctedEnd("2026-08-11", "2026-08-04"), "2026-08-11");
    assert.equal(correctedEnd("2026-08-11", "2026-08-11", "exclusive"), "2026-08-12");
  });

  test("an end that is already fine is left exactly as it is", () => {
    assert.equal(correctedEnd("2026-08-11", "2026-08-20"), "2026-08-20");
    assert.equal(correctedEnd("2026-08-11", "2026-08-11", "inclusive"), "2026-08-11");
  });

  test("an empty end stays empty", () => {
    // Half-way through filling a form is not a mistake, and putting a date on
    // a trip that has none would be worse than leaving it blank.
    assert.equal(correctedEnd("2026-08-11", ""), "");
  });

  test("with no start, the end is left alone", () => {
    assert.equal(correctedEnd("", "2026-08-04"), "2026-08-04");
  });
});

describe("spotting a backwards range", () => {
  test("says so only when it really is backwards", () => {
    assert.equal(rangeIsBackwards("2026-08-11", "2026-08-04"), true);
    assert.equal(rangeIsBackwards("2026-08-11", "2026-08-11"), false);
    assert.equal(rangeIsBackwards("2026-08-11", "2026-08-11", "exclusive"), true);
    assert.equal(rangeIsBackwards("2026-08-11", "2026-08-12", "exclusive"), false);
  });

  test("half-filled is not backwards", () => {
    assert.equal(rangeIsBackwards("", "2026-08-04"), false);
    assert.equal(rangeIsBackwards("2026-08-11", ""), false);
  });
});

describe("today", () => {
  test("is the date on the visitor's own calendar, not UTC's", () => {
    // Nine in the evening in New York is already tomorrow in UTC. A floor
    // built from `toISOString()` would refuse a flight leaving today.
    const evening = new Date(2026, 7, 10, 21, 30);
    assert.equal(today(evening), "2026-08-10");
  });

  test("pads a single-figure month and day", () => {
    assert.equal(today(new Date(2027, 0, 5, 12)), "2027-01-05");
  });
});

describe("the day before", () => {
  test("moves one day back", () => {
    assert.equal(previousDay("2026-08-12"), "2026-08-11");
    assert.equal(previousDay("2026-03-01"), "2026-02-28");
  });
});

describe("a date that can still be booked", () => {
  const floor = "2026-08-12";

  test("keeps today and later, and drops yesterday", () => {
    assert.equal(usableBookingDate("2026-08-12", floor), "2026-08-12");
    assert.equal(usableBookingDate("2026-09-01", floor), "2026-09-01");
    assert.equal(usableBookingDate("2026-08-11", floor), "");
    assert.equal(usableBookingDate("soon", floor), "");
  });

  test("drops both dates when the outbound has gone", () => {
    // Half a range opens the partner on the return and asks for the outbound.
    assert.deepEqual(usableFlightDates("2026-08-01", "2026-09-19", floor), { departDate: "", returnDate: "" });
  });

  test("keeps the outbound and drops a return that is before it", () => {
    assert.deepEqual(usableFlightDates("2026-09-19", "2026-09-12", floor), { departDate: "2026-09-19", returnDate: "" });
  });

  test("keeps a same-day return, which is a real flight", () => {
    assert.deepEqual(usableFlightDates("2026-09-12", "2026-09-12", floor), { departDate: "2026-09-12", returnDate: "2026-09-12" });
  });
});

describe("why a search cannot run", () => {
  test("names a departure that has already passed", () => {
    assert.equal(flightDateProblem("2026-08-11", undefined, "2026-08-12"), "Departure cannot be in the past.");
    assert.equal(flightDateProblem("2026-09-01", undefined, "2026-08-12"), null);
  });
});

describe("the tightest floor", () => {
  test("takes the latest of the ones that apply", () => {
    assert.equal(notBefore("2026-08-10", "2026-09-01"), "2026-09-01");
    assert.equal(notBefore("2026-09-01", "2026-08-10"), "2026-09-01");
  });

  test("ignores the floors that do not apply yet", () => {
    // No outbound chosen, so only today bounds the return.
    assert.equal(notBefore("2026-08-10", undefined), "2026-08-10");
    assert.equal(notBefore(undefined, "2026-08-10"), "2026-08-10");
    assert.equal(notBefore(undefined, undefined), undefined);
  });

  test("a return cannot be before the outbound or in the past, whichever binds", () => {
    const now = "2026-08-10";
    // Outbound in the future: the outbound is the binding floor.
    assert.equal(notBefore(now, earliestEnd("2026-09-01")), "2026-09-01");
    // Outbound left over from a past search: today is what binds.
    assert.equal(notBefore(now, earliestEnd("2026-01-01")), "2026-08-10");
  });
});
