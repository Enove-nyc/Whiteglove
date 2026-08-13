import assert from "node:assert/strict";
import { nesiyatovaHeritageCandidates, nesiyatovaHeritageDedupeReport } from "./candidates";
import { phoneKey } from "./dedupe";
import {
  duplicateKey,
  makeCandidateId,
  NESIYATOVA_HERITAGE_SCHEMA_VERSION,
  normalizedLocation,
  normalizeText,
} from "./schema";
import { sourceCatalog } from "./sources";

const HTTPS_URL = /^https:\/\/[^\s]+$/;

export function validatePack() {
  assert.ok(nesiyatovaHeritageCandidates.length > 0, "pack is empty");
  const ids = new Set<string>();
  const keys = new Set<string>();
  const urls = new Set<string>();
  let withPhones = 0;
  const byLabel: Record<string, number> = {};
  for (const candidate of nesiyatovaHeritageCandidates) {
    assert.equal(candidate.schemaVersion, NESIYATOVA_HERITAGE_SCHEMA_VERSION);
    assert.equal(candidate.id, makeCandidateId(candidate));
    assert.equal(candidate.sourceId, candidate.id);
    assert.ok(candidate.id.startsWith("wgnt-"), candidate.id);
    assert.equal(candidate.publicationReadiness, "NEEDS_REVIEW");
    assert.ok(["Beis hachaim", "Mikvah", "Hachnasas orchim"].includes(candidate.listingLabel), candidate.id);
    if (candidate.listingLabel === "Beis hachaim") {
      assert.equal(candidate.importKind, "ATTRACTION");
      assert.equal(candidate.category, "Beis hachaim");
    } else {
      assert.equal(candidate.importKind, "PRACTICAL");
    }
    assert.notEqual(candidate.importKind, "KOSHER_FOOD");
    assert.notEqual(candidate.category, "Landmark");
    assert.match(candidate.sourceUrl, HTTPS_URL);
    assert.match(candidate.sourceUrl, /app\.nesiyatova\.com\/category-detail\/\?MkmId=\d+/);
    assert.equal(candidate.sourceUrl, candidate.listingSourceUrl);
    assert.ok(sourceCatalog[candidate.sourceKey as keyof typeof sourceCatalog]);
    assert.equal(candidate.normalizedName, normalizeText(candidate.name));
    assert.equal(candidate.normalizedLocation, normalizedLocation(candidate.locality, candidate.country));
    assert.equal(
      candidate.dedupeKey,
      duplicateKey(candidate.entityType, candidate.name, candidate.locality, candidate.country),
    );
    assert.ok(!ids.has(candidate.id), `duplicate id ${candidate.id}`);
    assert.ok(!keys.has(candidate.dedupeKey), `duplicate key ${candidate.dedupeKey}`);
    assert.ok(!urls.has(candidate.sourceUrl), `duplicate source ${candidate.sourceUrl}`);
    ids.add(candidate.id);
    keys.add(candidate.dedupeKey);
    urls.add(candidate.sourceUrl);
    byLabel[candidate.listingLabel] = (byLabel[candidate.listingLabel] ?? 0) + 1;
    for (const phone of candidate.phones) {
      assert.ok(phoneKey(phone), `${candidate.id} has a non-number phone`);
      assert.match(candidate.sourceEvidence, new RegExp(phone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    if (candidate.phones.length) withPhones += 1;
    assert.doesNotMatch(candidate.summary, /\b(club|nightlife|casino)\b/i);
  }
  return {
    candidateCount: nesiyatovaHeritageCandidates.length,
    withPhones,
    byLabel,
    dropped: nesiyatovaHeritageDedupeReport.dropped,
    published: 0,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/validate.ts")) {
  console.log(JSON.stringify(validatePack(), null, 2));
}
