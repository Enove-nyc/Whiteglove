import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { worldwideBatch5Candidates } from "./candidates";
import {
  duplicateKey,
  makeCandidateId,
  normalizedLocation,
  normalizeText,
  WORLDWIDE_BATCH_5_SCHEMA_VERSION,
} from "./schema";
import { sourceCatalog } from "./sources";

const HTTPS_URL = /^https:\/\/[^\s]+$/;
const FORBIDDEN = ["hours", "phone", "price", "bookingLink"];

function loadPriorKeys(): { keys: Set<string>; ids: Set<string> } {
  const keys = new Set<string>();
  const ids = new Set<string>();
  const roots = [
    "worldwide-batch-2",
    "worldwide-batch-3",
    "worldwide-batch-4",
    "white-glove-europe-batch",
    "white-glove-global-batch",
    "white-glove-fill-batch",
  ];
  const importsRoot = join(process.cwd(), "data/imports");
  for (const slug of roots) {
    const candPath = join(importsRoot, slug, "candidates.ts");
    if (!existsSync(candPath)) continue;
    const text = readFileSync(candPath, "utf8");
    for (const m of text.matchAll(/\bid:\s*["']([^"']+)["']/g)) ids.add(m[1]);
    const blocks = text.split(/draft\(\{|sourceBackedCandidate\([^,]+,\s*\{/);
    for (const block of blocks) {
      const entityType = block.match(/entityType:\s*["']([^"']+)["']/)?.[1];
      const name =
        block.match(/\n\s*name:\s*["']([^"']+)["']/)?.[1] ||
        block.match(/name:\s*["']([^"']+)["']/)?.[1];
      const locality =
        block.match(/locality:\s*["']([^"']+)["']/)?.[1] ||
        block.match(/city:\s*["']([^"']+)["']/)?.[1];
      const country = block.match(/country:\s*["']([^"']+)["']/)?.[1];
      if (entityType && name && locality && country) {
        keys.add(duplicateKey(entityType as never, name, locality, country));
        keys.add(
          `nameplace::${normalizeText(name)}::${normalizeText(locality)}::${normalizeText(country)}`,
        );
      }
    }
  }
  return { keys, ids };
}

export function validatePack() {
  assert.ok(
    worldwideBatch5Candidates.length >= 14500 && worldwideBatch5Candidates.length <= 15500,
    `expected ~15000, got ${worldwideBatch5Candidates.length}`,
  );
  const ids = new Set<string>();
  const keys = new Set<string>();
  const byListingLabel: Record<string, number> = {};
  const byImportKind: Record<string, number> = {};
  const prior = loadPriorKeys();
  let priorCollisions = 0;

  for (const candidate of worldwideBatch5Candidates) {
    assert.equal(candidate.schemaVersion, WORLDWIDE_BATCH_5_SCHEMA_VERSION);
    assert.equal(candidate.id, makeCandidateId(candidate));
    assert.equal(candidate.sourceId, candidate.id);
    assert.ok(candidate.id.startsWith("wgb5-"), candidate.id);
    assert.ok(candidate.aliases.length > 0, candidate.id);
    assert.ok(candidate.keywords.length > 0, candidate.id);
    assert.ok(candidate.address.trim().length > 0, `${candidate.id}: empty address`);
    assert.ok(candidate.summary.trim().length > 0, `${candidate.id}: empty summary`);
    assert.ok(candidate.listingLabel.trim().length > 0, `${candidate.id}: empty listingLabel`);
    assert.ok(candidate.category.trim().length > 0, `${candidate.id}: empty category`);
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

    const namePlace = `nameplace::${normalizeText(candidate.name)}::${normalizeText(candidate.locality)}::${normalizeText(candidate.country)}`;
    if (prior.keys.has(candidate.dedupeKey) || prior.keys.has(namePlace) || prior.ids.has(candidate.id)) {
      priorCollisions += 1;
    }
  }

  assert.equal(priorCollisions, 0, `expected 0 prior-pack collisions, got ${priorCollisions}`);

  return {
    candidateCount: worldwideBatch5Candidates.length,
    byListingLabel,
    byImportKind,
    priorCollisions,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/validate.ts")) {
  console.log(JSON.stringify(validatePack(), null, 2));
}
