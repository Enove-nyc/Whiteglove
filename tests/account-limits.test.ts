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
const ONE_TRIP = BUILT_IN_LIMITS.one_trip;

describe("what was asked for", () => {
  it("PLANS TRIPS ON PERSONAL, which is the whole point of it", () => {
    /**
     * It used to be `{ trips: 0, printsPerWeek: 0 }` — an account that existed
     * to choose a plan from and could not hold one trip. The planner is the
     * free product now, so the free plan has to be able to use it.
     *
     * UNLIMITED is not unbounded: cannotAddTrip still refuses a twenty-sixth
     * trip on every plan, which is a ceiling nobody reaches rather than a
     * limit anybody meets.
     */
    assert.equal(BUILT_IN_LIMITS.free.trips, UNLIMITED);
    assert.equal(BUILT_IN_LIMITS.free.printsPerWeek, UNLIMITED);
  });

  it("NEVER LEAVES A PAYING ACCOUNT WITH LESS ROOM THAN A FREE ONE", () => {
    /**
     * The Trip Pass capped an account at one trip, from when free could hold
     * none. The moment Personal became unlimited that cap turned into a
     * penalty: nine dollars to keep fewer trips than costs nothing.
     *
     * The pass buys the app on the phone, which is a feature flag, not a
     * count. Whether it should attach to ONE trip rather than the account is
     * the owner's open question — see the note on one_trip in
     * lib/account-limits.ts.
     */
    for (const plan of ["one_trip", "starter", "pro"] as const) {
      const paid = BUILT_IN_LIMITS[plan].trips;
      const free = BUILT_IN_LIMITS.free.trips;
      assert.ok(
        paid === UNLIMITED || free === UNLIMITED || paid >= free,
        `${plan} allows ${paid} trips, and free allows ${free}`,
      );
    }
  });

  it("limits nothing on Advisor Starter or Advisor Pro", () => {
    assert.equal(BUILT_IN_LIMITS.starter.trips, UNLIMITED);
    assert.equal(BUILT_IN_LIMITS.starter.printsPerWeek, UNLIMITED);
    assert.equal(BUILT_IN_LIMITS.pro.trips, UNLIMITED);
    assert.equal(BUILT_IN_LIMITS.pro.printsPerWeek, UNLIMITED);
  });
});

describe("the owner's own numbers", () => {
  it("uses his when he has set one", () => {
    assert.equal(limitsFor("one_trip", { one_trip: { trips: 5 } }).trips, 5);
  });

  it("keeps the built-in one for anything he did not set", () => {
    assert.equal(limitsFor("one_trip", { one_trip: { trips: 5 } }).printsPerWeek, UNLIMITED);
  });

  it("takes a blank as no limit at all", () => {
    assert.equal(limitsFor("one_trip", { one_trip: { trips: null } }).trips, UNLIMITED);
  });

  it("REFUSES ZERO, which would be a locked account rather than a limit", () => {
    // Falls back to whatever the plan's own number is, rather than nought.
    assert.equal(limitsFor("one_trip", { one_trip: { trips: 0 } }).trips, BUILT_IN_LIMITS.one_trip.trips);
  });

  it("falls back rather than throwing on nonsense", () => {
    assert.equal(limitsFor("one_trip", { one_trip: { trips: "lots" as never } }).trips, BUILT_IN_LIMITS.one_trip.trips);
    assert.equal(limitsFor("one_trip", null).trips, BUILT_IN_LIMITS.one_trip.trips);
  });
});

