import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDays, type Itinerary } from "@/data/itinerary";
import { BUILT_IN_ASSUMPTIONS, type PlannerAssumptions, usableDayHours } from "@/data/planner-assumptions";
import {
  assumptionProblem,
  changedFields,
  describeDay,
  FIELDS,
  GROUPS,
  mergeAssumptions,
  onlyChanges,
  workedExample,
} from "@/lib/planner-settings";
import { planRoute } from "@/lib/route-plan";

/**
 * The figures the route planner judges a day by.
 *
 * Two things these tests are actually for. The first is that the built-in set
 * still IS what the code used to do, because the whole promise of this screen
 * is that turning it on changes nothing until somebody changes a number. The
 * second is at the bottom: every figure the planner reads has a row on the
 * screen, checked against the type rather than a hand-written list.
 */

const with_ = (over: Partial<PlannerAssumptions>): PlannerAssumptions => ({ ...BUILT_IN_ASSUMPTIONS, ...over });

describe("the built-in figures are what the planner always did", () => {
  it("is a 14-hour day, 08:00 to 22:00", () => {
    // These were `const USABLE_DAY_HOURS = 14` and friends, written into
    // data/itinerary.ts. If one of them moves, every trip on the site moves,
    // and it should be somebody's decision rather than a merge.
    assert.equal(BUILT_IN_ASSUMPTIONS.dayStart, "08:00");
    assert.equal(BUILT_IN_ASSUMPTIONS.dayEnd, "22:00");
    assert.equal(usableDayHours(BUILT_IN_ASSUMPTIONS), 14);
    assert.equal(BUILT_IN_ASSUMPTIONS.lateFinish, "21:00");
  });

  it("is a 90-minute stop, and a beis hachaim the same", () => {
    assert.equal(BUILT_IN_ASSUMPTIONS.stopMins, 90);
    assert.equal(BUILT_IN_ASSUMPTIONS.keverMins, 90, "shipping a different kever length would move existing trips");
  });

  it("is the same driving estimate — 1.35 × the straight line, 22/38/58/88, plus 10 minutes", () => {
    assert.equal(BUILT_IN_ASSUMPTIONS.detourFactor, 1.35);
    assert.equal(BUILT_IN_ASSUMPTIONS.transferMins, 10);
    assert.deepEqual(
      [BUILT_IN_ASSUMPTIONS.townKmh, BUILT_IN_ASSUMPTIONS.ruralKmh, BUILT_IN_ASSUMPTIONS.regionalKmh, BUILT_IN_ASSUMPTIONS.motorwayKmh],
      [22, 38, 58, 88],
    );
    assert.equal(BUILT_IN_ASSUMPTIONS.freeHoursWorthMentioning, 4);
    assert.equal(BUILT_IN_ASSUMPTIONS.gapHoursWorthMentioning, 3);
  });

  it("passes them by default, so a caller that says nothing gets what it always got", () => {
    const days = buildDays(trip([krakow, lizhensk]));
    const explicit = buildDays(trip([krakow, lizhensk]), undefined, BUILT_IN_ASSUMPTIONS);
    assert.deepEqual(days, explicit);
  });
});

describe("what the owner saved, on top of what the site ships with", () => {
  it("keeps every figure he did not touch", () => {
    const merged = mergeAssumptions({ motorwayKmh: 70 });
    assert.equal(merged.motorwayKmh, 70);
    assert.equal(merged.townKmh, BUILT_IN_ASSUMPTIONS.townKmh);
    assert.equal(merged.dayStart, BUILT_IN_ASSUMPTIONS.dayStart);
  });

  it("returns the built-in set for nothing at all", () => {
    assert.deepEqual(mergeAssumptions(null), BUILT_IN_ASSUMPTIONS);
    assert.deepEqual(mergeAssumptions({}), BUILT_IN_ASSUMPTIONS);
  });

  it("DROPS a stored value that is not usable rather than using it", () => {
    // A corrupted store must cost the owner his change, never leave the planner
    // dividing by a speed of zero on every trip on the site.
    const merged = mergeAssumptions({ motorwayKmh: Number.NaN, dayStart: "half eight" } as never);
    assert.equal(merged.motorwayKmh, BUILT_IN_ASSUMPTIONS.motorwayKmh);
    assert.equal(merged.dayStart, BUILT_IN_ASSUMPTIONS.dayStart);
  });

  it("stores only what differs, so a later correction to a built-in figure still reaches him", () => {
    assert.deepEqual(onlyChanges(BUILT_IN_ASSUMPTIONS), {});
    assert.deepEqual(onlyChanges(with_({ stopMins: 45 })), { stopMins: 45 });
  });

  it("says which figures are no longer the built-in ones", () => {
    assert.deepEqual(changedFields(BUILT_IN_ASSUMPTIONS), []);
    assert.deepEqual(changedFields(with_({ dayEnd: "19:00" })).map((f) => f.key), ["dayEnd"]);
  });
});

