import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KEEP_COUNT,
  KEEP_DAYS,
  KIND_AREA,
  RECYCLE_KINDS,
  ageWords,
  binSummary,
  daysLeft,
  describeDeleted,
  expired,
  groupedByKind,
  stillKept,
  type Deleted,
} from "@/lib/recycle";

/**
 * Getting back something that was deleted.
 *
 * Every "Remove" in the admin sits next to "Edit" and is final. A shomer's
 * number took a phone call to get; one mis-tap and there is nothing anywhere
 * that says it ever existed — the row is simply not in the list, and nobody
 * can tell whether it was deleted or never entered.
 *
 * The thing that must not go wrong: an entry that cannot age out. A bin that
 * only grows is a private store filling up with things nobody will ever
 * restore, and the one entry somebody does want is at the bottom of it.
 */

const TODAY = "2026-07-31";

function daysAgo(n: number): string {
  return new Date(Date.parse(`${TODAY}T12:00:00Z`) - n * 86_400_000).toISOString();
}

function row(over: Partial<Deleted> = {}): Deleted {
  return {
    id: over.id ?? "bin-1",
    kind: over.kind ?? "cemetery-contact",
    rowId: over.rowId ?? "row-1",
    title: over.title ?? "Shomer",
    detail: over.detail,
    deletedAt: over.deletedAt ?? daysAgo(1),
    payload: over.payload ?? { label: "Shomer", phone: "+48 000" },
  };
}

describe("what the bin still holds", () => {
  it("keeps the newest at the top", () => {
    const rows = [
      row({ id: "a", deletedAt: daysAgo(5) }),
      row({ id: "b", deletedAt: daysAgo(1) }),
      row({ id: "c", deletedAt: daysAgo(3) }),
    ];
    assert.deepEqual(stillKept(rows, TODAY).map((r) => r.id), ["b", "c", "a"]);
  });

  it("drops anything older than a month", () => {
    const rows = [row({ id: "old", deletedAt: daysAgo(KEEP_DAYS + 1) }), row({ id: "new", deletedAt: daysAgo(2) })];
    assert.deepEqual(stillKept(rows, TODAY).map((r) => r.id), ["new"]);
    assert.deepEqual(expired(rows, TODAY).map((r) => r.id), ["old"]);
  });

  it("keeps one that is exactly a month old, and not one older", () => {
    assert.equal(stillKept([row({ deletedAt: daysAgo(KEEP_DAYS) })], TODAY).length, 1);
    assert.equal(stillKept([row({ deletedAt: daysAgo(KEEP_DAYS + 1) })], TODAY).length, 0);
  });

  it("holds no more than fifty, and says which fell off", () => {
    const rows = Array.from({ length: KEEP_COUNT + 7 }, (_, i) => row({ id: `r${i}`, deletedAt: daysAgo(i % 20) }));
    assert.equal(stillKept(rows, TODAY).length, KEEP_COUNT);
    assert.equal(expired(rows, TODAY).length, 7);
  });

  it("drops an entry with a date nobody can read", () => {
    // The alternative is an entry that can never age out, sitting at the
    // bottom of the list until somebody clears the store by hand.
    const rows = [row({ id: "bad", deletedAt: "sometime last year" }), row({ id: "fine" })];
    assert.deepEqual(stillKept(rows, TODAY).map((r) => r.id), ["fine"]);
    assert.deepEqual(expired(rows, TODAY).map((r) => r.id), ["bad"]);
  });

  it("is empty rather than throwing on an empty bin", () => {
    assert.deepEqual(stillKept([], TODAY), []);
    assert.deepEqual(expired([], TODAY), []);
  });
});

describe("how old it is, in words", () => {
  it("says today, yesterday, then days, then weeks", () => {
    assert.equal(ageWords(daysAgo(0), TODAY), "today");
    assert.equal(ageWords(daysAgo(1), TODAY), "yesterday");
    assert.equal(ageWords(daysAgo(6), TODAY), "6 days ago");
    assert.equal(ageWords(daysAgo(21), TODAY), "3 weeks ago");
  });

  it("does not pretend to know when it cannot", () => {
    assert.equal(ageWords("rubbish", TODAY), "at some point");
  });
});

describe("how long is left", () => {
  it("counts down from a month", () => {
    assert.equal(daysLeft(daysAgo(0), TODAY), KEEP_DAYS);
    assert.equal(daysLeft(daysAgo(29), TODAY), 1);
    assert.equal(daysLeft(daysAgo(30), TODAY), 0);
    assert.equal(daysLeft(daysAgo(40), TODAY), 0, "never negative");
  });

  it("says it plainly in the line under the title", () => {
    assert.match(describeDeleted(row({ deletedAt: daysAgo(1) }), TODAY), /deleted yesterday · kept 29 more days/);
    assert.match(describeDeleted(row({ deletedAt: daysAgo(30) }), TODAY), /gone after today/);
    assert.match(describeDeleted(row({ deletedAt: daysAgo(29) }), TODAY), /kept one more day/);
  });

  it("names what the thing was and where it lived", () => {
    assert.match(describeDeleted(row({ kind: "burial" }), TODAY), /^Kever · on a beis hachaim/);
    assert.match(describeDeleted(row({ kind: "advertisement" }), TODAY), /^Advertisement · deleted/);
  });
});

describe("grouping and the summary", () => {
  it("groups by what the thing is, leaving out empty groups", () => {
    const rows = [row({ id: "a", kind: "burial" }), row({ id: "b", kind: "burial" }), row({ id: "c", kind: "listing" })];
    const groups = groupedByKind(rows);
    assert.deepEqual(groups.map((g) => g.kind), ["burial", "listing"]);
    assert.equal(groups[0].rows.length, 2);
  });

  it("says what is there, or that nothing is", () => {
    assert.equal(binSummary([]), "Nothing has been deleted in the last month.");
    assert.match(binSummary([row()]), /^One thing deleted in the last 30 days/);
    assert.match(binSummary([row({ id: "a" }), row({ id: "b" })]), /^2 things deleted/);
  });
});

describe("who may see what", () => {
  it("files every kind under an area, so nothing is visible by default", () => {
    // A helper granted only the directory has no business reading which
    // advertisement was deleted.
    for (const kind of RECYCLE_KINDS) {
      assert.ok(KIND_AREA[kind], `${kind} is in no area`);
    }
    assert.equal(KIND_AREA.advertisement, "advertisements");
    assert.equal(KIND_AREA.burial, "directory");
  });
});
