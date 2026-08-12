import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  countdownPhrase,
  daysBetween,
  followAlong,
  minutesOfClock,
  tripProgress,
  type FollowStop,
} from "@/lib/trip-progress";

/**
 * The countdown, and following along once the trip starts.
 *
 * The planner said the same thing on the morning of the flight as it did four
 * months earlier, and the same thing again on the third morning in Kraków —
 * when the only question anybody has is "where am I meant to be now".
 *
 * Two things must not go wrong. A trip with no dates must not read as "today",
 * and a stop the planner could not put a time on must never be given one here:
 * that would put somebody at a kever the plan never said they would be at.
 */

const at = (name: string, arrivalTime?: string, departureTime?: string): FollowStop => ({
  id: name,
  name,
  arrivalTime,
  departureTime,
});

describe("how far off the trip is", () => {
  it("counts the days while it is ahead", () => {
    const p = tripProgress({ startDate: "2026-08-20", endDate: "2026-08-27", today: "2026-07-31" });
    assert.equal(p.phase, "before");
    assert.equal(p.daysUntil, 20);
    assert.equal(p.totalDays, 8);
    assert.equal(p.headline, "20 days to go");
    assert.match(p.detail ?? "", /August 20, 2026/);
  });

  it("says tomorrow rather than 1 day", () => {
    const p = tripProgress({ startDate: "2026-08-01", endDate: "2026-08-08", today: "2026-07-31" });
    assert.equal(p.headline, "Tomorrow");
    assert.equal(p.daysUntil, 1);
  });

  it("is on its first day the day it starts, not still counting down", () => {
    const p = tripProgress({ startDate: "2026-07-31", endDate: "2026-08-07", today: "2026-07-31" });
    assert.equal(p.phase, "during");
    assert.equal(p.dayNumber, 1);
    assert.equal(p.headline, "Day 1 of 8");
  });

  it("counts the day you are on while it is happening", () => {
    const p = tripProgress({ startDate: "2026-07-29", endDate: "2026-08-05", today: "2026-07-31" });
    assert.equal(p.phase, "during");
    assert.equal(p.dayNumber, 3);
    assert.equal(p.daysLeft, 6);
    assert.equal(p.headline, "Day 3 of 8");
    assert.equal(p.followDate, "2026-07-31");
  });

  it("says last day on the last day", () => {
    const p = tripProgress({ startDate: "2026-07-25", endDate: "2026-07-31", today: "2026-07-31" });
    assert.equal(p.dayNumber, 7);
    assert.equal(p.daysLeft, 1);
    assert.match(p.detail ?? "", /last day/);
  });

  it("knows when it is over", () => {
    const p = tripProgress({ startDate: "2026-06-01", endDate: "2026-06-08", today: "2026-07-31" });
    assert.equal(p.phase, "after");
    assert.equal(p.headline, "This trip has finished");
    assert.equal(p.followDate, null);
  });

  it("does not call a trip with no dates 'today'", () => {
    // Zero would read as "it starts this morning", which is the one thing it
    // does not mean.
    for (const dates of [{}, { startDate: "2026-08-01" }, { endDate: "2026-08-08" }, { startDate: "nonsense", endDate: "also" }]) {
      const p = tripProgress({ ...dates, today: "2026-07-31" });
      assert.equal(p.phase, "no-dates", JSON.stringify(dates));
      assert.equal(p.daysUntil, null);
      assert.equal(p.headline, "No dates yet");
    }
  });

  it("refuses a trip that finishes before it starts", () => {
    const p = tripProgress({ startDate: "2026-08-10", endDate: "2026-08-01", today: "2026-07-31" });
    assert.equal(p.phase, "no-dates");
  });

  it("describes the trip rather than counting it when the device date is unknown", () => {
    // Server-rendered, before the browser has said what day it is where the
    // traveler is standing.
    const p = tripProgress({ startDate: "2026-08-20", endDate: "2026-08-27", today: "" });
    assert.equal(p.totalDays, 8);
    assert.equal(p.headline, "8 days");
    assert.equal(p.daysUntil, null, "never a number it cannot stand behind");
  });

  it("counts whole days across a month, a year and a leap day", () => {
    assert.equal(daysBetween("2026-07-31", "2026-08-01"), 1);
    assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
    assert.equal(daysBetween("2028-02-28", "2028-03-01"), 2, "2028 is a leap year");
    assert.equal(daysBetween("2026-08-01", "2026-07-31"), -1);
    assert.equal(daysBetween("nope", "2026-07-31"), null);
  });
});

describe("the short phrase beside a trip name", () => {
  const on = (today: string) => countdownPhrase(tripProgress({ startDate: "2026-08-05", endDate: "2026-08-12", today }));

  it("reads as a phrase, not a sentence", () => {
    assert.equal(on("2026-07-31"), "in 5 days");
    assert.equal(on("2026-08-04"), "tomorrow");
    assert.equal(on("2026-08-07"), "on now — day 3 of 8");
    assert.equal(on("2026-09-01"), "finished");
  });

  it("says nothing at all for a trip with no dates", () => {
    assert.equal(countdownPhrase(tripProgress({ today: "2026-07-31" })), null);
  });

  it("is on the shared and printed views, not only the planner", () => {
    const shared = readFileSync("app/i/[shareId]/page.tsx", "utf8");
    const printed = readFileSync("components/PrintableItinerary.tsx", "utf8");
    assert.match(shared, /TripProgressStrip/, "the shared trip has no countdown");
    assert.match(printed, /tripProgress/, "the printed trip has no countdown");
  });
});

