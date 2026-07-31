import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { daysUntil, stopConcerns, stopReadiness, tripReadiness, type StopFacts } from "@/lib/command-center";

/**
 * What somebody is told to worry about before they travel.
 *
 * These rules decide that, which is why they are tested apart from the page.
 * The failure that matters most is not a missing warning — it is a list so
 * full of warnings that the one that counts is lost in it. A traveler who
 * reads "no kosher food listed" five times stops reading.
 */

const kever = (over: Partial<StopFacts> = {}): StopFacts => ({
  id: "1",
  name: "Lizhensk",
  isKever: true,
  contacts: [{ label: "Shomer", phone: "+48 123" }],
  coordinates: "50.25, 22.42",
  address: "Górna 16",
  plannedDate: "2026-09-01",
  ...over,
});

describe("what stops a visit happening", () => {
  it("says nothing when everything is there", () => {
    assert.deepEqual(stopConcerns(kever()), []);
  });

  it("leads with having nobody to let you in", () => {
    const concerns = stopConcerns(kever({ contacts: [] }));
    assert.equal(concerns[0].weight, 1);
    assert.match(concerns[0].says, /let you in/i);
  });

  it("counts a contact with no phone number as nobody", () => {
    // A label and an empty field is not a way in.
    const concerns = stopConcerns(kever({ contacts: [{ label: "Shomer" }] }));
    assert.ok(concerns.some((c) => /let you in/i.test(c.says)));
  });

  it("says so when there is nowhere to navigate to at all", () => {
    const concerns = stopConcerns(kever({ coordinates: "", address: "" }));
    assert.equal(concerns[0].weight, 1);
    assert.ok(concerns.some((c) => /nowhere to navigate/i.test(c.says)));
  });

  it("warns about an address without a checked grave — but more quietly", () => {
    const concerns = stopConcerns(kever({ coordinates: "" }));
    const one = concerns.find((c) => /exact grave/i.test(c.says));
    assert.equal(one?.weight, 2);
  });

  it("does not ask a hotel who will let you in", () => {
    // Only a beis hachaim gets that warning. A hotel with no shomer is a hotel.
    assert.deepEqual(stopConcerns(kever({ isKever: false, contacts: [] })), []);
  });

  it("treats a missing date as worth knowing, not worth worrying about", () => {
    const concerns = stopConcerns(kever({ plannedDate: "" }));
    assert.deepEqual(concerns.map((c) => c.weight), [3]);
    assert.equal(stopReadiness(kever({ plannedDate: "" })).ready, true);
  });

  it("puts the worst first", () => {
    const concerns = stopConcerns(kever({ contacts: [], coordinates: "", plannedDate: "" }));
    assert.deepEqual(concerns.map((c) => c.weight), [...concerns.map((c) => c.weight)].sort());
  });
});

describe("the trip as a whole", () => {
  const stops = [
    kever({ id: "a", name: "Uman", plannedDate: "2026-09-05" }),
    kever({ id: "b", name: "Lizhensk", plannedDate: "2026-09-01", contacts: [] }),
    kever({ id: "c", name: "Belz", plannedDate: "" }),
  ];

  it("orders by the day you will be there, with the undated last", () => {
    // Not first: an undated stop is the one you have not decided about, not
    // the one you are leaving for.
    assert.deepEqual(tripReadiness(stops).stops.map((s) => s.stop.name), ["Lizhensk", "Uman", "Belz"]);
  });

  it("pulls out only the stops that could stop the visit", () => {
    const trip = tripReadiness(stops);
    assert.deepEqual(trip.needsAttention.map((s) => s.stop.name), ["Lizhensk"]);
    // Belz has only a missing date, so it is not on the list to worry about.
    assert.equal(trip.readyCount, 2);
  });

  it("collects every number worth having, and says which stop it is for", () => {
    const trip = tripReadiness(stops);
    assert.equal(trip.callAhead.length, 2);
    assert.ok(trip.callAhead.every((c) => c.stop && c.phone));
    assert.ok(!trip.callAhead.some((c) => c.stop === "Lizhensk"), "Lizhensk has no number to give");
  });

  it("does not reorder what it was handed", () => {
    const input = [...stops];
    tripReadiness(input);
    assert.equal(input[0].name, "Uman");
  });

  it("copes with a trip that has no stops", () => {
    const empty = tripReadiness([]);
    assert.deepEqual(empty.stops, []);
    assert.deepEqual(empty.needsAttention, []);
    assert.equal(empty.readyCount, 0);
  });
});

describe("how long until you go", () => {
  it("says it the way a person would", () => {
    assert.equal(daysUntil("2026-09-01", "2026-09-01"), "today");
    assert.equal(daysUntil("2026-09-02", "2026-09-01"), "tomorrow");
    assert.equal(daysUntil("2026-09-05", "2026-09-01"), "in 4 days");
    assert.equal(daysUntil("2026-09-22", "2026-09-01"), "in 3 weeks");
    assert.equal(daysUntil("2026-12-01", "2026-09-01"), "in 3 months");
  });

  it("knows when the trip has started", () => {
    assert.equal(daysUntil("2026-08-30", "2026-09-01"), "under way");
  });

  it("says nothing rather than “unknown” when there is no date", () => {
    assert.equal(daysUntil("", "2026-09-01"), null);
    assert.equal(daysUntil(undefined, "2026-09-01"), null);
    assert.equal(daysUntil("not a date", "2026-09-01"), null);
  });
});
