import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DRAFT_MAX_AGE_DAYS,
  type Draft,
  describeDraft,
  draftKey,
  draftableValues,
  fieldsToRestore,
  readDraft,
  sameValues,
  worthOffering,
} from "@/lib/drafts";

/**
 * What you typed but had not saved.
 *
 * The admin's forms save when a button is pressed and not before, which is the
 * right way round — a half-typed overview should not be on the website. It
 * also means the twenty minutes somebody spends writing about a town lives
 * nowhere until they press Save.
 *
 * The rule that keeps this from doing damage: a draft never carries WHICH
 * record it belongs to. It is stored per record already, and a stale identity
 * inside one could send a save to a different row — the one mistake here that
 * could hurt something other than the form it came from.
 */

const NOW = Date.parse("2026-08-02T14:00:00.000Z");
const agoHours = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

function draft(over: Partial<Draft> = {}): Draft {
  return { savedAt: over.savedAt ?? agoHours(1), values: over.values ?? { overview: "Half a paragraph" } };
}

describe("where a draft lives", () => {
  it("is one key per record, never shared", () => {
    assert.notEqual(draftKey("destination", "lizhensk"), draftKey("destination", "uman"));
    assert.match(draftKey("destination", "lizhensk"), /^whiteGloveDraft:/);
  });

  it("ignores empty parts rather than leaving a gap in the key", () => {
    assert.equal(draftKey("page", undefined, "about"), "whiteGloveDraft:page:about");
  });
});

describe("reading what was stored", () => {
  it("takes a draft back", () => {
    const stored = JSON.stringify(draft());
    assert.deepEqual(readDraft(stored), draft());
  });

  it("refuses nonsense rather than throwing on it", () => {
    for (const bad of [null, undefined, "", "not json", "[]", '{"savedAt":1}', '{"values":{}}']) {
      assert.equal(readDraft(bad), null, String(bad));
    }
  });

  it("keeps only text", () => {
    // A form holds text. Anything else came from somewhere this did not write,
    // and putting it into a field would be nonsense.
    const parsed = readDraft(JSON.stringify({ savedAt: agoHours(1), values: { a: "keep", b: 42, c: null } }));
    assert.deepEqual(parsed?.values, { a: "keep" });
  });
});

describe("whether it is worth offering", () => {
  it("offers a recent one with something in it", () => {
    assert.equal(worthOffering(draft(), NOW), true);
  });

  it("does not offer one older than a week", () => {
    // Past that the record underneath has probably moved on, and putting
    // week-old words back would be an overwrite rather than a rescue.
    assert.equal(worthOffering(draft({ savedAt: agoHours(DRAFT_MAX_AGE_DAYS * 24) }), NOW), true);
    assert.equal(worthOffering(draft({ savedAt: agoHours(DRAFT_MAX_AGE_DAYS * 24 + 1) }), NOW), false);
  });

  it("does not offer one holding nothing", () => {
    // A form whose only change was clearing a box stores an empty value, and
    // offering to restore nothing reads as a bug.
    assert.equal(worthOffering(draft({ values: { overview: "   ", summary: "" } }), NOW), false);
    assert.equal(worthOffering(draft({ values: {} }), NOW), false);
  });

  it("does not offer one dated in the future, or not dated at all", () => {
    assert.equal(worthOffering(draft({ savedAt: new Date(NOW + 3_600_000).toISOString() }), NOW), false);
    assert.equal(worthOffering(draft({ savedAt: "whenever" }), NOW), false);
    assert.equal(worthOffering(null, NOW), false);
  });
});

describe("how old it reads", () => {
  it("says it the way a person would", () => {
    assert.equal(describeDraft(draft({ savedAt: new Date(NOW - 20_000).toISOString() }), NOW), "from a moment ago");
    assert.equal(describeDraft(draft({ savedAt: new Date(NOW - 8 * 60_000).toISOString() }), NOW), "from 8 minutes ago");
    assert.equal(describeDraft(draft({ savedAt: agoHours(1) }), NOW), "from 1 hour ago");
    assert.equal(describeDraft(draft({ savedAt: agoHours(5) }), NOW), "from 5 hours ago");
    assert.equal(describeDraft(draft({ savedAt: agoHours(26) }), NOW), "from yesterday");
    assert.equal(describeDraft(draft({ savedAt: agoHours(72) }), NOW), "from 3 days ago");
  });

  it("does not pretend to know when it cannot", () => {
    assert.equal(describeDraft(draft({ savedAt: "rubbish" }), NOW), "from an earlier visit");
  });
});