describe("what cannot be saved", () => {
  it("takes the built-in set", () => {
    assert.equal(assumptionProblem(BUILT_IN_ASSUMPTIONS), null);
  });

  it("refuses a day that ends before it begins", () => {
    assert.match(String(assumptionProblem(with_({ dayStart: "18:00", dayEnd: "09:00" }))), /ends before it begins/);
  });

  it("refuses a day so short every day would be over-packed", () => {
    assert.match(String(assumptionProblem(with_({ dayStart: "08:00", dayEnd: "10:00" }))), /over-packed/);
  });

  it("refuses a late-finish before the day starts", () => {
    assert.match(String(assumptionProblem(with_({ lateFinish: "06:00" }))), /every day would be called a late finish/);
  });

  it("refuses a stop that takes no time", () => {
    // A zero-length stop is one the planner will pack a day full of.
    assert.match(String(assumptionProblem(with_({ stopMins: 0 }))), /pack a day full/);
    assert.match(String(assumptionProblem(with_({ keverMins: -5 }))), /pack a day full/);
  });

  it("refuses a stop longer than the whole day", () => {
    assert.match(String(assumptionProblem(with_({ stopMins: 15 * 60 }))), /every single day over-packed/);
  });

  it("refuses a speed of zero, because the drive would never end", () => {
    assert.match(String(assumptionProblem(with_({ townKmh: 0 }))), /never ends/);
  });

  it("refuses a speed no road on these routes reaches", () => {
    assert.match(String(assumptionProblem(with_({ motorwayKmh: 200 }))), /fastest road/);
  });

  it("REFUSES speeds in the wrong order, and says what it would do", () => {
    // The bands are picked by leg length, so an inverted pair makes a long
    // drive come out quicker than a short one. Nobody means that; it is a typo,
    // and it is invisible in the result.
    const said = String(assumptionProblem(with_({ ruralKmh: 90 })));
    assert.match(said, /long drive come out quicker than a short one/);
    assert.match(said, /back-road speed/);
  });

  it("refuses a road shorter than the straight line between its ends", () => {
    assert.match(String(assumptionProblem(with_({ detourFactor: 0.8 }))), /cannot be shorter than the straight line/);
  });

  it("refuses time per leg that is negative", () => {
    assert.match(String(assumptionProblem(with_({ transferMins: -10 }))), /negative/);
  });

  it("refuses a threshold that could never be reached, because the notice would never appear", () => {
    assert.match(String(assumptionProblem(with_({ freeHoursWorthMentioning: 20 }))), /never appear/);
    assert.match(String(assumptionProblem(with_({ gapHoursWorthMentioning: 20 }))), /never appear/);
  });

  it("names the consequence rather than the rule", () => {
    // Somebody reading a refusal is trying to fix a trip, not to pass
    // validation. "stopMins must be > 0" tells them nothing about why.
    for (const bad of [with_({ stopMins: 0 }), with_({ townKmh: 0 }), with_({ detourFactor: 0.5 }), with_({ ruralKmh: 99 })]) {
      const said = String(assumptionProblem(bad));
      assert.ok(!/[a-z][A-Z]/.test(said.replace(/km\/h/g, "")), `names a field rather than a consequence: ${said}`);
    }
  });
});

/* ---- the figures actually reach the trip -------------------------------- */

const krakow = { name: "Kraków", coordinates: "50.0512,19.9448" };
const lizhensk = { name: "Lizhensk", coordinates: "50.2622,22.4204", keverSlug: "lizhensk" };
const uman = { name: "Uman", coordinates: "48.7500,30.2200" };

function trip(stops: Array<{ name: string; coordinates: string; keverSlug?: string }>): Itinerary {
  return {
    title: "Test",
    startDate: "2026-08-01",
    endDate: "2026-08-01",
    flights: [],
    lodging: [],
    activities: stops.map((s, i) => ({ id: `a${i}`, name: s.name, coordinates: s.coordinates, keverSlug: s.keverSlug, date: "2026-08-01" })),
  };
}

