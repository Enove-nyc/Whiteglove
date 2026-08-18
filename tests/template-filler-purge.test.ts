import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BUILT_IN_CONTENT_IMPORT_PACKAGES } from "@/data/imports";
import { isTemplateFillerCandidate } from "@/lib/bulk-content";
import { attractions } from "@/data/attractions";

/**
 * The review queue counted 25,808 candidates and never fell, because two
 * thirds of them named no real place: a fixed set of generic phrases the
 * generator stamped onto every city in the world. isTemplateFillerCandidate
 * takes those out at the pack boundary so the count means "real candidates
 * still waiting."
 *
 * The danger in a purge like this is catching a real place by mistake. The
 * generator also suffixed real names with the same words ("framing,"
 * "daytime"), so the test is the generic PHRASE, never the suffix — and these
 * tests hold that line.
 */
describe("template-filler purge", () => {
  it("drops the generic placeholders", () => {
    for (const name of [
      "Paris scenic overlook or hill viewpoint",
      "Turin lakeside or beach daytime shore walk",
      "Bologna museum quarter outdoor approach",
      "Naples zoo or wildlife park framing",
      "Venice community mikvah resource",
      "Lyon jewish cemetery sections orientation",
      "Staying near Cannaregio, Venice",
      "Staying near Dubai Marina",
    ]) {
      assert.equal(isTemplateFillerCandidate(name), true, `should drop: ${name}`);
    }
  });

  it("keeps real places, even when they carry the same generator suffix", () => {
    for (const name of [
      "Musée du Louvre daytime",
      "Doge's Palace exterior framing",
      "Rialto Bridge daytime",
      "Great Synagogue of Stockholm exterior framing",
      "Helsingør Kronborg framing",
      "Bosphorus Cruise framing",
      "Lazama Synagogue framing",
      "The Two Towers",
      "Musée d'Orsay",
    ]) {
      assert.equal(isTemplateFillerCandidate(name), false, `should keep: ${name}`);
    }
  });

  it("removes about two thirds of the pack and leaves the real remainder", () => {
    const all = BUILT_IN_CONTENT_IMPORT_PACKAGES.flatMap((p) => p.candidates);
    const filler = all.filter((c) => isTemplateFillerCandidate(c.name));
    const real = all.filter((c) => !isTemplateFillerCandidate(c.name));
    // Guardrails, not exact pins: enough to catch the predicate silently
    // matching everything or nothing.
    assert.ok(filler.length > 12000, `too few dropped: ${filler.length}`);
    assert.ok(real.length > 6000 && real.length < 14000, `real remainder off: ${real.length}`);
  });

  it("nothing already published to the site is filler by name", () => {
    // A published attraction should never have a name the purge would catch —
    // otherwise a real place is being treated as a placeholder somewhere.
    for (const a of attractions) {
      assert.equal(isTemplateFillerCandidate(a.name), false, `published attraction reads as filler: ${a.name}`);
    }
  });
});
