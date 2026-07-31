import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DESTINATION_SECTIONS } from "@/lib/destination-sections";
import { PROVIDER_CATEGORY_LABELS } from "@/data/directory";

/**
 * A Yiddish label has to be a Yiddish word.
 *
 * The site carried a dozen that were not: טראַנספארט for "transport",
 * דרייווערס for "drivers", דירעקטאָרי for "directory", סערוויסעס for
 * "services", טור־אָפּעראַטאָרן for "tour operators". To somebody who reads
 * Yiddish those are not translations — they are the English word made harder
 * to read, and they say the site cannot tell the difference.
 *
 * These tests do not judge the language; nothing can do that automatically.
 * What they do is make adding one a deliberate act: a new Yiddish label fails
 * until somebody puts it on the list below, having decided it is a real word.
 */

/**
 * Every Yiddish label the site is allowed to show, and what it says.
 *
 * תפילות, שבת and כשר were given by the owner, who speaks the language.
 * Hospital, emergency and parking he marked as having no natural Yiddish, so
 * they stay English — that is the right answer for them, not a gap.
 */
const APPROVED: Record<string, string> = {
  "כשרות עסן": "kashrus esn — kosher food",
  "מנינים": "minyanim",
  "מקוה": "mikvah",
  "אכסניא": "achsanya — lodging",
  "תפילות": "tefillos",
  "שבת": "Shabbos",
  "כשר": "kosher — the shops section",
};

describe("Yiddish on the destination sections", () => {
  it("shows a Yiddish heading only where there is a real word for it", () => {
    for (const section of DESTINATION_SECTIONS) {
      if (!section.yiddish) continue;
      assert.ok(
        section.yiddish in APPROVED,
        `${section.key} carries "${section.yiddish}" — add it to APPROVED only if it is a real Yiddish word, not an English one in Hebrew letters`,
      );
    }
  });

  it("has dropped the ones that were English in Hebrew letters", () => {
    const gone = ["טראַנספארט", "דרייווערס", "פליגפעלד"];
    const present = DESTINATION_SECTIONS.map((s) => s.yiddish).filter(Boolean);
    for (const word of gone) assert.ok(!present.includes(word), `${word} is English spelled in Hebrew letters`);
  });

  it("still names every section in English", () => {
    // Removing a heading must never leave a section with no heading at all.
    for (const section of DESTINATION_SECTIONS) assert.ok(section.label.trim(), `${section.key} has no English heading`);
  });
});

describe("the sections the owner said have no natural Yiddish", () => {
  it("leaves hospital, emergency and parking in English", () => {
    // Not a gap waiting to be filled. Some things are said in English by the
    // people who would be reading this, and inventing a word for them would
    // be the same mistake as before in the other direction.
    for (const key of ["HOSPITAL", "EMERGENCY", "PARKING"]) {
      const section = DESTINATION_SECTIONS.find((s) => s.key === key);
      assert.equal(section?.yiddish, undefined, `${key} should stay English`);
    }
  });

  it("carries the three that do", () => {
    const of = (key: string) => DESTINATION_SECTIONS.find((s) => s.key === key)?.yiddish;
    assert.equal(of("TEFILLOS"), "תפילות");
    assert.equal(of("SHABBOS"), "שבת");
    assert.equal(of("GROCERY"), "כשר");
  });
});

describe("Yiddish in the provider directory", () => {
  it("carries none, because none of the four was Yiddish", () => {
    for (const [key, label] of Object.entries(PROVIDER_CATEGORY_LABELS)) {
      assert.equal(label.yiddish, undefined, `${key} should have no Yiddish heading until there is a real word`);
      assert.ok(label.english.trim(), `${key} still needs its English heading`);
    }
  });
});
