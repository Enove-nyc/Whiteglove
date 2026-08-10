import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BUILT_IN_WORDS } from "@/data/site-words";
import {
  isObsoleteWording,
  mergeWords,
  scrubObsoleteWords,
  wordProblem,
} from "@/lib/site-words";

const OBSOLETE = "Plan your next vacation with every kosher detail in place.";

describe("obsolete homepage headline", () => {
  it("recognises only the exact obsolete string", () => {
    assert.equal(isObsoleteWording("heroTitle", OBSOLETE), true);
    assert.equal(isObsoleteWording("heroTitle", BUILT_IN_WORDS.heroTitle), false);
    assert.equal(isObsoleteWording("heroTitle", "Plan your next vacation with care."), false);
  });

  it("mergeWords drops the obsolete headline and keeps other owner edits", () => {
    const merged = mergeWords({
      heroTitle: OBSOLETE,
      heroSubtitle: "Owner subtitle kept",
    });
    assert.equal(merged.heroTitle, BUILT_IN_WORDS.heroTitle);
    assert.equal(merged.heroSubtitle, "Owner subtitle kept");
  });

  it("scrubObsoleteWords removes only that key", () => {
    const scrubbed = scrubObsoleteWords({
      heroTitle: OBSOLETE,
      footerStrapline: "Keep me",
    });
    assert.equal(scrubbed.heroTitle, undefined);
    assert.equal(scrubbed.footerStrapline, "Keep me");
  });

  it("wordProblem refuses putting the obsolete headline back", () => {
    const problem = wordProblem({ ...BUILT_IN_WORDS, heroTitle: OBSOLETE });
    assert.ok(problem);
    assert.match(String(problem), /no longer stands behind|destination checklist/i);
  });

  it("built-in headline is the intended one", () => {
    assert.match(BUILT_IN_WORDS.heroTitle, /kosher side answered first/i);
    assert.doesNotMatch(BUILT_IN_WORDS.heroTitle, /every kosher detail in place/i);
  });
});