describe("starting a trip", () => {
  it("LETS PERSONAL START ONE, where it used to send them to the pricing page", () => {
    assert.equal(newTripProblem("free", 0, BUILT_IN_LIMITS.free), null);
    assert.equal(newTripProblem("free", 7, BUILT_IN_LIMITS.free), null);
  });

  it("allows a trip on the Trip Pass", () => {
    assert.equal(newTripProblem("one_trip", 0, ONE_TRIP), null);
  });

  it("still refuses one past a limit the owner HAS set, and says what to do", () => {
    // No plan ships with a trip cap any more, so the rule is exercised with a
    // limit of the kind /admin/settings/limits can set.
    const capped = { trips: 1, printsPerWeek: UNLIMITED, staffSeats: 0 };
    const said = newTripProblem("one_trip", 1, capped);
    assert.match(said!, /1 trip at a time/);
    assert.match(said!, /Delete one/);
  });

  it("NEVER TAKES AWAY WHAT SOMEBODY ALREADY HAS", () => {
    // Somebody with five trips — made before there was a limit, or after it was
    // lowered — keeps five. Only a SIXTH is refused. Nothing here can close,
    // hide or delete a trip, and this is the test that says so.
    const capped = { trips: 1, printsPerWeek: UNLIMITED, staffSeats: 0 };
    const said = newTripProblem("one_trip", 5, capped);
    assert.match(said!, /you have 5/);
    assert.doesNotMatch(said!, /delet(ed|ing) for you|removed|closed/i);
  });

  it("never gets in the way on a plan with no limit", () => {
    assert.equal(newTripProblem("pro", 400, BUILT_IN_LIMITS.pro), null);
  });

  it("always has something to say about where they stand", () => {
    const capped = { trips: 1, printsPerWeek: UNLIMITED, staffSeats: 0 };
    assert.match(describeTrips(0, capped), /0 of 1/);
    assert.match(describeTrips(0, capped), /One more/);
    assert.match(describeTrips(1, capped), /Delete one/);
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
  // A plan's built-in printsPerWeek is unlimited everywhere now that "free"
  // is a locked, planless account — so a limit of 1 is passed in by hand here
  // to exercise the counting rules themselves, the same way the account page
  // would if the owner set one from /admin/settings/limits.
  const ONE_PRINT_A_WEEK = { trips: UNLIMITED, printsPerWeek: 1, staffSeats: 0 };
  const decide = (prints: PrintEvent[], tripId = "trip-1") =>
    decidePrint({ plan: "one_trip", limits: ONE_PRINT_A_WEEK, prints, tripId, now: NOW });

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
    const limits = { trips: 2, printsPerWeek: 3, staffSeats: 0 };
    const two = [print("a", 1000), print("b", 2000)];
    const d = decidePrint({ plan: "one_trip", limits, prints: two, tripId: "c", now: NOW });
    assert.equal(d.allowed, true);
    const three = [...two, print("c", 3000)];
    assert.equal(decidePrint({ plan: "one_trip", limits, prints: three, tripId: "d", now: NOW }).allowed, false);
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

describe("what somebody is told before they meet any of it", () => {
  // A synthetic limits object with both a trip and a print ceiling, to
  // exercise describeLimits's own message-joining rather than any one plan's
  // particular built-in numbers.
  const BOTH_LIMITED = { trips: 2, printsPerWeek: 1, staffSeats: 0 };

  it("says both limits, and what is NOT limited", () => {
    // A list of restrictions with no floor under it reads as though the rest
    // might go next.
    const said = describeLimits("one_trip", BOTH_LIMITED);
    assert.match(said, /2 trips at a time/);
    assert.match(said, /1 printable copy a week/);
    assert.match(said, /every kever/i);
    // Said once, in the parity sentence. It used to be in both halves, so the
    // paragraph named the planner, the map and the guides twice running.
    assert.equal(said.match(/the planner, the map and the guides/gi)?.length, 1);
  });

  it("no longer tells One Trip it can share with anybody", () => {
    /**
     * IT DID, IN TWO PLACES. This sentence ended "…and sharing a trip with
     * anybody you like", and the pricing page said the same above its three
     * cards — while the feature table four rows down says handing a client
     * their own app is an advisor plan. Both were describing something real, a
     * share link and companionClients, under one word.
     *
     * Neither writes it now: planParitySentence() computes it from the table,
     * so the day an entitlement moves the sentence moves with it.
     */
    const said = describeLimits("one_trip", BOTH_LIMITED);
    assert.doesNotMatch(said, /sharing a trip with anybody/);
    assert.match(said, /What changes is/);
    assert.match(said, /handing a client their own app/);
  });

  it("says plainly when a plan limits nothing", () => {
    assert.match(describeLimits("pro", BUILT_IN_LIMITS.pro), /no limits/);
  });

  it("tells Personal what it CAN do, where it used to ask them to buy something", () => {
    // "Choose a plan below to start planning a trip." was the whole of what a
    // free account was told. It can plan trips now, so it is told that.
    const said = describeLimits("free", BUILT_IN_LIMITS.free);
    assert.match(said, /Personal has no limits on trips or printing/);
    assert.doesNotMatch(said, /Choose a plan/);
  });

  it("says how many copies are left", () => {
    assert.match(describePrints([], BOTH_LIMITED, NOW), /1 of 1/);
    assert.match(describePrints([print("a", 1000)], BOTH_LIMITED, NOW), /used this week/);
    assert.match(describePrints([], BUILT_IN_LIMITS.pro, NOW), /as many copies as you like/);
  });

  it("always says something", () => {
    for (const prints of [[], [print("a", 1000)], [print("a", WEEK_MS * 2)]]) {
      assert.ok(describePrints(prints, BOTH_LIMITED, NOW).length > 20);
    }
  });
});