describe("reading a clock time", () => {
  it("takes the times the planner writes", () => {
    assert.equal(minutesOfClock("08:00"), 480);
    assert.equal(minutesOfClock("9:05"), 545);
    assert.equal(minutesOfClock("23:59"), 1439);
  });

  it("refuses anything else rather than guessing at it", () => {
    for (const bad of ["", undefined, "morning", "24:00", "12:60", "8", "08:00:00"]) {
      assert.equal(minutesOfClock(bad), null, String(bad));
    }
  });
});

describe("following along on the day", () => {
  const day = [at("Kever of the Rebbe", "09:00", "10:30"), at("Beis hachaim", "11:15", "12:30"), at("Mikveh", "16:00")];

  it("names where you should be right now", () => {
    const f = followAlong({ stops: day, nowMinutes: minutesOfClock("09:40") });
    assert.equal(f.now?.name, "Kever of the Rebbe");
    assert.equal(f.next?.name, "Beis hachaim");
    assert.match(f.says, /Kever of the Rebbe now, until about 10:30/);
  });

  it("says what is next while you are driving between two", () => {
    // Nothing is "now" in the car. Claiming the traveler is already at the
    // next kever would be worse than telling them when it starts.
    const f = followAlong({ stops: day, nowMinutes: minutesOfClock("10:45") });
    assert.equal(f.now, null);
    assert.equal(f.next?.name, "Beis hachaim");
    assert.equal(f.doneCount, 1);
    assert.match(f.says, /Next: Beis hachaim at about 11:15/);
  });

  it("counts what is behind you", () => {
    const f = followAlong({ stops: day, nowMinutes: minutesOfClock("16:30") });
    assert.equal(f.doneCount, 2);
    assert.equal(f.now?.name, "Mikveh", "a stop with no leaving time runs to the end of the day");
    assert.equal(f.next, null);
  });

  it("says so when the day is over", () => {
    const short = [at("Kever", "09:00", "10:00")];
    const f = followAlong({ stops: short, nowMinutes: minutesOfClock("22:00") });
    assert.equal(f.now, null);
    assert.equal(f.next, null);
    assert.equal(f.doneCount, 1);
    assert.match(f.says, /behind you/);
  });

  it("points at the first stop before the day begins", () => {
    const f = followAlong({ stops: day, nowMinutes: minutesOfClock("06:00") });
    assert.equal(f.now, null);
    assert.equal(f.next?.name, "Kever of the Rebbe");
    assert.equal(f.doneCount, 0);
  });

  it("never puts a stop with no time onto the clock", () => {
    // The thing that must not happen: somebody sent to a kever the plan never
    // said they would be at.
    const mixed = [at("Timed", "09:00", "10:00"), at("No time at all")];
    const f = followAlong({ stops: mixed, nowMinutes: minutesOfClock("09:30") });
    assert.equal(f.now?.name, "Timed");
    assert.deepEqual(f.untimed.map((s) => s.name), ["No time at all"]);
    assert.equal(f.timedCount, 1);
    assert.ok(![f.now, f.next, ...f.done].some((s) => s?.name === "No time at all"));
  });

  it("still lists a day where nothing has a time", () => {
    const f = followAlong({ stops: [at("Somewhere"), at("Somewhere else")], nowMinutes: 600 });
    assert.equal(f.now, null);
    assert.equal(f.untimed.length, 2);
    assert.match(f.says, /2 stops planned today, with no times on them/);
  });

  it("says plainly when there is nothing at all", () => {
    assert.match(followAlong({ stops: [], nowMinutes: 600 }).says, /Nothing is planned for today/);
  });

  it("names the first stop when the clock is unknown", () => {
    // Server-rendered, before the browser has told us the time.
    const f = followAlong({ stops: day, nowMinutes: null });
    assert.equal(f.now, null);
    assert.equal(f.next?.name, "Kever of the Rebbe");
    assert.match(f.says, /First today/);
  });

  it("reads the day in clock order however it was entered", () => {
    const jumbled = [at("Afternoon", "15:00", "16:00"), at("Morning", "09:00", "10:00")];
    const f = followAlong({ stops: jumbled, nowMinutes: minutesOfClock("09:30") });
    assert.equal(f.now?.name, "Morning");
    assert.equal(f.next?.name, "Afternoon");
  });

  it("holds you at a stop right up to its leaving minute", () => {
    const one = [at("Kever", "09:00", "10:00")];
    assert.equal(followAlong({ stops: one, nowMinutes: 599 }).now?.name, "Kever", "09:59 is still there");
    assert.equal(followAlong({ stops: one, nowMinutes: 600 }).now, null, "10:00 is not");
  });
});
