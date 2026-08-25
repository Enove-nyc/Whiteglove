import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fridayFinishWarning } from "@/lib/shabbos";
import { buildDays, emptyItinerary, type ItinActivity } from "@/data/itinerary";

const KRAKOW = "50.0647,19.945";
/** A Friday, and the Thursday before it. */
const FRIDAY = "2026-08-28";
const THURSDAY = "2026-08-27";

const at = (endMinutes: number, date = FRIDAY, coordinates: string | undefined = KRAKOW) =>
  fridayFinishWarning({ date, endMinutes, coordinates });

describe("how much room is left before candles", () => {
  it("gives the exact margin, in whole minutes", () => {
    // Sunset comes back fractional; "47 minutes" is a sentence somebody acts
    // on, "47.18 minutes" is one they distrust.
    const warning = at(17 * 60 + 30);
    assert.ok(warning);
    assert.equal(Number.isInteger(warning.marginMinutes), true);
    assert.equal(warning.marginMinutes, 47);
    assert.match(warning.message, /47 minutes before candle-lighting/);
  });

  it("says so plainly when the day runs past candle-lighting", () => {
    const warning = at(19 * 60);
    assert.ok(warning);
    assert.ok(warning.marginMinutes < 0);
    assert.match(warning.message, /still running at candle-lighting/);
    assert.match(warning.message, /move something to another day/);
  });

  it("stays quiet when the day finishes with room to spare", () => {
    // Nothing useful to say about a day that ends at three on a summer Friday.
    assert.equal(at(15 * 60), null);
  });

  it("follows the season — the same finish is fine in August and late in December", () => {
    assert.equal(at(15 * 60, FRIDAY), null);
    const december = fridayFinishWarning({ date: "2026-12-11", endMinutes: 15 * 60, coordinates: KRAKOW });
    assert.ok(december, "a 3pm finish in December is close to candles and should be flagged");
    assert.ok(december.marginMinutes < 60);
  });
});

describe("it refuses to guess", () => {
  it("says nothing on a day that is not Friday", () => {
    assert.equal(at(18 * 60, THURSDAY), null);
  });

  it("says nothing without a position to compute from", () => {
    // A candle-lighting time invented for an unknown place is worse than none.
    // Called directly, not through `at`: passing undefined to a parameter with
    // a default gets the default, which is how this test first passed against
    // Kraków while claiming to test no-coordinates at all.
    assert.equal(fridayFinishWarning({ date: FRIDAY, endMinutes: 18 * 60 }), null);
    assert.equal(fridayFinishWarning({ date: FRIDAY, endMinutes: 18 * 60, coordinates: "not coordinates" }), null);
    assert.equal(fridayFinishWarning({ date: FRIDAY, endMinutes: 18 * 60, coordinates: "0,0" }), null);
  });

  it("says nothing for a date it cannot read", () => {
    assert.equal(fridayFinishWarning({ date: "", endMinutes: 1080, coordinates: KRAKOW }), null);
    assert.equal(fridayFinishWarning({ date: "nonsense", endMinutes: 1080, coordinates: KRAKOW }), null);
  });
});

describe("the planner itself now warns about Friday", () => {
  function fridayDayWith(activities: Partial<ItinActivity>[]) {
    const itin = emptyItinerary();
    itin.startDate = FRIDAY;
    itin.endDate = FRIDAY;
    itin.activities = activities.map((a, i) => ({
      id: `a${i}`,
      name: a.name ?? `Stop ${i}`,
      date: FRIDAY,
      coordinates: a.coordinates,
      startTime: a.startTime,
      ...a,
    })) as ItinActivity[];
    return buildDays(itin)[0];
  }

  it("a Friday running late is flagged on the day itself", () => {
    // This is the gap that mattered: the route dashboard warned about Shabbos
    // and the day-by-day plan an advisor prints never did.
    const day = fridayDayWith([{ name: "Late tour", coordinates: KRAKOW, startTime: "17:00" }]);
    assert.ok(
      day.warnings.some((w) => /candle-lighting/.test(w)),
      `no Shabbos warning on a Friday finishing late: ${JSON.stringify(day.warnings)}`,
    );
  });

  it("an early Friday is left alone", () => {
    const day = fridayDayWith([{ name: "Morning stop", coordinates: KRAKOW, startTime: "09:00" }]);
    assert.ok(!day.warnings.some((w) => /candle-lighting/.test(w)));
  });

  it("a day with no stops says nothing about candles", () => {
    const day = fridayDayWith([]);
    assert.ok(!day.warnings.some((w) => /candle-lighting/.test(w)));
  });

  it("a Friday whose stops have no position stays quiet rather than guessing", () => {
    const day = fridayDayWith([{ name: "Somewhere", startTime: "18:00" }]);
    assert.ok(!day.warnings.some((w) => /candle-lighting/.test(w)));
  });
});
