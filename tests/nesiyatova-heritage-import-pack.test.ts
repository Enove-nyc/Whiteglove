import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BUILT_IN_CONTENT_IMPORT_PACKAGES } from "@/data/imports";
import { cemeteries } from "@/data/cemeteries";
import {
  nesiyatovaHeritageCandidates,
  nesiyatovaHeritageDedupeReport,
} from "@/data/imports/nesiyatova-heritage-batch/candidates";
import { namePlaceKeyFor } from "@/data/imports/nesiyatova-heritage-batch/dedupe";
import { validatePack } from "@/data/imports/nesiyatova-heritage-batch/validate";
import { prepareBulkContentCandidate } from "@/lib/bulk-content";

describe("Nesiya Tova heritage review pack", () => {
  it("stages named batei chayim, mikvaos and hachnasas orchim as NEEDS_REVIEW", () => {
    const report = validatePack();
    assert.ok(report.candidateCount >= 100);
    assert.equal(report.published, 0);
    assert.ok((report.byLabel["Beis hachaim"] ?? 0) > 0);
    assert.ok((report.byLabel.Mikvah ?? 0) > 0);
    assert.ok((report.byLabel["Hachnasas orchim"] ?? 0) > 0);
    assert.ok(nesiyatovaHeritageDedupeReport.dropped >= 0);
  });

  it("does not invent phones and cites a Nesiya Tova listing URL on every row", () => {
    for (const row of nesiyatovaHeritageCandidates) {
      assert.match(row.sourceUrl, /^https:\/\/app\.nesiyatova\.com\/category-detail\/\?MkmId=\d+$/);
      for (const phone of row.phones) {
        assert.match(phone, /\d/);
        assert.match(row.sourceEvidence, /Nesiya Tova/);
      }
    }
  });

  it("does not repeat a published beis hachaim by name and town", () => {
    const publicKeys = new Set(
      cemeteries.map((item) => namePlaceKeyFor(item.name, item.city, item.country)).filter(Boolean),
    );
    for (const row of nesiyatovaHeritageCandidates) {
      if (row.entityType !== "beis_hachaim") continue;
      const key = namePlaceKeyFor(row.name, row.locality, row.country);
      if (!key) continue;
      assert.equal(publicKeys.has(key), false, `${row.name} is already a published beis hachaim`);
    }
  });

  it("can stage and cannot bulk-publish beis hachaim or practical rows", () => {
    const sourcePackage = BUILT_IN_CONTENT_IMPORT_PACKAGES.find(
      (item) => item.batch.slug === "nesiyatova-heritage-batch",
    );
    assert.ok(sourcePackage);
    assert.equal(sourcePackage.candidates.length, validatePack().candidateCount);
    let beis = 0;
    let practical = 0;
    for (const candidate of sourcePackage.candidates) {
      const prepared = prepareBulkContentCandidate(candidate);
      assert.equal(prepared.canStage, true, `${candidate.sourceId}: ${prepared.stageErrors.join(" ")}`);
      assert.equal(prepared.canPublish, false, `${candidate.sourceId} must not bulk-publish`);
      assert.notEqual(candidate.kind, "KOSHER_FOOD");
      if (candidate.kind === "ATTRACTION") beis += 1;
      if (candidate.kind === "PRACTICAL") practical += 1;
    }
    assert.ok(beis > 0);
    assert.ok(practical > 0);
  });
});
