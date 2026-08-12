import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import { BUILT_IN_CONTENT_IMPORT_PACKAGES } from "@/data/imports";
import {
  annotateBatchDuplicates,
  findBulkContentDuplicate,
  isDisallowedImportSource,
  prepareBulkContentCandidate,
  softListingName,
  type BulkContentCandidateInput,
} from "@/lib/bulk-content";

const officialSourceAttraction: BulkContentCandidateInput = {
  kind: "ATTRACTION",
  category: "Museum",
  name: "Example Museum",
  city: "London",
  country: "United Kingdom",
  address: "1 Example Street",
  coordinates: "51.5000, -0.1200",
  sourceUrl: "https://example-museum.test/visit",
  sourceId: "official:example-museum",
  sourceName: "Example Museum",
  attribution: "Example Museum",
  sourceEvidence: "Official visitor information for the museum.",
};

const retiredMapSource = ["open", "street", "map"].join("");
const retiredQueryService = ["over", "pass"].join("");
const prohibitedPlacesProduct = ["Google", " Places"].join("");

describe("bulk content source requirements", () => {
  it("will not even stage a row with no traceable source", () => {
    const candidate = prepareBulkContentCandidate({ ...officialSourceAttraction, sourceUrl: "", sourceId: "", attribution: "" });
    assert.equal(candidate.canStage, false);
    assert.ok(candidate.stageErrors.some((error) => /source URL/i.test(error)));
    assert.ok(candidate.stageErrors.some((error) => /stable source ID/i.test(error)));
    assert.ok(candidate.stageErrors.some((error) => /attribution/i.test(error)));
  });

  it("accepts an official discovery lead but does not mistake it for public copy", () => {
    const candidate = prepareBulkContentCandidate({ ...officialSourceAttraction, summary: null });
    assert.equal(candidate.canStage, true);
    assert.equal(candidate.canPublish, false);
    assert.ok(candidate.publishBlockers.some((error) => /customer-ready summary/i.test(error)));
  });

  it("requires a complete attraction shape before public publication", () => {
    const candidate = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      summary: "A small museum with a focused collection and a practical stop for a day in central London.",
    });
    assert.equal(candidate.canPublish, true);
  });

  it("accepts a write-in attraction category", () => {
    const candidate = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      category: "Botanical garden",
      summary: "A quiet garden stop with shade and room for children to walk.",
    });
    assert.equal(candidate.category, "Botanical garden");
    assert.equal(candidate.canPublish, true);
  });

  it("normalizes pack attraction category aliases", () => {
    const candidate = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      category: "Landmark attraction",
      summary: "A landmark stop for a day in central London.",
    });
    assert.equal(candidate.category, "Landmark");
    assert.equal(candidate.canPublish, true);
  });

  it("blocks publishing beis hachaim from the attraction import path", () => {
    const candidate = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      category: "Beis hachaim",
      summary: "A historic cemetery lead for editorial routing.",
    });
    assert.equal(candidate.canPublish, false);
    assert.ok(candidate.publishBlockers.some((error) => /beis hachaim|kevarim/i.test(error)));
  });

  it("rejects retired map sources and Google Places at staging time", () => {
    for (const source of [
      {
        sourceUrl: `https://www.${retiredMapSource}.org/node/123`,
        sourceName: retiredMapSource,
        attribution: `${retiredMapSource} contributors`,
      },
      {
        sourceUrl: "https://places.googleapis.com/v1/places/example",
        sourceName: prohibitedPlacesProduct,
        attribution: prohibitedPlacesProduct,
      },
      {
        sourceUrl: "https://official.example.org/listing",
        sourceName: "Official source",
        attribution: "Official source",
        sourceEvidence: `${retiredQueryService} output`,
      },
    ]) {
      const candidate = prepareBulkContentCandidate({ ...officialSourceAttraction, ...source });
      assert.equal(candidate.canStage, false);
      assert.equal(isDisallowedImportSource(candidate), true);
      assert.ok(candidate.stageErrors.some((error) => /cannot be used for import candidates/i.test(error)));
    }
  });
});

describe("bulk content publication boundaries", () => {
  it("requires both category and destination for a practical listing", () => {
    const incomplete = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      kind: "PRACTICAL",
      category: null,
      summary: "A practical connection point whose published source identifies it for visitors.",
    });
    assert.equal(incomplete.canPublish, false);
    assert.ok(incomplete.publishBlockers.some((error) => /category/i.test(error)));
    assert.ok(incomplete.publishBlockers.some((error) => /destination/i.test(error)));

    const ready = prepareBulkContentCandidate({
      ...incomplete,
      category: "TRANSPORT",
      destinationSlug: "london",
    });
    assert.equal(ready.canPublish, true);
  });

  it("never bulk-publishes a kosher food claim", () => {
    const candidate = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      kind: "KOSHER_FOOD",
      category: "KOSHER_FOOD",
      destinationSlug: "london",
      summary: "A food listing with a current directory source for the editor to review.",
      kosherSourceUrl: "https://example.org/kosher-directory/example",
    });
    assert.equal(candidate.canStage, true);
    assert.equal(candidate.canPublish, false);
    assert.ok(candidate.publishBlockers.some((error) => /destination editor/i.test(error)));
  });

  it("requires a real public anchor for a place to stay", () => {
    const candidate = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      kind: "PLACE_TO_STAY",
      category: "Ordinary hotel, well placed",
      summary: "A hotel source candidate whose position needs an editorial connection to the right part of town.",
    });
    assert.equal(candidate.canPublish, false);
    assert.ok(candidate.publishBlockers.some((error) => /quarter or shul/i.test(error)));
    assert.ok(candidate.publishBlockers.some((error) => /coordinates/i.test(error)));
  });
});