describe("what restoring would change", () => {
  it("names the fields that differ", () => {
    const d = draft({ values: { overview: "New words", summary: "Same" } });
    assert.deepEqual(fieldsToRestore(d, { overview: "Old words", summary: "Same" }), ["overview"]);
  });

  it("skips a field the form no longer has", () => {
    // The form changed since the draft was written. Writing into a field that
    // is not there would do nothing while claiming otherwise.
    const d = draft({ values: { overview: "New", removedField: "gone" } });
    assert.deepEqual(fieldsToRestore(d, { overview: "Old" }), ["overview"]);
  });

  it("is empty when the draft matches what is on screen", () => {
    assert.deepEqual(fieldsToRestore(draft({ values: { a: "same" } }), { a: "same" }), []);
  });
});

describe("whether the form still holds what it was given", () => {
  it("says yes when nothing moved", () => {
    assert.equal(sameValues({ a: "one", b: "two" }, { a: "one", b: "two" }), true);
  });

  it("says no when a field changed", () => {
    assert.equal(sameValues({ a: "one" }, { a: "ONE" }), false);
  });

  it("counts a missing field and an empty one as the same thing", () => {
    // A checkbox nobody touched is absent from the form data; the same
    // checkbox after a render can be present and empty. Neither is a change.
    assert.equal(sameValues({ a: "one" }, { a: "one", b: "" }), true);
    assert.equal(sameValues({ a: "one", b: "" }, { a: "one" }), true);
  });

  it("says no when a field gained a value", () => {
    assert.equal(sameValues({ a: "one" }, { a: "one", b: "new" }), false);
  });

  it("is the test for whether there is anything to rescue", () => {
    // Typing a letter and deleting it puts the form back where it started.
    // There is nothing to offer back, and saying otherwise would be a lie.
    const loaded = { overview: "The original overview.", city: "Leżajsk", status: "PUBLISHED" };
    assert.equal(sameValues({ ...loaded, overview: "The original overview." }, loaded), true);
    assert.equal(sameValues({ ...loaded, overview: "Half a paragraph" }, loaded), false);
  });
});

describe("what a draft never carries", () => {
  it("leaves out the fields that say which record this is", () => {
    // The one mistake here that could damage something other than this form: a
    // stale identity sending a save to a different row.
    const values = draftableValues(
      Object.entries({
        slug: "lizhensk",
        destinationId: "abc",
        contactId: "def",
        placeId: "ghi",
        overview: "Real words",
        label: "Shomer",
      }),
    );
    assert.deepEqual(values, { overview: "Real words", label: "Shomer" });
  });

  it("leaves out anything that is not text", () => {
    const values = draftableValues([
      ["overview", "words"],
      ["picture", new File([], "x.png") as unknown as FormDataEntryValue],
    ]);
    assert.deepEqual(values, { overview: "words" });
  });

  it("leaves out React's own hidden fields", () => {
    // Every form with a server action carries these, and they say which action
    // runs and what is bound to it. Putting a week-old one back would point
    // Save at whatever page it came from — the same mistake as carrying the
    // record id, with less to show for it.
    const values = draftableValues(
      Object.entries({
        $ACTION_KEY: "k65d8eccb9defccdc",
        $ACTION_REF_3: "",
        "$ACTION_3:0": '{"id":"6026b1b265","bound":"$@1"}',
        "$ACTION_3:1": "[null]",
        overview: "Real words",
      }),
    );
    assert.deepEqual(values, { overview: "Real words" });
  });

  it("drops them on the way back in too", () => {
    // Storage is an outside thing: another tab, an extension, or an older
    // version of this code put what is in it there.
    const parsed = readDraft(
      JSON.stringify({ savedAt: agoHours(1), values: { $ACTION_KEY: "abc", slug: "uman", overview: "Real words" } }),
    );
    assert.deepEqual(parsed?.values, { overview: "Real words" });
  });

  it("is not worth offering when React's fields are all that is in it", () => {
    // A form somebody typed into and then emptied. Without the filter these
    // would make it look full of work and it would be offered back.
    const stored = JSON.stringify({ savedAt: agoHours(1), values: { $ACTION_KEY: "abc", overview: "" } });
    assert.equal(worthOffering(readDraft(stored), NOW), false);
  });
});
