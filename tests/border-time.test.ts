import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDays, type Itinerary } from "@/data/itinerary";
import { BUILT_IN_CROSSINGS } from "@/data/border-crossings";
import { mergeCrossings } from "@/lib/border-crossings";
import { borderCostForLegs } from "@/lib/border-legs";
import { UNCHECKED_EXTERNAL_MINUTES, borderCost, describeDayTravel, formatWait } from "@/lib/border-time";

/**
 * The border, counted in the driving time rather than mentioned beside it.
 *
 * The planner worked driving time out from the road and then said, separately
 * and further down the page, that the border can take hours. The arithmetic
 * and the warning disagreed: a Lizhensk-to-Uman day read as five hours with a
 * note underneath, and somebody planning around the five hours arrived at
 * Korczowa with a kever to reach before dark.
 *
 * The rule that has to hold: a figure somebody checked is a MEASUREMENT and is
 * attributed; a figure nobody checked is an ALLOWANCE and says so. They are
 * never confused, because one is a fact about today and the other is not.
 */

const TODAY = "2026-07-31";
const daysAgo = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

describe("what a border costs", () => {
  it("adds nothing inside the Schengen area", () => {
    // Padding every internal border by ten minutes makes the whole day wrong
    // in the other direction.
    const cost = borderCost({ from: "Poland", to: "Czechia", major: false, crossings: [], today: TODAY });
    assert.equal(cost.minutes, 0);
    assert.equal(cost.says, "");
  });

  it("allows a stated figure when nobody has checked", () => {
    const cost = borderCost({
      from: "Poland",
      to: "Ukraine",
      major: true,
      crossings: mergeCrossings(BUILT_IN_CROSSINGS, []),
      today: TODAY,
    });
    assert.equal(cost.minutes, UNCHECKED_EXTERNAL_MINUTES);
    assert.equal(cost.measured, false);
    assert.match(cost.says, /allowed for the border/);
    assert.match(cost.says, /nobody has checked it lately/);
  });

  it("uses what somebody checked, and attributes it", () => {
    const cost = borderCost({
      from: "Poland",
      to: "Ukraine",
      major: true,
      crossings: mergeCrossings(BUILT_IN_CROSSINGS, [
        { id: "pl-ua-korczowa-krakovets", state: "slow", wait: "about three hours", waitMinutes: 180, checkedAt: daysAgo(2) },
      ]),
      today: TODAY,
    });
    assert.equal(cost.minutes, 180);
    assert.equal(cost.measured, true);
    assert.equal(cost.crossingName, "Korczowa – Krakovets");
    assert.match(cost.says, /Korczowa – Krakovets/);
    assert.match(cost.says, /checked 2 days ago/i);
  });

  it("falls back to the allowance once a check has gone stale", () => {
    // A queue length from four months ago is not a fact about today, and the
    // arithmetic must not treat it as one.
    const cost = borderCost({
      from: "Poland",
      to: "Ukraine",
      major: true,
      crossings: mergeCrossings(BUILT_IN_CROSSINGS, [
        { id: "pl-ua-korczowa-krakovets", state: "open", waitMinutes: 20, checkedAt: daysAgo(120) },
      ]),
      today: TODAY,
    });
    assert.equal(cost.minutes, UNCHECKED_EXTERNAL_MINUTES);
    assert.equal(cost.measured, false);
  });

  it("will not take a figure from a crossing somebody found shut", () => {
    const cost = borderCost({
      from: "Poland",
      to: "Ukraine",
      major: true,
      crossings: mergeCrossings(BUILT_IN_CROSSINGS, [
        { id: "pl-ua-korczowa-krakovets", state: "closed", waitMinutes: 0, checkedAt: daysAgo(1) },
      ]),
      today: TODAY,
    });
    assert.equal(cost.minutes, UNCHECKED_EXTERNAL_MINUTES, "a shut crossing takes no time because you cannot use it");
    assert.equal(cost.measured, false);
  });

  it("ignores a figure with no state behind it", () => {
    // A number typed in without saying what was found is not a check.
    const cost = borderCost({
      from: "Poland",
      to: "Ukraine",
      major: true,
      crossings: mergeCrossings(BUILT_IN_CROSSINGS, [{ id: "pl-ua-korczowa-krakovets", waitMinutes: 15, checkedAt: daysAgo(1) }]),
      today: TODAY,
    });
    assert.equal(cost.minutes, UNCHECKED_EXTERNAL_MINUTES);
  });

  it("takes a genuine zero from an open crossing", () => {
    const cost = borderCost({
      from: "Hungary",
      to: "Ukraine",
      major: true,
      crossings: mergeCrossings(BUILT_IN_CROSSINGS, [
        { id: "hu-ua-zahony-chop", state: "open", waitMinutes: 0, checkedAt: daysAgo(1) },
      ]),
      today: TODAY,
    });
    assert.equal(cost.minutes, 0, "somebody drove straight through and said so");
    assert.equal(cost.measured, true);
  });
});

