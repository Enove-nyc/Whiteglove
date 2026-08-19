import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildDays, emptyItinerary, type Itinerary } from "@/data/itinerary";
import { itineraryToCompanionTrip } from "@/lib/companion-trip";
import { SAMPLE_ITINERARY } from "@/data/sample-itinerary";

/**
 * The one place a planner trip becomes an app trip. These hold the wiring
 * together: what a real trip carries, and — just as much — what it must never
 * fabricate.
 */
describe("a planner trip, wired into the app", () => {
  const itin: Itinerary = { ...emptyItinerary(), ...SAMPLE_ITINERARY };
  const days = buildDays(itin);
  const trip = itineraryToCompanionTrip(itin, days, { today: itin.startDate, tripName: "Rome week" });

  it("carries the real days, in order, one per calendar day", () => {
    assert.equal(trip.days.length, days.length);
    assert.ok(trip.days.length >= 7, "the sample is a week");
    assert.equal(trip.days[0].dom, "25"); // 25 October
    assert.equal(trip.days[0].dow, "Sun");
  });

  it("opens on today when the trip is on now, and the first day otherwise", () => {
    // today === startDate here, so it opens on day one.
    assert.equal(trip.todayIndex, 0);
    assert.equal(trip.days[trip.todayIndex].today, true);

    const past = itineraryToCompanionTrip(itin, days, { today: "2000-01-01" });
    assert.equal(past.todayIndex, 0);
  });

  it("puts the real flights and stay in the wallet", () => {
    const flights = trip.walletGroups.find((g) => g.name === "Flights");
    assert.ok(flights, "there is a flights group");
    assert.ok(flights!.rows.some((r) => /JFK|New York/.test(r.title)), "the outbound flight is there");

    const stay = trip.walletGroups.find((g) => g.name === "Where you are staying");
    assert.ok(stay && stay.rows.length > 0, "the hotel is there");
  });

  it("NEVER fabricates the advisor side on a wired trip", () => {
    assert.equal(trip.concierge, false, "no live advisor is claimed");
    assert.equal(trip.swaps, undefined, "no held-for-you weather swap is invented");
    assert.equal(trip.messages, undefined, "no advisor thread is invented");
    assert.equal(trip.handledSteps, undefined, "no handled-for-you log is invented");
    assert.equal(trip.advisorTrips, undefined, "no advisor trip list is invented");
  });

  it("reads the dates and the travellers off the itinerary", () => {
    assert.match(trip.tripDates, /October/);
    assert.match(trip.tripDates, /2026/);
    assert.match(trip.homeKicker, /day 1 of/);
    assert.ok(trip.family.length > 0);
  });

  it("stands up an empty trip without throwing", () => {
    const empty: Itinerary = { ...emptyItinerary(), startDate: "2026-05-01", endDate: "2026-05-03" };
    const emptyDays = buildDays(empty);
    const wired = itineraryToCompanionTrip(empty, emptyDays, { today: "2026-05-01" });
    assert.equal(wired.days.length, 3);
    // Every day still has at least one item — an open day rather than a blank.
    assert.ok(wired.days.every((d) => d.items.length > 0));
    assert.equal(wired.concierge, false);
  });
});
