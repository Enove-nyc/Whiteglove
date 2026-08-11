import assert from "node:assert/strict";

import { existingContentExcludedDedupeKeys } from "./baseline";
import { worldwideBatch2Candidates } from "./candidates";
import {
  duplicateKey,
  makeCandidateId,
  normalizedLocation,
  normalizeText,
  WORLDWIDE_BATCH_2_SCHEMA_VERSION,
  type WorldwideCandidate,
} from "./schema";
import { sourceCatalog } from "./sources";

type Breakdown = Record<string, number>;

export type ValidationReport = {
  candidateCount: number;
  byCountry: Breakdown;
  byEntityType: Breakdown;
  byCategory: Breakdown;
};

const STABLE_ID = /^wgb2-[a-z0-9]+(?:-[a-z0-9]+)+$/;
const HTTPS_URL = /^https:\/\/[^\s]+$/;
const FORBIDDEN_PUBLIC_DETAIL_FIELDS = ["address", "coordinates", "hours", "phone", "price", "bookingLink"];

function countBy(values: readonly string[]): Breakdown {
  return Object.fromEntries(
    [...values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map<string, number>())].sort(
      ([left], [right]) => left.localeCompare(right),
    ),
  );
}

function assertNonEmpty(value: string, label: string, candidate: WorldwideCandidate): void {
  assert.ok(value.trim(), `${candidate.id}: ${label} is required`);
}

function validateCandidate(candidate: WorldwideCandidate): void {
  assert.equal(candidate.schemaVersion, WORLDWIDE_BATCH_2_SCHEMA_VERSION, `${candidate.id}: schema version`);
  assert.match(candidate.id, STABLE_ID, `${candidate.id}: stable id format`);
  assert.equal(candidate.id, makeCandidateId(candidate), `${candidate.id}: deterministic id`);
  assert.equal(candidate.sourceId, candidate.id, `${candidate.id}: sourceId must be the stable external id`);

  for (const [label, value] of [
    ["name", candidate.name],
    ["category", candidate.category],
    ["locality", candidate.locality],
    ["destination", candidate.destination],
    ["country", candidate.country],
    ["source key", candidate.sourceKey],
    ["source name", candidate.sourceName],
    ["source evidence", candidate.sourceEvidence],
    ["source attribution", candidate.sourceAttribution],
    ["source last checked", candidate.sourceLastChecked],
  ] as const) {
    assertNonEmpty(value, label, candidate);
  }

  assert.ok(candidate.aliases.length > 0, `${candidate.id}: needs a canonical alias`);
  assert.ok(candidate.keywords.length > 0, `${candidate.id}: needs a supported keyword`);
  assert.equal(new Set(candidate.aliases.map(normalizeText)).size, candidate.aliases.length, `${candidate.id}: duplicate aliases`);
  assert.equal(new Set(candidate.keywords.map(normalizeText)).size, candidate.keywords.length, `${candidate.id}: duplicate keywords`);
  assert.equal(candidate.normalizedName, normalizeText(candidate.name), `${candidate.id}: normalized name`);
  assert.equal(
    candidate.normalizedLocation,
    normalizedLocation(candidate.locality, candidate.country),
    `${candidate.id}: normalized location`,
  );
  assert.equal(
    candidate.dedupeKey,
    duplicateKey(candidate.entityType, candidate.name, candidate.locality, candidate.country),
    `${candidate.id}: normalized duplicate key`,
  );

  const source = sourceCatalog[candidate.sourceKey as keyof typeof sourceCatalog];
  assert.ok(source, `${candidate.id}: source key is unknown`);
  assert.equal(candidate.sourceUrl, source.url, `${candidate.id}: source URL diverges from registry`);
  assert.equal(candidate.sourceType, source.type, `${candidate.id}: source type diverges from registry`);
  assert.match(candidate.sourceUrl, HTTPS_URL, `${candidate.id}: source URL must be HTTPS`);
  assert.match(candidate.sourceLastChecked, /^\d{4}-\d{2}-\d{2}$/, `${candidate.id}: source review date`);

  if (candidate.entityType === "stay_anchor") {
    assert.equal(candidate.importTarget, "KosherArea", `${candidate.id}: stay anchor mapping`);
  }
  if (candidate.entityType === "kosher_travel_resource") {
    assert.equal(candidate.importTarget, "PracticalPlace", `${candidate.id}: resource mapping`);
    assert.ok(
      ["official_community", "official_kosher_certifier", "official_municipal"].includes(candidate.sourceType),
      `${candidate.id}: practical Jewish resource needs a community, certifier or municipal source`,
    );
  }
  if (candidate.entityType === "attraction") {
    assert.equal(candidate.importTarget, "Attraction", `${candidate.id}: attraction mapping`);
  }
  if (candidate.entityType === "vacation_destination") {
    assert.equal(candidate.importTarget, "VacationDestination", `${candidate.id}: destination mapping`);
  }

  assert.equal(candidate.publicationReadiness, "NEEDS_REVIEW", `${candidate.id}: source pack rows must never auto-publish`);
  assert.ok(candidate.requiredBeforePublication.length > 0, `${candidate.id}: publication gate is missing`);

  for (const field of FORBIDDEN_PUBLIC_DETAIL_FIELDS) {
    assert.ok(!(field in candidate), `${candidate.id}: source pack must not carry ${field}`);
  }
}

export function validateWorldwideBatch2(): ValidationReport {
  assert.ok(
    worldwideBatch2Candidates.length >= 100 && worldwideBatch2Candidates.length <= 175,
    `candidate count must be 100–175; received ${worldwideBatch2Candidates.length}`,
  );

  const ids = new Set<string>();
  const dedupeKeys = new Set<string>();
  for (const candidate of worldwideBatch2Candidates) {
    validateCandidate(candidate);
    assert.ok(!ids.has(candidate.id), `${candidate.id}: duplicate stable id`);
    assert.ok(!dedupeKeys.has(candidate.dedupeKey), `${candidate.id}: duplicate normalized key`);
    assert.ok(
      !existingContentExcludedDedupeKeys.has(candidate.dedupeKey),
      `${candidate.id}: duplicates a current core-content snapshot`,
    );
    ids.add(candidate.id);
    dedupeKeys.add(candidate.dedupeKey);
  }

  return {
    candidateCount: worldwideBatch2Candidates.length,
    byCountry: countBy(worldwideBatch2Candidates.map((candidate) => candidate.country)),
    byEntityType: countBy(worldwideBatch2Candidates.map((candidate) => candidate.entityType)),
    byCategory: countBy(worldwideBatch2Candidates.map((candidate) => candidate.category)),
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/validate.ts")) {
  const report = validateWorldwideBatch2();
  console.log(JSON.stringify(report, null, 2));
}
