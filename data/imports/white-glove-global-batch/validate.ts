import assert from "node:assert/strict";
import { whiteGloveGlobalCandidates } from "./candidates";
import {
  duplicateKey,
  makeCandidateId,
  normalizedLocation,
  normalizeText,
  WHITE_GLOVE_GLOBAL_BATCH_SCHEMA_VERSION,
} from "./schema";
import { sourceCatalog } from "./sources";

const HTTPS_URL = /^https:\/\/[^\s]+$/;
const FORBIDDEN = ["address", "coordinates", "hours", "phone", "price", "bookingLink"];
const DISALLOWED_HOST = /(?:^|\.)(?:google\.(?:com|co\.[a-z]+)|googleapis\.com|maps\.google\.|openstreetmap\.org|osm\.org|overpass-api\.de|photon\.komoot\.io)$/i;

export function validatePack() {
  assert.ok(whiteGloveGlobalCandidates.length >= 600, `expected ~650 candidates, got ${whiteGloveGlobalCandidates.length}`);
  assert.ok(whiteGloveGlobalCandidates.length <= 750, `expected ~650 candidates, got ${whiteGloveGlobalCandidates.length}`);
  const ids = new Set<string>();
  const keys = new Set<string>();
  const byMarket = new Map<string, number>();
  for (const candidate of whiteGloveGlobalCandidates) {
    assert.equal(candidate.schemaVersion, WHITE_GLOVE_GLOBAL_BATCH_SCHEMA_VERSION);
    assert.equal(candidate.id, makeCandidateId(candidate));
    assert.equal(candidate.sourceId, candidate.id);
    assert.ok(candidate.id.startsWith("wggb-"), candidate.id);
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
    const host = new URL(candidate.sourceUrl).hostname;
    assert.ok(!DISALLOWED_HOST.test(host), `${candidate.id}: disallowed source host ${host}`);
    assert.equal(candidate.publicationReadiness, "NEEDS_REVIEW");
    assert.ok(candidate.requiredBeforePublication.length > 0);
    for (const field of FORBIDDEN) assert.ok(!(field in candidate), `${candidate.id}: ${field}`);
    assert.ok(!ids.has(candidate.id), `duplicate id ${candidate.id}`);
    assert.ok(!keys.has(candidate.dedupeKey), `duplicate key ${candidate.dedupeKey}`);
    ids.add(candidate.id);
    keys.add(candidate.dedupeKey);
    byMarket.set(candidate.market, (byMarket.get(candidate.market) ?? 0) + 1);
  }

  // Complementarity: leave fill-batch hubs and Florida/Orlando alone.
  for (const market of byMarket.keys()) {
    assert.doesNotMatch(
      market,
      /^(usa-chicago|usa-orlando|florida|orlando|hong-kong|south-korea|new-zealand|portugal|greece|argentina)$/,
    );
  }

  return {
    candidateCount: whiteGloveGlobalCandidates.length,
    byCountry: Object.fromEntries(
      [...whiteGloveGlobalCandidates.reduce((m, c) => m.set(c.country, (m.get(c.country) ?? 0) + 1), new Map())].sort(),
    ),
    byEntityType: Object.fromEntries(
      [...whiteGloveGlobalCandidates.reduce((m, c) => m.set(c.entityType, (m.get(c.entityType) ?? 0) + 1), new Map())].sort(),
    ),
    byMarket: Object.fromEntries([...byMarket].sort()),
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/validate.ts")) {
  console.log(JSON.stringify(validatePack(), null, 2));
}
