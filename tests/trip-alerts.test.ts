import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tripReadiness, type StopFacts } from "@/lib/command-center";
import { tripAlerts } from "@/lib/trip-alerts";

/**
 * The things a trip should say without being asked.
 *
 * Shabbos leads, and not because it is the likeliest — because finding out
 * late is a different order of problem. A missing shomer number found on the
 * day costs a morning. A kever visit planned for Shabbos, found on the day,
 * makes somebody choose between the plan and the day itself.
 *
 * 2026-09-05 is a Saturday and 2026-09-04 a Friday; the dates below are picked
 * for that rather than at random.
 */

const stop = (over: Partial<StopFacts> = {}): StopFacts => ({
  id: "s1",
  name: "Lizhensk",
  isKever: true,
  contacts: [{ label: "Shomer", phone: "+48 1" }],
  coordinates: "50.25, 22.42",
  address: "Górna 16",
  plannedDate: "2026-09-01",
  ...over,
});

const alerts = (stops: StopFacts[], over: Partial<Parameters<typeof tripAlerts>[0]> = {}) =>
  tripAlerts({ stops, readiness: tripReadiness(stops), today: "2026-09-01", ...over });

describe("Shabbos", () => {
  it("says so, loudest, when a stop is on Shabbos", () => {
    const found = alerts([stop({ plannedDate: "2026-09-05" })]);
    const shabbos = found.find((a) => a.kind === "shabbos");
    assert.equal(shabbos?.urgency, 1);
    assert.match(shabbos!.headline, /Lizhensk is planned for Shabbos/);
  });

  it("counts them when there is more than one", () => {
    const found = alerts([
      stop({ id: "a", name: "Lizhensk", plannedDate: "2026-09-05" }),
      stop({ id: "b", name: "Uman", plannedDate: "2026-09-12" }),
    ]);
    assert.match(found[0].headline, /2 stops are planned for Shabbos/);
    assert.match(found[0].detail ?? "", /Lizhensk/);
    assert.match(found[0].detail ?? "", /Uman/);
  });

  it("warns about erev Shabbos separately, and less loudly", () => {
    const found = alerts([stop({ plannedDate: "2026-09-04" })]);
    const erev = found.find((a) => a.kind === "shabbos");
    assert.equal(erev?.urgency, 2);
    assert.match(erev!.headline, /erev Shabbos/);
  });

  it("gives the candle-lighting time when it can be worked out", () => {
    // A Friday at 15:00 in December is a different problem from one in June,
    // and the candle time is what says which.
    const found = alerts([stop({ plannedDate: "2026-12-04" })]);
    const erev = found.find((a) => a.kind === "shabbos");
    assert.match(erev?.detail ?? "", /candles \d{1,2}:\d{2}/);
  });

  it("stays silent about an ordinary weekday", () => {
    assert.equal(alerts([stop({ plannedDate: "2026-09-02" })]).some((a) => a.kind === "shabbos"), false);
  });

  it("says nothing about Shabbos for a stop with no date", () => {
    const found = alerts([stop({ id: "a", plannedDate: "" }), stop({ id: "b", plannedDate: "2026-09-02" })]);
    assert.equal(found.some((a) => a.kind === "shabbos"), false);
  });
});

describe("leaving soon with something unresolved", () => {
  const unready = stop({ contacts: [], plannedDate: "2026-09-10" });

  it("is urgent when the trip is days away", () => {
    const found = alerts([unready], { startDate: "2026-09-04" });
    const soon = found.find((a) => a.kind === "leaving-soon");
    assert.equal(soon?.urgency, 1);
    assert.match(soon!.headline, /in 3 days/);
    assert.match(soon!.headline, /still needs something/);
  });

  it("is quiet when the trip is months away", () => {
    const found = alerts([unready], { startDate: "2026-12-01" });
    assert.equal(found.find((a) => a.kind === "leaving-soon")?.urgency, 3);
  });

  it("says nothing once the trip is under way", () => {
    const found = alerts([unready], { startDate: "2026-08-20" });
    assert.equal(found.some((a) => a.kind === "leaving-soon"), false);
  });

  it("says nothing when every stop is ready", () => {
    const found = alerts([stop({ plannedDate: "2026-09-10" })], { startDate: "2026-09-04" });
    assert.equal(found.some((a) => a.kind === "leaving-soon"), false);
  });

  it("says nothing when there is no start date to count from", () => {
    assert.equal(alerts([unready]).some((a) => a.kind === "leaving-soon"), false);
  });
});

describe("a trip with no dates at all", () => {
  it("says the Shabbos check could not run", () => {
    // The dangerous reading of silence is "no problems". This says which.
    const found = alerts([stop({ id: "a", plannedDate: "" }), stop({ id: "b", plannedDate: "" })]);
    const none = found.find((a) => a.kind === "no-dates");
    assert.equal(none?.urgency, 3);
    assert.match(none!.headline, /nothing has been checked against Shabbos/);
  });

  it("does not say it when even one stop is dated", () => {
    const found = alerts([stop({ id: "a", plannedDate: "" }), stop({ id: "b", plannedDate: "2026-09-02" })]);
    assert.equal(found.some((a) => a.kind === "no-dates"), false);
  });

  it("says nothing at all for a trip with no stops", () => {
    assert.deepEqual(alerts([]), []);
  });
});

describe("the order they appear in", () => {
  it("puts Shabbos above everything else", () => {
    const found = alerts(
      [
        stop({ id: "a", name: "Lizhensk", plannedDate: "2026-09-05" }),
        stop({ id: "b", name: "Uman", plannedDate: "2026-09-10", contacts: [] }),
      ],
      { startDate: "2026-09-04" },
    );
    assert.equal(found[0].kind, "shabbos");
    assert.deepEqual(found.map((a) => a.urgency), [...found.map((a) => a.urgency)].sort());
  });

  it("is empty when there is nothing to say", () => {
    assert.deepEqual(alerts([stop({ plannedDate: "2026-09-02" })], { startDate: "2026-09-02" }), []);
  });
});