describe("bulk content deduplication", () => {
  it("prefers a stable source URL and source ID match", () => {
    const candidate = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      summary: "A useful museum source candidate for editorial review.",
    });
    const duplicate = findBulkContentDuplicate(candidate, [{
      id: "candidate:old",
      kind: "EXISTING",
      name: "A renamed museum",
      city: "Elsewhere",
      country: "Elsewhere",
      sourceUrl: "https://example-museum.test/visit",
      sourceId: "official:example-museum",
    }]);
    assert.deepEqual(duplicate, { id: "candidate:old", reason: "source" });
  });

  it("falls back to normalized name and location across sources", () => {
    const candidate = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      name: "Musée d’Example",
      city: "Paris",
      country: "France",
    });
    const duplicate = findBulkContentDuplicate(candidate, [{
      id: "attraction:old",
      kind: "EXISTING",
      name: "Musee d Example",
      city: "Paris",
      country: "France",
      sourceUrl: "https://official.example/museum",
    }]);
    assert.deepEqual(duplicate, { id: "attraction:old", reason: "name-and-location" });
  });

  it("treats Attraction and Practical for the same synagogue as one place", () => {
    const attraction = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      kind: "ATTRACTION",
      category: "Jewish heritage",
      name: "Abuhav Synagogue",
      city: "Tzfat",
      country: "Israel",
      sourceId: "heritage:abuhav",
      sourceUrl: "https://example.org/tzfat/abuhav-heritage",
    });
    const practical = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      kind: "PRACTICAL",
      category: "MINYAN",
      name: "Abuhav Synagogue",
      city: "Tzfat",
      country: "Israel",
      destinationSlug: "tzfat",
      sourceId: "shul:abuhav",
      sourceUrl: "https://example.org/tzfat/abuhav-shul",
      summary: "Abuhav Synagogue is a synagogue / minyan address in Tzfat.",
    });
    assert.equal(softListingName("Abuhav Synagogue courtyard framing"), "abuhav synagogue");
    assert.deepEqual(
      findBulkContentDuplicate(practical, [{
        id: "candidate:attraction",
        kind: "ATTRACTION",
        name: attraction.name,
        city: attraction.city,
        country: attraction.country,
        sourceUrl: attraction.sourceUrl,
        sourceId: attraction.sourceId,
      }]),
      { id: "candidate:attraction", reason: "name-and-location" },
    );
    assert.deepEqual(
      findBulkContentDuplicate(attraction, [{
        id: "candidate:practical",
        kind: "PRACTICAL",
        name: "Abuhav Synagogue courtyard framing",
        city: "Tzfat",
        country: "Israel",
        sourceUrl: practical.sourceUrl,
        sourceId: practical.sourceId,
      }]),
      { id: "candidate:practical", reason: "name-and-location" },
    );
  });

  it("marks the second same-place row inside one staging batch as a duplicate", () => {
    const attraction = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      kind: "ATTRACTION",
      category: "Jewish heritage",
      name: "Abuhav Synagogue",
      city: "Tzfat",
      country: "Israel",
      sourceId: "heritage:abuhav",
      sourceUrl: "https://example.org/tzfat/abuhav-heritage",
      summary: "A Jewish-heritage site in Tzfat.",
    });
    const practical = prepareBulkContentCandidate({
      ...officialSourceAttraction,
      kind: "PRACTICAL",
      category: "MINYAN",
      name: "Abuhav Synagogue",
      city: "Tzfat",
      country: "Israel",
      destinationSlug: "tzfat",
      sourceId: "shul:abuhav",
      sourceUrl: "https://example.org/tzfat/abuhav-shul",
      summary: "Abuhav Synagogue is a synagogue / minyan address in Tzfat.",
    });
    const annotated = annotateBatchDuplicates([attraction, practical]);
    assert.equal(annotated[0]?.duplicateOf, null);
    assert.equal(annotated[1]?.duplicateOf, `batch:${attraction.dedupeKey}`);
  });
});

describe("checked-in import packages", () => {
  it("contains no retired map package or map-derived candidate", () => {
    assert.equal(existsSync("data/imports/osm-vacation-markets-2026-08.json"), false);
    for (const sourcePackage of BUILT_IN_CONTENT_IMPORT_PACKAGES) {
      assert.equal(isDisallowedImportSource(sourcePackage.batch), false, `${sourcePackage.batch.slug} uses a prohibited source`);
      for (const candidate of sourcePackage.candidates) {
        assert.equal(isDisallowedImportSource(candidate), false, `${candidate.sourceId} uses a prohibited source`);
      }
    }
  });
});
