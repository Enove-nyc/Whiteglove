import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUILT_IN_LIMITS,
  decidePrint,
  describeLimits,
  describePrints,
  describeTrips,
  limitsFor,
  newTripProblem,
  type PrintEvent,
  printsThisWeek,
  SAME_PRINT_GRACE_MS,
  UNLIMITED,
  WEEK_MS,
  whenIsThat,
} from "@/lib/account-limits";

/**
 * What a plan lets somebody do.
 *
 * THIS IS THE FILE lib/account-plans.ts SAID WOULD HAVE TO BE WRITTEN ON
 * PURPOSE. Its rule was that a plan never decides what anybody can do, and that
 * if it ever did, it would be in one place with the words on the page changed
 * to match. So the tests here are as much about what the limits must NOT do —
 * never reach backwards into trips somebody already has, never refuse a print
 * because a store was unreachable — as about the counting.
 */

const NOW = Date.parse("2026-08-09T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const print = (tripId: string, ms: number): PrintEvent => ({ tripId, at: ago(ms) });
const TRAVELER = BUILT_IN_LIMITS.traveler;

describe("what was asked for", () => {
  it("is two trips and one printable copy a week on a free account", () => {
    assert.equal(TRAVELER.trips, 2);
    assert.equal(TRAVELER.printsPerWeek, 1);
  });

  it("limits nothing on Pro or Business, because nothing was decided about them", () => {
    // An invented number here would be a promise nobody made.
    assert.equal(BUILT_IN_LIMITS.pro.trips, UNLIMITED);
    assert.equal(BUILT_IN_LIMITS.business.printsPerWeek, UNLIMITED);
  });
});

describe("the owner's own numbers", () => {
  it("uses his when he has set one", () => {
    assert.equal(limitsFor("traveler", { traveler: { trips: 5 } }).trips, 5);
  });

  it("keeps the built-in one for anything he did not set", () => {
    assert.equal(limitsFor("traveler", { traveler: { trips: 5 } }).printsPerWeek, 1);
  });

  it("takes a blank as no limit at all", () => {
    assert.equal(limitsFor("traveler", { traveler: { trips: null } }).trips, UNLIMITED);
  });

  it("REFUSES ZERO, which would be a locked account rather than a limit", () => {
    assert.equal(limitsFor("traveler", { traveler: { trips: 0 } }).trips, 2);
    assert.equal(limitsFor("traveler", { traveler: { printsPerWeek: -4 } }).printsPerWeek, 1);
  });

  it("falls back rather than throwing on nonsense", () => {
    assert.equal(limitsFor("traveler", { traveler: { trips: "lots" as never } }).trips, 2);
    assert.equal(limitsFor("traveler", null).trips, 2);
  });
});

describe("starting a trip", () => {
  it("allows the first and the second", () => {
    assert.equal(newTripProblem("traveler", 0, TRAVELER), null);
    assert.equal(newTripProblem("traveler", 1, TRAVELER), null);
  });

  it("refuses the third, and says what to do about it", () => {
    const said = newTripProblem("traveler", 2, TRAVELER);
    assert.match(said!, /2 trips at a time/);
    assert.match(said!, /Delete one/);
    assert.match(said!, /Pro/);
  });

  it("NEVER TAKES AWAY WHAT SOMEBODY ALREADY HAS", () => {
    // Somebody with five trips — made before there was a limit, or after it was
    // lowered — keeps five. Only a SIXTH is refused. Nothing here can close,
    // hide or delete a trip, and this is the test that says so.
    const said = newTripProblem("traveler", 5, TRAVELER);
    assert.match(said!, /you have 5/);
    assert.doesNotMatch(said!, /delet(ed|ing) for you|removed|closed/i);
  });

  it("never gets in the way on a plan with no limit", () => {
    assert.equal(newTripProblem("pro", 400, BUILT_IN_LIMITS.pro), null);
  });

  it("always has something to say about where they stand", () => {
    assert.match(describeTrips(0, TRAVELER), /0 of 2/);
    assert.match(describeTrips(1, TRAVELER), /One more/);
    assert.match(describeTrips(2, TRAVELER), /Delete one/);
    assert.match(describeTrips(9, BUILT_IN_LIMITS.pro), /9 trips/);
  });
});

describe("counting the week", () => {
  it("is a rolling seven days, not a calendar week", () => {
    // Nobody waits until Sunday, and nobody gets two by printing late on
    // Saturday and again on Sunday morning.
    const prints = [print("a", WEEK_MS - 60_000), print("b", WEEK_MS + 60_000)];
    assert.deepEqual(printsThisWeek(prints, NOW).map((p) => p.tripId), ["a"]);
  });

  it("ignores a timestamp it cannot read rather than counting it", () => {
    assert.equal(printsThisWeek([{ tripId: "a", at: "whenever" }], NOW).length, 0);
  });

  it("ignores one dated in the future, which is a clock, not a print", () => {
    assert.equal(printsThisWeek([print("a", -3 * 60 * 60 * 1000)], NOW).length, 0);
  });
});

describe("taking a printable copy", () => {
  const decide = (prints: PrintEvent[], tripId = "trip-1") =>
    decidePrint({ plan: "traveler", limits: TRAVELER, prints, tripId, now: NOW });

  it("allows the first one of the week, and counts it", () => {
    const d = decide([]);
    assert.equal(d.allowed, true);
    assert.equal(d.allowed && d.counted, true);
  });

  it("refuses the second, and says when the next is due", () => {
    const d = decide([print("trip-0", 2 * 24 * 60 * 60 * 1000)]);
    assert.equal(d.allowed, false);
    if (!d.allowed) {
      assert.match(d.message, /1 copy a week/);
      assert.match(d.message, /in 5 days/);
      // And it does not leave them thinking the trip is gone.
      assert.match(d.message, /still here/);
      assert.equal(Date.parse(d.nextAt) - Date.parse(print("trip-0", 2 * 24 * 60 * 60 * 1000).at), WEEK_MS);
    }
  });

  it("DOES NOT CHARGE TWICE FOR THE SAME TRIP REOPENED", () => {
    // A printer jams, a tab closes, a phone locks. Spending a week's allowance
    // on a page nobody got out of the printer reads as a fault, not a rule.
    const d = decide([print("trip-1", 60_000)]);
    assert.equal(d.allowed, true);
    assert.equal(d.allowed && d.counted, false);
  });

  it("does charge for the same trip after the grace window", () => {
    const d = decide([print("trip-1", SAME_PRINT_GRACE_MS + 60_000)]);
    assert.equal(d.allowed, false);
  });

  it("charges for a DIFFERENT trip inside the grace window", () => {
    // Otherwise one allowance would print every trip in the account.
    const d = decide([print("trip-9", 60_000)], "trip-1");
    assert.equal(d.allowed, false);
  });

  it("lets a plan with no limit through every time", () => {
    const d = decidePrint({
      plan: "pro",
      limits: BUILT_IN_LIMITS.pro,
      prints: Array.from({ length: 50 }, (_, i) => print(`t${i}`, i * 1000)),
      tripId: "t99",
      now: NOW,
    });
    assert.equal(d.allowed, true);
  });

  it("counts to a higher limit properly when the owner raises it", () => {
    const limits = { trips: 2, printsPerWeek: 3 };
    const two = [print("a", 1000), print("b", 2000)];
    const d = decidePrint({ plan: "traveler", limits, prints: two, tripId: "c", now: NOW });
    assert.equal(d.allowed, true);
    const three = [...two, print("c", 3000)];
    assert.equal(decidePrint({ plan: "traveler", limits, prints: three, tripId: "d", now: NOW }).allowed, false);
  });
});

describe("how the wait is described", () => {
  it("does not print a time to the minute for somebody to sit and wait for", () => {
    assert.equal(whenIsThat(new Date(NOW + 30 * 60_000).toISOString(), NOW), "within the hour");
    assert.equal(whenIsThat(new Date(NOW + 5 * 3_600_000).toISOString(), NOW), "in 5 hours");
    assert.equal(whenIsThat(new Date(NOW + 24 * 3_600_000).toISOString(), NOW), "tomorrow");
    assert.equal(whenIsThat(new Date(NOW + 4 * 24 * 3_600_000).toISOString(), NOW), "in 4 days");
  });

  it("says something rather than nothing for a date it cannot read", () => {
    assert.equal(whenIsThat("soon", NOW), "in a few days");
  });
});

describe("what a traveller is told before they meet any of it", () => {
  it("says both limits, and what is NOT limited", () => {
    // A list of restrictions with no floor under it reads as though the rest
    // might go next.
    const said = describeLimits("traveler", TRAVELER);
    assert.match(said, /2 trips at a time/);
    assert.match(said, /1 printable copy a week/);
    assert.match(said, /every kever/i);
    assert.match(said, /sharing a trip/);
  });

  it("says plainly when a plan limits nothing", () => {
    assert.match(describeLimits("pro", BUILT_IN_LIMITS.pro), /no limits/);
  });

  it("says how many copies are left", () => {
    assert.match(describePrints([], TRAVELER, NOW), /1 of 1/);
    assert.match(describePrints([print("a", 1000)], TRAVELER, NOW), /used this week/);
    assert.match(describePrints([], BUILT_IN_LIMITS.pro, NOW), /as many copies as you like/);
  });

  it("always says something", () => {
    for (const prints of [[], [print("a", 1000)], [print("a", WEEK_MS * 2)]]) {
      assert.ok(describePrints(prints, TRAVELER, NOW).length > 20);
    }
  });
});
