import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHANGE_AREA,
  CHANGE_KINDS,
  KEEP_COUNT,
  KEEP_DAYS,
  describeChange,
  fieldLabel,
  fieldsChanged,
  logSummary,
  shorten,
  stillLogged,
  undoValues,
  whenWords,
  type Change,
} from "@/lib/changes";

/**
 * What changed, what it said before, and who changed it.
 *
 * The recycle bin covers a deletion. It does not cover the quieter way to lose
 * something: saving over it. A digit retyped wrong in a shomer's number, a
 * short overview pasted over a long one — and there was no record anywhere
 * that the page had ever said anything else.
 *
 * The rule that decides whether this is readable at all: **only the fields
 * that really differ**. A form save writes every field it holds, so recording
 * "the save" would say fourteen things changed when one telephone digit did.
 */

const TODAY = "2026-07-31";
const daysAgo = (n: number) => new Date(Date.parse(`${TODAY}T12:00:00Z`) - n * 86_400_000).toISOString();

function change(over: Partial<Change> = {}): Change {
  return {
    id: over.id ?? "c1",
    kind: over.kind ?? "contact",
    rowId: over.rowId ?? "row-1",
    title: over.title ?? "Shomer",
    who: over.who ?? "owner@example.com",
    at: over.at ?? daysAgo(1),
    fields: over.fields ?? [{ field: "phone", before: "+48 111", after: "+48 222" }],
  };
}

describe("what actually differs", () => {
  it("records only the fields that changed", () => {
    // The whole point. A form save writes everything it holds.
    const diff = fieldsChanged(
      { label: "Shomer", phone: "+48 111", note: "Rings early" },
      { label: "Shomer", phone: "+48 222", note: "Rings early" },
    );
    assert.deepEqual(diff, [{ field: "phone", before: "+48 111", after: "+48 222" }]);
  });

  it("treats empty, null and undefined as one thing", () => {
    // Otherwise clearing a box that was already empty reads as a change.
    assert.deepEqual(fieldsChanged({ note: null }, { note: "" }), []);
    assert.deepEqual(fieldsChanged({ note: undefined }, { note: "   " }), []);
    assert.deepEqual(fieldsChanged({ note: "" }, { note: null }), []);
  });

  it("says what a field was cleared from", () => {
    assert.deepEqual(fieldsChanged({ note: "Rings early" }, { note: "" }), [
      { field: "note", before: "Rings early", after: null },
    ]);
  });

  it("leaves out the bookkeeping the site writes itself", () => {
    const diff = fieldsChanged(
      { id: "a", updatedAt: "2026-01-01", lastVerified: "2026-01-01", phone: "1" },
      { id: "a", updatedAt: "2026-07-31", lastVerified: "2026-07-31", phone: "2" },
    );
    assert.deepEqual(diff.map((d) => d.field), ["phone"]);
  });

  it("does not treat an omitted field as cleared", () => {
    // A partial update says nothing about the fields it leaves out.
    assert.deepEqual(fieldsChanged({ phone: "1", note: "keep me" }, { phone: "1" }), []);
  });

  it("ignores a field the 'before' read never asked about", () => {
    // Found by running this against a real database. One writer's `select`
    // left out `status`, so every save read as "status went from nothing to
    // NEEDS_VERIFICATION" — and undoing that then wrote null into a column
    // that cannot be null. A Prisma select returns every field it names, null
    // ones included, so a missing key really does mean "not asked".
    assert.deepEqual(fieldsChanged({ phone: "1" }, { phone: "1", status: "NEEDS_VERIFICATION" }), []);
    assert.deepEqual(fieldsChanged({ phone: "1", status: null }, { phone: "1", status: "VERIFIED" }), [
      { field: "status", before: null, after: "VERIFIED" },
    ]);
  });

  it("reads a list as the text somebody sees", () => {
    assert.deepEqual(fieldsChanged({ regions: ["Poland"] }, { regions: ["Poland", "Ukraine"] }), [
      { field: "regions", before: "Poland", after: "Poland, Ukraine" },
    ]);
    assert.deepEqual(fieldsChanged({ regions: [] }, { regions: [] }), []);
  });

  it("compares a date by its day, not its milliseconds", () => {
    assert.deepEqual(fieldsChanged({ when: new Date("2026-07-31T09:00:00Z") }, { when: new Date("2026-07-31T21:00:00Z") }), []);
  });

  it("comes back in a fixed order whatever order the object had", () => {
    const diff = fieldsChanged({ b: "1", a: "1" }, { b: "2", a: "2" });
    assert.deepEqual(diff.map((d) => d.field), ["a", "b"]);
  });

  it("is empty when nothing changed, so nothing gets logged", () => {
    assert.deepEqual(fieldsChanged({ a: "1" }, { a: "1" }), []);
  });
});

