import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type Adjustment,
  borderAsk,
  borderStopId,
  currentAdjustments,
  dayStanding,
  describeStop,
  formatSpan,
  fromFinishing,
  fromNeedingLonger,
  LONGER_BY,
  NOISE_MINS,
  totalDelta,
} from "@/lib/day-progress";

/**
 * Running ahead of the plan, or behind it.
 *
 * THE OWNER'S REPORT: "the waiting time by borders is by default two hours…
 * if someone passes the border earlier, their whole day will be off the
 * timing." Right, and it is not only the border — a kever that takes an hour
 * longer does the same thing. From that moment every figure the planner shows
 * is wrong, and wrong SILENTLY: the day still reads as though it is on time.
 */

const NOW = "2026-09-01T09:00:00.000Z";
const later = (mins: number) => new Date(Date.parse(NOW) + mins * 60_000).toISOString();
const adj = (stopId: string, deltaMins: number, at = NOW, kind: Adjustment["kind"] = "done"): Adjustment => ({
  stopId,
  deltaMins,
  at,
  kind,
});

describe("recording what actually happened", () => {
  it("turns a fast border into time in hand", () => {
    // The exact case reported: two hours allowed, twenty minutes taken.
    const a = fromFinishing({ stopId: borderStopId("PL", "UA"), plannedMins: 120, actualMins: 20, now: NOW });
    assert.equal(a?.deltaMins, -100);
  });

  it("turns a long kever into time owed", () => {
    const a = fromFinishing({ stopId: "kever-1", plannedMins: 90, actualMins: 150, now: NOW });
    assert.equal(a?.deltaMins, 60);
  });

  it("records nothing when it went exactly to plan", () => {
    // A stray tap must not fill the day with zeroes.
    assert.equal(fromFinishing({ stopId: "a", plannedMins: 90, actualMins: 90, now: NOW }), null);
  });

  it("refuses nonsense rather than storing it", () => {
    assert.equal(fromFinishing({ stopId: "a", plannedMins: 90, actualMins: -5, now: NOW }), null);
    assert.equal(fromFinishing({ stopId: "a", plannedMins: 90, actualMins: Number.NaN, now: NOW }), null);
    assert.equal(fromNeedingLonger({ stopId: "a", extraMins: 0, now: NOW }), null);
    assert.equal(fromNeedingLonger({ stopId: "a", extraMins: -30, now: NOW }), null);
  });

  it("takes 'I need longer' as time spent", () => {
    const a = fromNeedingLonger({ stopId: "kever-1", extraMins: 30, now: NOW });
    assert.equal(a?.deltaMins, 30);
    assert.equal(a?.kind, "longer");
  });

  it("offers sensible amounts to ask for", () => {
    assert.deepEqual([...LONGER_BY], [15, 30, 60]);
  });
});

describe("answering twice about one stop", () => {
  it("replaces rather than adding", () => {
    // "Another 15" then "actually another 30" is 30, not 45. Adding them is how
    // a day drifts an hour off from two taps.
    const all = [adj("kever-1", 15, NOW), adj("kever-1", 30, later(5))];
    assert.equal(totalDelta(all), 30);
    assert.equal(currentAdjustments(all).length, 1);
  });

  it("keeps the newest answer, whatever order they arrive in", () => {
    const all = [adj("a", 30, later(5)), adj("a", 15, NOW)];
    assert.equal(totalDelta(all), 30);
  });

  it("adds up across different stops", () => {
    assert.equal(totalDelta([adj("border", -100), adj("kever-1", 40)]), -60);
  });

  it("ignores an entry with an unreadable figure", () => {
    assert.equal(totalDelta([adj("a", Number.NaN), adj("b", 20)]), 20);
  });
});

describe("where the day stands", () => {
  it("says nothing has been recorded, and how to start", () => {
    const standing = dayStanding([]);
    assert.equal(standing.state, "on-plan");
    assert.match(standing.says, /Nothing recorded yet/);
    assert.equal(standing.answered, 0);
  });

  it("TREATS A FEW MINUTES AS ON PLAN", () => {
    // A site that announces "you are four minutes ahead" trains somebody to
    // ignore it on the day it matters.
    for (const delta of [-9, -1, 4, 9]) {
      assert.equal(dayStanding([adj("a", delta)]).state, "on-plan", String(delta));
    }
    assert.ok(NOISE_MINS >= 10);
  });

  it("says how far ahead, once it is worth saying", () => {
    const standing = dayStanding([adj("border", -100)]);
    assert.equal(standing.state, "ahead");
    assert.match(standing.says, /1 h 40 min ahead/);
  });

  it("says an hour and a half in hand is enough for another stop — but only if there is one", () => {
    const saved = [adj("border", -100)];
    assert.match(dayStanding(saved, { stopsLeft: 2, typicalStopMins: 90 }).says, /enough for another stop/);
    // Nothing left to do with it: do not dangle a stop that is not there.
    assert.doesNotMatch(dayStanding(saved, { stopsLeft: 0, typicalStopMins: 90 }).says, /another stop/);
    // Not actually enough for one.
    assert.doesNotMatch(dayStanding([adj("a", -30)], { stopsLeft: 2, typicalStopMins: 90 }).says, /another stop/);
  });

  it("says what being behind MEANS, and does not tell anybody off", () => {
    // Two hours at a kever instead of one is very often the point of the trip.
    const standing = dayStanding([adj("kever-1", 45)]);
    assert.equal(standing.state, "behind");
    assert.match(standing.says, /45 min behind/);
    assert.match(standing.says, /finish about that much later/);
    assert.doesNotMatch(standing.says, /too long|should have|delay(ed)?|late\b/i);
  });

  it("nets a fast border against a slow kever", () => {
    const standing = dayStanding([adj("border", -100), adj("kever-1", 40)]);
    assert.equal(standing.deltaMins, -60);
    assert.equal(standing.state, "ahead");
  });

  it("always says something", () => {
    for (const all of [[], [adj("a", -100)], [adj("a", 100)], [adj("a", 2)]]) {
      assert.ok(dayStanding(all).says.length > 15);
    }
  });
});

describe("what a stop reads as", () => {
  it("says nothing about a stop nobody has answered for", () => {
    assert.equal(describeStop(undefined), "");
    assert.equal(describeStop(adj("a", 0)), "");
  });

  it("distinguishes asking for longer from simply taking longer", () => {
    assert.match(describeStop(adj("a", 30, NOW, "longer")), /30 min longer here/);
    assert.match(describeStop(adj("a", 30, NOW, "done")), /30 min over the plan/);
  });

  it("calls a saving a saving", () => {
    assert.match(describeStop(adj("a", -45)), /45 min quicker than planned/);
  });
});

describe("the border, which is the biggest guess in the day", () => {
  it("admits the allowance is a guess, and says what it is", () => {
    const said = borderAsk(120, false);
    assert.match(said, /2 h/);
    assert.match(said, /guess/);
  });

  it("does not call a checked figure a guess", () => {
    assert.doesNotMatch(borderAsk(45, true), /guess/);
  });

  it("names a border leg the same way every time", () => {
    assert.equal(borderStopId("PL", "UA"), "border:PL>UA");
  });
});

describe("how a span reads", () => {
  it("is always positive — the direction is in the words", () => {
    assert.equal(formatSpan(-100), "1 h 40 min");
    assert.equal(formatSpan(45), "45 min");
    assert.equal(formatSpan(120), "2 h");
  });
});
