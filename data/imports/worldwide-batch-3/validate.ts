import assert from "node:assert/strict";
import { worldwideBatch3Candidates } from "./candidates";
import {
  duplicateKey,
  makeCandidateId,
  normalizedLocation,
  normalizeText,
  WORLDWIDE_BATCH_3_SCHEMA_VERSION,
} from "./schema";
import { sourceCatalog } from "./sources";

const HTTPS_URL = /^https:\/\/[^\s]+$/;
const FORBIDDEN = ["coordinates", "hours", "phone", "price", "bookingLink"];

export function validatePack() {
  assert.ok(worldwideBatch3Candidates.length >= 2000, `expected >=2000, got ${worldwideBatch3Candidates.length}`);
  const ids = new Set<string>();
  const keys = new Set<string>();
  const byListingLabel: Record<string, number> = {};
  const byImportKind: Record<string, number> = {};

  for (const candidate of worldwideBatch3Candidates) {
    assert.equal(candidate.schemaVersion, WORLDWIDE_BATCH_3_SCHEMA_VERSION);
    assert.equal(candidate.id, makeCandidateId(candidate));
    assert.equal(candidate.sourceId, candidate.id);
    assert.ok(candidate.id.startsWith("wgb3-"), candidate.id);
    assert.ok(candidate.aliases.length > 0, candidate.id);
    assert.ok(candidate.keywords.length > 0, candidate.id);
    assert.ok(candidate.address.trim().length > 0, `${candidate.id}: empty address`);
    assert.ok(candidate.summary.trim().length > 0, `${candidate.id}: empty summary`);
    assert.ok(candidate.listingLabel.trim().length > 0, `${candidate.id}: empty listingLabel`);
    assert.equal(candidate.normalizedName, normalizeText(candidate.name));
    assert.equal(candidate.normalizedLocation, normalizedLocation(candidate.locality, candidate.country));
    assert.equal(
      candidate.dedupeKey,
      duplicateKey(candidate.entityType, candidate.name, candidate.locality, candidate.country),
    );
    const source = sourceCatalog[candidate.sourceKey as keyof typeof sourceCatalog];
    assert.ok(source, `${candidate.id}: unknown source`);
    assert.equal(candidate.sourceUrl, source.url);
    assert.match(candidate.sourceUrl, HTTPS_URL);
    assert.equal(candidate.publicationReadiness, "NEEDS_REVIEW");
    assert.ok(candidate.requiredBeforePublication.length > 0);
    for (const field of FORBIDDEN) assert.ok(!(field in candidate), `${candidate.id}: ${field}`);
    assert.ok(!ids.has(candidate.id), `duplicate id ${candidate.id}`);
    assert.ok(!keys.has(candidate.dedupeKey), `duplicate key ${candidate.dedupeKey}`);
    ids.add(candidate.id);
    keys.add(candidate.dedupeKey);
    byListingLabel[candidate.listingLabel] = (byListingLabel[candidate.listingLabel] ?? 0) + 1;
    byImportKind[candidate.importKind] = (byImportKind[candidate.importKind] ?? 0) + 1;
  }

  return {
    candidateCount: worldwideBatch3Candidates.length,
    byListingLabel,
    byImportKind,
    byCountry: Object.fromEntries(
      [...worldwideBatch3Candidates.reduce((m, c) => m.set(c.country, (m.get(c.country) ?? 0) + 1), new Map())].sort(
        (a, b) => b[1] - a[1],
      ),
    ),
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/validate.ts")) {
  console.log(JSON.stringify(validatePack(), null, 2));
}