describe("a changed figure changes the trip", () => {
  it("a shorter day turns a comfortable day into an over-packed one", () => {
    // The whole point. The judgement a traveller reads is this number, and
    // nothing else about the trip has changed between these two lines.
    const stops = trip([krakow, lizhensk]);
    const [normal] = buildDays(stops);
    const [short] = buildDays(stops, undefined, with_({ dayEnd: "12:00" }));
    assert.ok(!normal.warnings.some((w) => w.includes("over-packed")), normal.warnings.join(" | "));
    assert.ok(short.warnings.some((w) => w.includes("over-packed")), short.warnings.join(" | "));
    assert.match(short.warnings.join(" | "), /4-hour day/, "the notice should quote the day it was measured against");
  });

  it("a slower motorway makes the long leg longer", () => {
    const [fast] = buildDays(trip([lizhensk, uman]));
    const [slow] = buildDays(trip([lizhensk, uman]), undefined, with_({ motorwayKmh: 60 }));
    assert.ok(slow.travelHours > fast.travelHours, `${slow.travelHours} should exceed ${fast.travelHours}`);
  });

  it("a beis hachaim can be given a different length from everything else", () => {
    // The one kind of stop the trip records, and the one whose length is least
    // like the others.
    const [normal] = buildDays(trip([krakow, lizhensk]));
    const [longer] = buildDays(trip([krakow, lizhensk]), undefined, with_({ keverMins: 240 }));
    assert.ok((longer.freeHours ?? 0) < (normal.freeHours ?? 0), "the kever length did not reach the day");

    // …and it applies only to the kever, not to Kraków beside it.
    const [alsoLonger] = buildDays(trip([krakow]), undefined, with_({ keverMins: 240 }));
    assert.equal(alsoLonger.freeHours, buildDays(trip([krakow]))[0].freeHours);
  });

  it("reaches the automatic route planner too, not only the day cards", () => {
    // "Plan my route" places an undated stop on the day it fits, and whether
    // it fits is this figure. A group that leaves at five and drives till late
    // can hold a day the built-in 08:00–22:00 refuses — which is exactly the
    // change the owner would make, and it has to reach the arrangement and not
    // only the warning underneath it.
    const loose: Itinerary = {
      ...trip([krakow, lizhensk]),
      activities: [...trip([krakow, lizhensk]).activities, { id: "float", name: "Uman", coordinates: uman.coordinates, date: "" }],
    };
    const normalDay = planRoute(loose);
    const longDay = planRoute(loose, with_({ dayStart: "05:00", dayEnd: "23:30" }));
    assert.equal(normalDay.placed, 0, "a 14-hour day cannot hold Kraków, Lizhensk and Uman");
    assert.ok(normalDay.unplaceable.some((a) => a.id === "float"));
    assert.equal(longDay.placed, 1, "a longer day should place it");
    assert.deepEqual(longDay.unplaceable, []);
  });
});

describe("what the screen shows before anything is saved", () => {
  it("works the three real legs out from real coordinates", () => {
    const legs = workedExample(BUILT_IN_ASSUMPTIONS);
    assert.equal(legs.length, 4);
    const uman = legs.find((l) => l.label.includes("Uman"));
    assert.ok(uman, "the long leg is missing");
    assert.ok(uman.km > 500 && uman.km < 700, `Lizhensk to Uman came out as ${uman.km} km`);
    assert.match(uman.says, /\d/);
  });

  it("moves when a figure moves, which is the reason it is there", () => {
    const before = workedExample(BUILT_IN_ASSUMPTIONS).find((l) => l.label.includes("Uman"))!.says;
    const after = workedExample(with_({ motorwayKmh: 60 })).find((l) => l.label.includes("Uman"))!.says;
    assert.notEqual(before, after);
  });

  it("says the day in a sentence, and does not repeat itself when the two stop lengths match", () => {
    assert.match(describeDay(BUILT_IN_ASSUMPTIONS), /08:00 to 22:00 — 14 hours/);
    assert.match(describeDay(BUILT_IN_ASSUMPTIONS), /a beis hachaim included/);
    assert.match(describeDay(with_({ keverMins: 45 })), /a beis hachaim takes 45 min/);
  });
});

/* ---- the one that keeps this honest ------------------------------------- */

describe("nothing is invisible", () => {
  it("gives every figure the planner reads a row on the screen", () => {
    // THE ONE THAT MATTERS. A figure that exists and has no row is one nobody
    // can change — which is the exact hole this screen was built to close, and
    // the easiest one to reopen by adding a field and forgetting the form.
    const onScreen = new Set(FIELDS.map((f) => f.key));
    const missing = Object.keys(BUILT_IN_ASSUMPTIONS).filter((key) => !onScreen.has(key as never));
    assert.deepEqual(missing, [], `read by the planner and not on the screen: ${missing.join(", ")}. Add them to FIELDS.`);
  });

  it("shows no row for a figure that does not exist", () => {
    const real = new Set(Object.keys(BUILT_IN_ASSUMPTIONS));
    const phantom = FIELDS.filter((f) => !real.has(f.key)).map((f) => f.key);
    assert.deepEqual(phantom, [], `on the screen and read by nothing: ${phantom.join(", ")}`);
  });

  it("says what each row CHANGES, not what it is", () => {
    // "How long a day is: the length of a day" helps nobody decide anything.
    for (const field of FIELDS) {
      assert.ok(field.label.trim().length > 3, String(field.key));
      assert.ok(field.changes.trim().length > 25, `${field.key}: "${field.changes}"`);
      assert.ok(!field.changes.includes(field.key), `${field.key} describes itself by field name`);
    }
  });

  it("puts every row in a group that exists, and leaves no group empty", () => {
    const groups = new Set(GROUPS.map((g) => g.id));
    for (const field of FIELDS) assert.ok(groups.has(field.group), `${field.key} is in no group`);
    for (const group of GROUPS) {
      assert.ok(FIELDS.some((f) => f.group === group.id), `${group.id} has no fields, so it would render as an empty heading`);
      assert.ok(group.note.trim().length > 40, `${group.id} says nothing about why it matters`);
    }
  });
});
