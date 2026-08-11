import assert from "node:assert/strict";
import { whiteGloveFillCandidates } from "./candidates";
import {
  duplicateKey,
  makeCandidateId,
  normalizedLocation,
  normalizeText,
  WHITE_GLOVE_FILL_BATCH_SCHEMA_VERSION,
} from "./schema";
import { sourceCatalog } from "./sources";

const HTTPS_URL = /^https:\/\/[^\s]+$/;
const FORBIDDEN = ["address", "coordinates", "hours", "phone", "price", "bookingLink"];

export function validatePack() {
  assert.ok(whiteGloveFillCandidates.length > 0, "pack is empty");
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const candidate of whiteGloveFillCandidates) {
    assert.equal(candidate.schemaVersion, WHITE_GLOVE_FILL_BATCH_SCHEMA_VERSION);
    assert.equal(candidate.id, makeCandidateId(candidate));
    assert.equal(candidate.sourceId, candidate.id);
    assert.ok(candidate.id.startsWith("wgfb-"), candidate.id);
    assert.ok(candidate.aliases.length > 0, candidate.id);
    assert.ok(candidate.keywords.length > 0, candidate.id);
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
  }
  return {
    candidateCount: whiteGloveFillCandidates.length,
    byCountry: Object.fromEntries(
      [...whiteGloveFillCandidates.reduce((m, c) => m.set(c.country, (m.get(c.country) ?? 0) + 1), new Map())].sort(),
    ),
    byEntityType: Object.fromEntries(
      [...whiteGloveFillCandidates.reduce((m, c) => m.set(c.entityType, (m.get(c.entityType) ?? 0) + 1), new Map())].sort(),
    ),
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/validate.ts")) {
  console.log(JSON.stringify(validatePack(), null, 2));
}
