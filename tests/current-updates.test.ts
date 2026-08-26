import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_DETAIL_CHARS,
  currentUpdatesFor,
  emptyUpdate,
  hasExpired,
  isCurrent,
  sortForAdmin,
  updateProblem,
  type CurrentUpdate,
} from "@/data/current-updates";

/**
 * What is true about a place this month, and stops being true on a date.
 *
 * THE FAILURE THIS EXISTS TO PREVENT is a "temporary" notice from two Pesachs
 * ago still sitting on a destination page. That is worse than never having
 * said anything, because it teaches a reader that the dated information here
 * is not dated at all. So the tests that matter most are the ones about the
 * end date: that it is required, and that passing it removes an update with
 * nobody having to tidy anything.
 */

const TODAY = "2026-08-26";

function anUpdate(over: Partial<CurrentUpdate> = {}): CurrentUpdate {
  return {
    id: "u1",
    kind: "seasonal",
    title: "Pesach minyan at the Grand",
    detail: "Shacharis 8:00, Mincha 20 minutes before shkia, in the second-floor lounge.",
    destinationSlug: "rome",
    startsOn: "2026-08-01",
    endsOn: "2026-09-30",
    source: "Rang the hotel",
    published: true,
    createdAt: "2026-07-20T00:00:00Z",
    updatedAt: "2026-07-20T00:00:00Z",
    ...over,
  };
}

describe("an update stops being shown on its own", () => {
  it("shows one inside its window", () => {
    assert.equal(isCurrent(anUpdate(), TODAY), true);
  });

  it("hides one whose window has passed, with nobody tidying anything", () => {
    const lapsed = anUpdate({ startsOn: "2025-03-01", endsOn: "2025-04-30" });
    assert.equal(isCurrent(lapsed, TODAY), false);
    assert.equal(hasExpired(lapsed, TODAY), true);
    assert.deepEqual(currentUpdatesFor([lapsed], "rome", TODAY), []);
  });

  it("hides one that has not started yet", () => {
    const future = anUpdate({ startsOn: "2026-12-01", endsOn: "2026-12-31" });
    assert.equal(isCurrent(future, TODAY), false);
    assert.equal(hasExpired(future, TODAY), false, "not started is not the same as expired");
  });

  it("counts the first and last day as inside", () => {
    assert.equal(isCurrent(anUpdate({ startsOn: TODAY, endsOn: TODAY }), TODAY), true);
  });
});

describe("nothing reaches a visitor by accident", () => {
  it("needs all three: published, current, and about this place", () => {
    const live = anUpdate({ id: "live" });
    assert.deepEqual(currentUpdatesFor([live], "rome", TODAY).map((u) => u.id), ["live"]);

    assert.deepEqual(currentUpdatesFor([anUpdate({ published: false })], "rome", TODAY), []);
    assert.deepEqual(currentUpdatesFor([live], "vienna", TODAY), []);
    assert.deepEqual(currentUpdatesFor([anUpdate({ endsOn: "2026-08-25" })], "rome", TODAY), []);
  });

  it("shows nothing for an update attached to no place", () => {
    // Deliberate: there is no site-wide noticeboard for one to drift onto.
    assert.deepEqual(currentUpdatesFor([anUpdate({ destinationSlug: "" })], "", TODAY).length, 1);
    assert.deepEqual(currentUpdatesFor([anUpdate({ destinationSlug: "" })], "rome", TODAY), []);
  });

  it("puts the one lapsing soonest first", () => {
    const soon = anUpdate({ id: "soon", endsOn: "2026-08-28" });
    const later = anUpdate({ id: "later", endsOn: "2026-09-30" });
    assert.deepEqual(currentUpdatesFor([later, soon], "rome", TODAY).map((u) => u.id), ["soon", "later"]);
  });

  it("breaks a tie on the same end date with the newer one", () => {
    const older = anUpdate({ id: "older", endsOn: "2026-09-01", createdAt: "2026-07-01T00:00:00Z" });
    const newer = anUpdate({ id: "newer", endsOn: "2026-09-01", createdAt: "2026-08-20T00:00:00Z" });
    assert.deepEqual(currentUpdatesFor([older, newer], "rome", TODAY).map((u) => u.id), ["newer", "older"]);
  });
});

describe("what stops one being published", () => {
  it("refuses an empty one, saying which part is missing", () => {
    const problem = updateProblem(emptyUpdate());
    assert.match(problem ?? "", /title/i);
  });

  it("insists on an end date, because that is the whole point", () => {
    const draft = { ...emptyUpdate(), title: "x", detail: "y", startsOn: "2026-08-01" };
    assert.match(updateProblem(draft) ?? "", /stops being true/i);
  });

  it("refuses a window that ends before it starts", () => {
    const draft = { ...emptyUpdate(), title: "x", detail: "y", startsOn: "2026-09-01", endsOn: "2026-08-01" };
    assert.match(updateProblem(draft) ?? "", /before it starts/i);
  });

  it("keeps it a notice rather than an article", () => {
    const draft = { ...emptyUpdate(), title: "x", detail: "y".repeat(MAX_DETAIL_CHARS + 1), startsOn: "2026-08-01", endsOn: "2026-09-01" };
    assert.match(updateProblem(draft) ?? "", /characters/i);
  });

  it("passes a complete one", () => {
    const draft = { ...emptyUpdate(), title: "Moved", detail: "Now on the next street.", startsOn: "2026-08-01", endsOn: "2026-09-01" };
    assert.equal(updateProblem(draft), null);
  });

  it("says one thing at a time, not a wall", () => {
    // The editor shows one line under one Save button.
    const problem = updateProblem(emptyUpdate());
    assert.ok(problem && !problem.includes("\n"), "the problem is a list rather than a sentence");
  });
});

describe("the owner's own list", () => {
  it("puts what is live first, then what is coming, then what has lapsed", () => {
    const live = anUpdate({ id: "live" });
    const future = anUpdate({ id: "future", startsOn: "2026-12-01", endsOn: "2026-12-31" });
    const gone = anUpdate({ id: "gone", startsOn: "2025-01-01", endsOn: "2025-02-01" });
    assert.deepEqual(sortForAdmin([gone, future, live], TODAY).map((u) => u.id), ["live", "future", "gone"]);
  });

  it("keeps what has lapsed rather than dropping it", () => {
    // An expired update is still the record of what was true, and the same one
    // may be worth bringing back next Sukkos.
    const gone = anUpdate({ id: "gone", startsOn: "2025-01-01", endsOn: "2025-02-01" });
    assert.equal(sortForAdmin([gone], TODAY).length, 1);
  });
});
