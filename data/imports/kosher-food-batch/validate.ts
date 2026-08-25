import assert from "node:assert/strict";
import { kosherFoodBatchCandidates, kosherFoodDedupeReport } from "./candidates";
import { addressKey, nameCore } from "./dedupe";
import {
  duplicateKey,
  KOSHER_FOOD_BATCH_SCHEMA_VERSION,
  makeCandidateId,
  normalizedLocation,
  normalizeText,
} from "./schema";
import { sourceCatalog } from "./sources";
import { notABusinessReason } from "@/data/listing-quality";

const HTTP_URL = /^https?:\/\/[^\s]+$/;
const FORBIDDEN_PHRASE = /kosher-style|israeli-style|jewish-style/i;

export function validatePack() {
  assert.ok(kosherFoodBatchCandidates.length > 0, "pack is empty");
  assert.equal(
    kosherFoodDedupeReport.kept,
    kosherFoodBatchCandidates.length,
    "exported list must match the collapsed keep set",
  );
  const ids = new Set<string>();
  const keys = new Set<string>();
  const slugs = new Set<string>();
  const addresses = new Set<string>();
  const namePlaces = new Set<string>();
  for (const candidate of kosherFoodBatchCandidates) {
    assert.equal(candidate.schemaVersion, KOSHER_FOOD_BATCH_SCHEMA_VERSION);
    assert.equal(candidate.id, makeCandidateId(candidate));
    assert.equal(candidate.sourceId, candidate.id);
    assert.ok(candidate.id.startsWith("wgkf-"), candidate.id);
    assert.equal(candidate.importKind, "KOSHER_FOOD");
    assert.equal(candidate.listingLabel, "Kosher food");
    assert.equal(candidate.publicationReadiness, "NEEDS_REVIEW");
    assert.equal(candidate.kosherClaim, "reported");
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
    assert.match(candidate.sourceUrl, HTTP_URL);
    assert.match(candidate.kosherSourceUrl, HTTP_URL);
    assert.doesNotMatch(candidate.sourceUrl, /openstreetmap|overpass|photon|maps\.google|places\.googleapis/i);
    // A harvester walking a page's rows picks up the page's own furniture as
    // readily as its listings — a "Need Help?" box, a newsletter form, a
    // cookie "Close" button. Ten of those reached the published directory
    // before this assertion existed, each one wrapped in a generated sentence
    // claiming a named certifier lists it as kosher. Fail here, at the
    // harvest, rather than leaning on the read-path filter forever.
    const notABusiness = notABusinessReason(candidate.name);
    assert.ok(!notABusiness, `${candidate.id}: ${notABusiness}`);
    const blob = `${candidate.name} ${candidate.summary} ${candidate.keywords.join(" ")}`;
    assert.doesNotMatch(blob, FORBIDDEN_PHRASE, `${candidate.id} uses a kosher-style stand-in`);
    assert.match(blob, /kosher/i, `${candidate.id} does not say kosher`);
    assert.ok(candidate.requiredBeforePublication.length > 0);
    assert.ok(!ids.has(candidate.id), `duplicate id ${candidate.id}`);
    assert.ok(!keys.has(candidate.dedupeKey), `duplicate key ${candidate.dedupeKey}`);
    const slugKey = `${candidate.slug}::${normalizeText(candidate.locality)}::${normalizeText(candidate.country)}`;
    assert.ok(!slugs.has(slugKey), `duplicate slug ${slugKey}`);
    const addr = addressKey(candidate.address, candidate.locality, candidate.country);
    if (addr) {
      const addrKey = `${addr}::${normalizeText(candidate.locality)}::${normalizeText(candidate.country)}`;
      assert.ok(!addresses.has(addrKey), `duplicate address ${candidate.id} / ${addrKey}`);
      addresses.add(addrKey);
    }
    const core = nameCore(candidate.name, candidate.locality, candidate.country);
    if (core) {
      const nameKey = `${core}::${normalizeText(candidate.locality)}::${normalizeText(candidate.country)}`;
      assert.ok(!namePlaces.has(nameKey), `duplicate name ${candidate.id} / ${nameKey}`);
      namePlaces.add(nameKey);
    }
    ids.add(candidate.id);
    keys.add(candidate.dedupeKey);
    slugs.add(slugKey);
  }
  return {
    candidateCount: kosherFoodBatchCandidates.length,
    drafted: kosherFoodDedupeReport.drafted,
    dropped: kosherFoodDedupeReport.dropped,
    byReason: kosherFoodDedupeReport.byReason,
    byCountry: Object.fromEntries(
      [...kosherFoodBatchCandidates.reduce((map, candidate) => map.set(candidate.country, (map.get(candidate.country) ?? 0) + 1), new Map<string, number>())].sort(),
    ),
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/validate.ts")) {
  console.log(JSON.stringify(validatePack(), null, 2));
}
