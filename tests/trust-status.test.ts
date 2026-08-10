import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  checkedOn,
  describeTrust,
  fromHechsherState,
  fromKosherClaim,
  fromRecordStatus,
  fromTrustLabel,
  reconfirmBeforeTravel,
  TRUST_CLASSES,
  TRUST_LEVELS,
  TRUST_METHODOLOGY_PATH,
  TRUST_ORDER,
  trustText,
  type TrustLevel,
} from "@/lib/trust-status";
import { trustLabel } from "@/lib/verification";

/**
 * One scale, four words, everywhere.
 *
 * The site had four vocabularies for the same question — a destination section
 * was "partially verified", a hotel's kashrus was "reported", a restaurant's
 * hechsher was "unverified", and a traveler moving between three pages had to
 * work out for themselves which was better. These tests keep the mapping in
 * one place and keep it honest in one direction: nothing may be rounded UP.
 */

describe("the four labels", () => {
  it("is exactly four, in the order they are explained", () => {
    assert.deepEqual(TRUST_ORDER, ["verified", "reported", "being-checked", "reconfirm"]);
    assert.deepEqual(Object.keys(TRUST_LEVELS).sort(), [...TRUST_ORDER].sort());
  });

  it("says what each one means without using the label to define itself", () => {
    for (const level of TRUST_ORDER) {
      const descriptor = TRUST_LEVELS[level];
      assert.ok(descriptor.meaning.trim().length > 40, `${level} does not explain itself`);
      assert.equal(descriptor.level, level);
    }
  });

  it("tells you what to do about every label except the one with nothing to do", () => {
    assert.equal(TRUST_LEVELS.verified.action, "");
    for (const level of TRUST_ORDER.filter((l) => l !== "verified")) {
      assert.ok(TRUST_LEVELS[level].action.trim().length > 20, `${level} names no action`);
    }
  });

  it("CARRIES A GLYPH, so the state never rests on colour alone", () => {
    // Roughly one man in twelve cannot separate the amber from the green, and
    // the difference between them is the entire content of the badge.
    const glyphs = TRUST_ORDER.map((level) => TRUST_LEVELS[level].glyph);
    assert.equal(new Set(glyphs).size, glyphs.length, "two labels share a glyph");
    for (const glyph of glyphs) assert.ok(glyph.trim().length > 0);
  });

  it("gives every tone a full set of classes", () => {
    for (const level of TRUST_ORDER) {
      const tone = TRUST_CLASSES[TRUST_LEVELS[level].tone];
      assert.ok(tone, `${level} has a tone with no classes`);
      assert.ok(tone.text && tone.border && tone.background, level);
    }
  });
});

describe("mapping the older scales onto them", () => {
  it("never rounds up", () => {
    // THE ONE THAT MATTERS. Every one of these is a claim somebody may drive
    // four hours on. "Partially verified" and "we have not finished" are the
    // same instruction to a traveler, and neither is Verified.
    assert.equal(fromRecordStatus("verified")?.level, "verified");
    assert.equal(fromRecordStatus("partial")?.level, "being-checked");
    assert.equal(fromRecordStatus("needs-verification")?.level, "being-checked");
    assert.equal(fromRecordStatus("community")?.level, "reported");
  });

  it("shows nothing at all where nothing has been published", () => {
    // "Nothing here yet" is not a statement about accuracy, and a status pill
    // over an empty section labels a thing that is not there.
    assert.equal(fromRecordStatus("unavailable"), null);
  });

  it("reads the label lib/verification.ts already worked out", () => {
    assert.equal(fromTrustLabel(trustLabel({ status: "verified", lastChecked: "2026-03-03" }))?.level, "verified");
    assert.equal(fromTrustLabel(trustLabel({ status: "partial" }))?.level, "being-checked");
    assert.equal(fromTrustLabel(trustLabel({ status: "unavailable" })), null);
  });

  it("maps a hotel's kashrus claim, and stays silent when none was made", () => {
    assert.equal(fromKosherClaim("confirmed")?.level, "verified");
    assert.equal(fromKosherClaim("reported")?.level, "reported");
    // A hotel that makes no kosher claim is not an unverified kosher hotel. A
    // badge would be a doubt about something nobody asserted.
    assert.equal(fromKosherClaim("none"), null);
  });

  it("maps a hechsher state the same way", () => {
    assert.equal(fromHechsherState("certified")?.level, "verified");
    assert.equal(fromHechsherState("reported")?.level, "reported");
    assert.equal(fromHechsherState("unverified")?.level, "being-checked");
    assert.equal(fromHechsherState("none"), null);
  });
});