describe("how long it reads", () => {
  it("says minutes, hours, or both", () => {
    assert.equal(formatWait(45), "45 min");
    assert.equal(formatWait(60), "1 h");
    assert.equal(formatWait(150), "2 h 30 min");
    assert.equal(formatWait(0), "0 min");
    assert.equal(formatWait(-5), "0 min", "never negative");
  });

  it("keeps the border apart from the driving", () => {
    // "Seven hours" says leave early. "Five hours driving and two at the
    // border" says leave early AND that going at six may save one of them.
    assert.equal(
      describeDayTravel({ drivingMinutes: 300, borderMinutes: 120, allMeasured: true }),
      "5 h driving + 2 h at the border",
    );
    assert.equal(describeDayTravel({ drivingMinutes: 300, borderMinutes: 0, allMeasured: false }), "≈5 h driving");
  });
});

// ---- The planner actually using it -----------------------------------

function trip(stops: Array<{ name: string; address: string; coordinates: string }>): Itinerary {
  return {
    title: "Test",
    startDate: "2026-08-01",
    endDate: "2026-08-01",
    flights: [],
    lodging: [],
    activities: stops.map((s, i) => ({ id: `a${i}`, name: s.name, address: s.address, coordinates: s.coordinates, date: "2026-08-01", hours: 1 })),
  };
}

const lizhensk = { name: "Lizhensk", address: "Górna 16, 37-300 Leżajsk, Poland", coordinates: "50.2622,22.4204" };
const uman = { name: "Uman", address: "Pushkina St 27A, Uman, Cherkasy Oblast, Ukraine, 20300", coordinates: "48.7500,30.2200" };
const krakow = { name: "Kraków", address: "Szeroka 40, Kraków, Poland", coordinates: "50.0512,19.9448" };

describe("the planner with borders folded in", () => {
  it("behaves exactly as before when nothing is passed", () => {
    // Every caller that only wants the days laid out.
    const [day] = buildDays(trip([lizhensk, uman]));
    assert.equal(day.borderMinutes, 0);
    assert.ok(!day.travelLegs.some((leg) => leg.borderMinutes));
  });

  it("adds the border to the leg that crosses it", () => {
    const cost = borderCostForLegs(mergeCrossings(BUILT_IN_CROSSINGS, []), TODAY);
    const [withBorder] = buildDays(trip([lizhensk, uman]), cost);
    const [without] = buildDays(trip([lizhensk, uman]));

    assert.equal(withBorder.borderMinutes, UNCHECKED_EXTERNAL_MINUTES);
    const leg = withBorder.travelLegs.find((l) => l.borderMinutes);
    assert.ok(leg, "the crossing leg carries it");
    assert.match(leg!.borderSays ?? "", /allowed for the border/);
    assert.equal(
      Math.round(withBorder.travelHours * 60) - Math.round(without.travelHours * 60),
      UNCHECKED_EXTERNAL_MINUTES,
      "the day's total grew by exactly the border",
    );
  });

  it("moves the arrival times too, not just the total", () => {
    // A border in the day's total but not in the arrival times would put
    // somebody at a kever two hours before they can be there.
    const cost = borderCostForLegs(mergeCrossings(BUILT_IN_CROSSINGS, []), TODAY);
    const [withBorder] = buildDays(trip([lizhensk, uman]), cost);
    const [without] = buildDays(trip([lizhensk, uman]));
    const late = withBorder.activities[1].travelMinutesFromPrev ?? 0;
    const early = without.activities[1].travelMinutesFromPrev ?? 0;
    assert.equal(late - early, UNCHECKED_EXTERNAL_MINUTES);
  });

  it("adds nothing to a day that stays in one country", () => {
    const cost = borderCostForLegs(mergeCrossings(BUILT_IN_CROSSINGS, []), TODAY);
    const [day] = buildDays(trip([krakow, lizhensk]), cost);
    assert.equal(day.borderMinutes, 0);
  });

  it("uses a checked figure when there is one", () => {
    const cost = borderCostForLegs(
      mergeCrossings(BUILT_IN_CROSSINGS, [
        { id: "pl-ua-korczowa-krakovets", state: "slow", waitMinutes: 45, wait: "quiet this week", checkedAt: daysAgo(1) },
      ]),
      TODAY,
    );
    const [day] = buildDays(trip([lizhensk, uman]), cost);
    assert.equal(day.borderMinutes, 45);
    assert.match(day.travelLegs.find((l) => l.borderMinutes)?.borderSays ?? "", /Korczowa/);
  });
});
