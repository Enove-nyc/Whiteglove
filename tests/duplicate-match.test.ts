import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findNearDuplicates,
  metresBetween,
  normalizePersonName,
  normalizePhone,
  normalizeTownName,
  parseCoordinates,
} from "../lib/duplicate-match";

describe("name and town folding", () => {
  it("drops honorifics, punctuation and case", () => {
    assert.equal(normalizePersonName("HaRav Elimelech of Lizhensk"), "elimelech of lizhensk");
    assert.equal(normalizePersonName("R' Elimelech"), "elimelech");
    assert.equal(normalizePersonName("Reb Elimelech"), "elimelech");
  });

  it("treats Leżajsk and Lizhensk as the same town", () => {
    assert.equal(normalizeTownName("Leżajsk"), normalizeTownName("Lizhensk"));
    assert.equal(normalizeTownName("Lizensk"), normalizeTownName("Lezajsk"));
  });

  it("normalises a phone to digits", () => {
    assert.equal(normalizePhone("+48 17 123 45 67"), normalizePhone("0048171234567"));
  });
});

describe("coordinates", () => {
  it("parses a pair and measures a doorway-scale distance", () => {
    const a = parseCoordinates("50.262, 22.268");
    const b = parseCoordinates("50.2621, 22.2681");
    assert.ok(a && b);
    assert.ok(metresBetween(a, b) < 75);
  });
});

describe("near-duplicate hits", () => {
  const existing = [
    {
      id: "1",
      name: "Rabbi Elimelech of Lizhensk",
      city: "Leżajsk",
      country: "Poland",
      sourceUrl: "https://example.com/elimelech",
    },
  ];

  it("matches a transliterated name in the same town", () => {
    const hits = findNearDuplicates(
      { id: "new", name: "Rav Elimelech", city: "Lizhensk", country: "Poland" },
      existing,
    );
    assert.equal(hits.length, 1);
    assert.ok(hits[0]?.matched.includes("name"));
    assert.ok(hits[0]?.matched.includes("town"));
  });

  it("matches the same source URL as exact", () => {
    const hits = findNearDuplicates(
      { id: "new", name: "Other", city: "Rome", country: "Italy", sourceUrl: "https://example.com/elimelech" },
      existing,
    );
    assert.equal(hits[0]?.confidence, "exact");
  });

  it("does not merge on a shared country alone", () => {
    const hits = findNearDuplicates(
      { id: "new", name: "Completely Different Place", city: "Kraków", country: "Poland" },
      existing,
    );
    assert.equal(hits.length, 0);
  });
});
