import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BUILT_IN_CONTENT_IMPORT_PACKAGES } from "@/data/imports";
import { kosherEateries } from "@/data/kosher-eateries";
import { kosherFoodBatchCandidates, kosherFoodDedupeReport } from "@/data/imports/kosher-food-batch/candidates";
import { namePlaceKeyFor } from "@/data/imports/kosher-food-batch/dedupe";
import { validatePack } from "@/data/imports/kosher-food-batch/validate";
import { prepareBulkContentCandidate } from "@/lib/bulk-content";

describe("kosher food finder review pack", () => {
  it("has been published to the finder, leaving only a small unmatched tail", () => {
    // The pack was drafted as ~1,600 named establishments and has since been
    // published to the public kosher food finder (data/kosher-eateries-
    // directory.ts). The pack's own dedupe now recognises them as on the
    // finder and drops them, so what remains here is only the handful that did
    // not make it onto the finder — the queue has cleared, by design.
    const report = validatePack();
    assert.equal(report.dropped, kosherFoodDedupeReport.dropped);
    assert.ok(
      (kosherFoodDedupeReport.byReason["public-finder"] ?? 0) >= 1000,
      "expected the bulk of the pack to be recognised on the public finder",
    );
  });

  it("drops same-door doubles and never ships kosher-style stand-ins", () => {
    assert.ok(kosherFoodDedupeReport.drafted > kosherFoodDedupeReport.kept);
    // Same-address doubles are collapsed — now chiefly against the public
    // finder the pack was published into, rather than within the raw draft.
    const addressDrops =
      (kosherFoodDedupeReport.byReason["public-finder-address"] ?? 0) +
      (kosherFoodDedupeReport.byReason["same-address"] ?? 0);
    assert.ok(addressDrops >= 1);
    assert.equal(kosherFoodBatchCandidates.some((row) => /marrakesh/i.test(row.name)), false);
    assert.equal(kosherFoodBatchCandidates.some((row) => /uptown kosher bakery/i.test(row.name)), false);
    for (const row of kosherFoodBatchCandidates) {
      assert.doesNotMatch(`${row.name} ${row.summary}`, /kosher-style|israeli-style/i);
    }
  });

  it("does not repeat a public kosher food finder listing", () => {
    const publicKeys = new Set(
      kosherEateries.map((eatery) => namePlaceKeyFor(eatery.name, eatery.city, eatery.country)).filter(Boolean),
    );
    for (const row of kosherFoodBatchCandidates) {
      const key = namePlaceKeyFor(row.name, row.locality, row.country);
      assert.equal(publicKeys.has(key), false, `${row.name} is already on the public finder`);
    }
  });

  it("does not repeat a named kitchen already in an attraction / practical import pack", () => {
    const prior = new Set<string>();
    for (const sourcePackage of BUILT_IN_CONTENT_IMPORT_PACKAGES) {
      if (sourcePackage.batch.slug === "kosher-food-batch") continue;
      for (const candidate of sourcePackage.candidates) {
        const looksLikeFood =
          candidate.kind === "KOSHER_FOOD" ||
          /kosher (restaurant|bakery|grocery|kitchen|butcher|delight|grill)/i.test(candidate.name);
        if (!looksLikeFood) continue;
        const key = namePlaceKeyFor(candidate.name, candidate.city, candidate.country);
        if (key) prior.add(key);
      }
    }
    for (const row of kosherFoodBatchCandidates) {
      const key = namePlaceKeyFor(row.name, row.locality, row.country);
      assert.equal(prior.has(key), false, `${row.name} already sits in another import pack`);
    }
  });

  it("registers as KOSHER_FOOD that can stage and cannot bulk-publish", () => {
    const sourcePackage = BUILT_IN_CONTENT_IMPORT_PACKAGES.find((item) => item.batch.slug === "kosher-food-batch");
    assert.ok(sourcePackage);
    assert.equal(sourcePackage.candidates.length, validatePack().candidateCount);
    for (const candidate of sourcePackage.candidates) {
      const prepared = prepareBulkContentCandidate(candidate);
      assert.equal(candidate.kind, "KOSHER_FOOD");
      assert.equal(prepared.canStage, true, `${candidate.sourceId}: ${prepared.stageErrors.join(" ")}`);
      assert.equal(prepared.canPublish, false);
      assert.ok(prepared.publishBlockers.some((blocker) => /destination editor/i.test(blocker)));
      assert.equal(prepared.kosherClaim, "reported");
      assert.ok(prepared.kosherSourceUrl?.startsWith("http"));
    }
  });
});