describe("the date", () => {
  it("prints it the way a person says it", () => {
    assert.equal(checkedOn("2026-03-03"), "3 March 2026");
  });

  it("does not let a timezone move the day", () => {
    // Parsed at UTC noon. Midnight would render as the day before, west of
    // Greenwich, and turn "checked today" into "checked yesterday".
    assert.equal(checkedOn("2026-01-01"), "1 January 2026");
    assert.equal(checkedOn("2026-12-31"), "31 December 2026");
  });

  it("says nothing about a date it cannot read", () => {
    assert.equal(checkedOn(undefined), null);
    assert.equal(checkedOn(""), null);
    assert.equal(checkedOn("last Tuesday"), null);
  });

  it("ONLY EVER PRINTS A DATE BESIDE VERIFIED", () => {
    // A date next to "being checked" reads as the day the checking finished,
    // which is the opposite of what it means.
    assert.equal(trustText(TRUST_LEVELS.verified, "2026-03-03"), "Verified on 3 March 2026");
    // The three non-verified labels are now the instruction the level implies
    // rather than our queue position — AGENTS.md, and see lib/trust-status.ts.
    // A date beside any of them would read as the day the work finished.
    assert.equal(trustText(TRUST_LEVELS["being-checked"], "2026-03-03"), "Confirm directly");
    assert.equal(trustText(TRUST_LEVELS.reported, "2026-03-03"), "Confirm before you rely on it");
    assert.equal(trustText(TRUST_LEVELS.reconfirm, "2026-03-03"), "Confirm before travel");
  });
});

describe("what a screen reader is told", () => {
  it("reads a sentence, not a single word", () => {
    // A badge announced as "reported" and nothing else tells a blind traveler
    // nothing at all.
    const said = describeTrust(TRUST_LEVELS.reported);
    assert.ok(said.length > 60, said);
    assert.match(said, /confirm/i);
  });

  it("leads with the date when there is one", () => {
    assert.match(describeTrust(TRUST_LEVELS.verified, "2026-03-03"), /^Verified on 3 March 2026\./);
  });
});

describe("reconfirm is an instruction, not a weaker verified", () => {
  it("says what changes and what to do", () => {
    const descriptor = reconfirmBeforeTravel();
    assert.equal(descriptor.level, "reconfirm");
    assert.match(descriptor.meaning, /changes/i);
    assert.match(descriptor.action, /ahead|check/i);
  });
});

/* ---- the one that keeps the scale from splitting again -------------------- */

describe("nothing invents a fifth vocabulary", () => {
  it("DEFINES THE ONE LABEL A CUSTOMER MEETS, AND WALKS THROUGH NO QUEUE", () => {
    // The page used to set out all four labels and how the checking is done.
    // AGENTS.md: do not expose internal workflows or content status to
    // customers, so the three in-progress ones are no longer explained to
    // anybody — they are not shown to anybody either.
    //
    // "Verified" stays defined, and that is not an oversight. A badge is a
    // claim, and an unexplained claim is marketing; the site is about to carry
    // advertising, and "no advertiser can buy this label" means nothing if the
    // word is defined nowhere a customer can read it.
    const page = readFileSync("app/verification/page.tsx", "utf8");
    // Comments stripped: the file records what it used to say, and why, which
    // is worth keeping and is shown to nobody.
    const prose = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.match(prose, /What &ldquo;Verified&rdquo; means here/);
    assert.match(prose, /cannot buy the label/);
    for (const status of [/being checked/i, /reconfirm before travel/i, /\bunverified\b/i, /research queue/i]) {
      assert.doesNotMatch(prose, status, "the page still walks a customer through the editorial queue");
    }
    assert.equal(TRUST_METHODOLOGY_PATH, "/verification");
  });

  it("keeps the badge component reading the shared descriptors", () => {
    const badge = readFileSync("components/VerificationBadge.tsx", "utf8");
    assert.match(badge, /TrustDescriptor/);
    assert.match(badge, /TRUST_CLASSES/);
    // The accessible name is the sentence; the visible text is the short label.
    assert.match(badge, /describeTrust/);
    assert.match(badge, /sr-only/);
  });

  it("uses no hand-written status wording in the pages that show one", () => {
    // Somebody adding a page and typing "Partially verified" into it by hand is
    // exactly how the four vocabularies happened. Anything printing a status
    // must come through the shared descriptors.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry.startsWith(".")) continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.tsx$/.test(path)) continue;
        // The heritage pages predate this and keep lib/verification.ts's own
        // wording, which is the same scale said differently; they are excluded
        // by name so the exception is visible rather than implied.
        if (/PracticalInformation|DestinationEditor|KeverEditor|CompletenessQueue|admin/.test(path)) continue;
        const source = readFileSync(path, "utf8");
        if (/"Reconfirm before travel"|"Being checked"/.test(source) && !/trust-status/.test(source)) {
          offenders.push(path);
        }
      }
    };
    for (const dir of ["app", "components"]) walk(dir);
    assert.deepEqual(offenders, [], `hand-written status wording: ${offenders.join(", ")}`);
  });
});

/** Type-level: every level named in the union has a descriptor. */
const _exhaustive: Record<TrustLevel, true> = {
  verified: true,
  reported: true,
  "being-checked": true,
  reconfirm: true,
};
void _exhaustive;