describe("how a change reads", () => {
  it("names one field in the singular", () => {
    assert.equal(describeChange(change()), "Phone changed.");
  });

  it("lists them when there are several", () => {
    const many = change({
      fields: [
        { field: "phone", before: "1", after: "2" },
        { field: "yiddishName", before: null, after: "רב" },
      ],
    });
    assert.equal(describeChange(many), "2 things changed: phone, yiddish name.");
  });

  it("says a field name the way a person would", () => {
    assert.equal(fieldLabel("yiddishCity"), "Yiddish city");
    assert.equal(fieldLabel("safetyNote"), "Safety note");
    assert.equal(fieldLabel("phone"), "Phone");
  });

  it("shortens long text and says 'nothing' for empty", () => {
    assert.equal(shorten(null), "nothing");
    assert.equal(shorten("short"), "short");
    assert.equal(shorten("x".repeat(200)).length, 90);
    assert.match(shorten("x".repeat(200)), /…$/);
    assert.equal(shorten("lots   of\n  space"), "lots of space");
  });
});

describe("when it happened", () => {
  it("says today, yesterday, days, then weeks", () => {
    assert.equal(whenWords(daysAgo(0), TODAY), "today");
    assert.equal(whenWords(daysAgo(1), TODAY), "yesterday");
    assert.equal(whenWords(daysAgo(5), TODAY), "5 days ago");
    assert.equal(whenWords(daysAgo(21), TODAY), "3 weeks ago");
  });

  it("does not pretend to know when it cannot", () => {
    assert.equal(whenWords("not a date", TODAY), "at some point");
  });
});

describe("what the log holds", () => {
  it("keeps the newest at the top", () => {
    const rows = [change({ id: "a", at: daysAgo(4) }), change({ id: "b", at: daysAgo(1) })];
    assert.deepEqual(stillLogged(rows, TODAY).map((r) => r.id), ["b", "a"]);
  });

  it("drops anything over a month old, and anything undateable", () => {
    const rows = [
      change({ id: "old", at: daysAgo(KEEP_DAYS + 1) }),
      change({ id: "bad", at: "whenever" }),
      change({ id: "fine", at: daysAgo(2) }),
    ];
    assert.deepEqual(stillLogged(rows, TODAY).map((r) => r.id), ["fine"]);
  });

  it("holds no more than the cap", () => {
    const rows = Array.from({ length: KEEP_COUNT + 5 }, (_, i) => change({ id: `r${i}`, at: daysAgo(i % 10) }));
    assert.equal(stillLogged(rows, TODAY).length, KEEP_COUNT);
  });
});

describe("the summary", () => {
  it("says nothing happened when nothing did", () => {
    assert.equal(logSummary([]), "Nothing has been changed in the last month.");
  });

  it("counts, and names how many people when it was more than one", () => {
    assert.match(logSummary([change()]), /^One change in the last 30 days\. /);
    assert.doesNotMatch(logSummary([change({ id: "a" }), change({ id: "b" })]), /by \d+ people/);
    assert.match(
      logSummary([change({ id: "a", who: "a@x.com" }), change({ id: "b", who: "b@x.com" })]),
      /by 2 people/,
    );
  });
});

describe("putting it back", () => {
  it("is the old values, and only the fields that changed", () => {
    const c = change({
      fields: [
        { field: "phone", before: "+48 111", after: "+48 222" },
        { field: "note", before: null, after: "new note" },
      ],
    });
    assert.deepEqual(undoValues(c), { phone: "+48 111", note: null });
  });
});

describe("who may see what", () => {
  it("files every kind under an area", () => {
    for (const kind of CHANGE_KINDS) assert.ok(CHANGE_AREA[kind], `${kind} is in no area`);
    assert.equal(CHANGE_AREA.page, "content");
    assert.equal(CHANGE_AREA.burial, "directory");
  });
});
