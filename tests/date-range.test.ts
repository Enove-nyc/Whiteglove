import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { correctedEnd, earliestEnd, nextDay, rangeIsBackwards } from "../lib/date-range";

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
