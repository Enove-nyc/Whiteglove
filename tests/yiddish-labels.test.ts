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

/** Every Yiddish label the site is allowed to show, and what it says. */
const APPROVED: Record<string, string> = {
  "כשרות עסן": "kashrus esn — kosher food",
  "מנינים": "minyanim",
  "מקוה": "mikvah",
  "אכסניא": "achsanya — lodging",
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

describe("Yiddish in the provider directory", () => {
  it("carries none, because none of the four was Yiddish", () => {
    for (const [key, label] of Object.entries(PROVIDER_CATEGORY_LABELS)) {
      assert.equal(label.yiddish, undefined, `${key} should have no Yiddish heading until there is a real word`);
      assert.ok(label.english.trim(), `${key} still needs its English heading`);
    }
  });
});
