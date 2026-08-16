import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BUILT_IN_WORDS } from "@/data/site-words";
import {
  isObsoleteWording,
  mergeWords,
  scrubObsoleteWords,
  wordProblem,
} from "@/lib/site-words";

/**
 * The obsolete-wording machinery: a stored owner edit that the site no
 * longer stands behind is dropped rather than republished, and cannot be
 * saved back through the form.
 *
 * The machinery was built for the old completeness headline; the hero words
 * themselves were retired with the "Where to?" front page, so today's
 * registered example is the old search placeholder. The RULES under test are
 * unchanged — exact-string matching only, other edits always survive.
 */

const OBSOLETE = "Search a city, tzaddik, or country...";

describe("obsolete wording", () => {
  it("recognises only the exact obsolete string", () => {
    assert.equal(isObsoleteWording("searchPlaceholder", OBSOLETE), true);
    assert.equal(isObsoleteWording("searchPlaceholder", BUILT_IN_WORDS.searchPlaceholder), false);
    assert.equal(isObsoleteWording("searchPlaceholder", "Search a city or country"), false);
  });

  it("mergeWords drops the obsolete value and keeps other owner edits", () => {
    const merged = mergeWords({
      searchPlaceholder: OBSOLETE,
      replyPromise: "Owner reply kept",
    });
    assert.equal(merged.searchPlaceholder, BUILT_IN_WORDS.searchPlaceholder);
    assert.equal(merged.replyPromise, "Owner reply kept");
  });

  it("scrubObsoleteWords removes only that key", () => {
    const scrubbed = scrubObsoleteWords({
      searchPlaceholder: OBSOLETE,
      bookingNotice: "Keep me",
    });
    assert.equal(scrubbed.searchPlaceholder, undefined);
    assert.equal(scrubbed.bookingNotice, "Keep me");
  });

  it("wordProblem refuses putting the obsolete wording back", () => {
    const problem = wordProblem({ ...BUILT_IN_WORDS, searchPlaceholder: OBSOLETE });
    assert.ok(problem);
    assert.match(String(problem), /no longer stands behind/i);
  });

  it("the retired hero keys are gone from the registry entirely", () => {
    // An editable setting shown nowhere is worse than no setting — the front
    // page opens with "Where to?" and a search box, not a stored headline.
    assert.ok(!("heroTitle" in BUILT_IN_WORDS));
    assert.ok(!("heroEyebrow" in BUILT_IN_WORDS));
    assert.ok(!("heroSubtitle" in BUILT_IN_WORDS));
  });
});
