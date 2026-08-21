import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BRAND_DOMAIN, BRAND_NAME } from "@/lib/site-brand-core";

/**
 * The printed and shared itinerary document used to credit
 * whiteglovekoshertravel.com unconditionally — cover, page header, and the
 * footer credit line all said "Kosher Travel" even on a document produced by
 * White Glove Itineraries, the one brand this document's own comment says
 * must never claim to be the other. `siteBrand` is what fixes that: the
 * component now takes which site actually produced the document and credits
 * that one, never the other, while still never letting a Business account's
 * own letterhead remove the credit line entirely.
 */

const SOURCE = readFileSync("components/PrintableItinerary.tsx", "utf8");

describe("the printed document credits whichever site made it", () => {
  it("takes a siteBrand prop, defaulted to kosher for the one caller that can never be itineraries", () => {
    assert.match(SOURCE, /siteBrand\s*=\s*"kosher"/);
    assert.match(SOURCE, /siteBrand\?:\s*SiteBrand/);
  });

  it("never hardcodes the kosher name or domain outside the brand tables", () => {
    // Every remaining literal "Kosher Travel" / "whiteglovekoshertravel.com"
    // in the file must be inside the wordmark's own ternary or a comment —
    // not a bare fallback string handed straight to JSX.
    assert.doesNotMatch(SOURCE, /: "White Glove Kosher Travel"/);
    assert.doesNotMatch(SOURCE, /: "whiteglovekoshertravel\.com"/);
    assert.doesNotMatch(SOURCE, /"Planned with whiteglovekoshertravel\.com"/);
  });

  it("uses the shared brand tables for the name and the domain", () => {
    assert.match(SOURCE, /BRAND_NAME\[siteBrand\]/);
    assert.match(SOURCE, /BRAND_DOMAIN\[siteBrand\]/);
  });
});

describe("the two callers that can actually be reached from either brand", () => {
  it("the owner's own print page resolves the brand from the browser's own host", () => {
    const page = readFileSync("app/itinerary/print/page.tsx", "utf8");
    assert.match(page, /brandForHost\(window\.location\.hostname\)/);
    assert.match(page, /siteBrand=\{siteBrand\}/);
  });

  it("the shared print page resolves the brand the trip was actually shared from", () => {
    const page = readFileSync("app/i/[shareId]/print/page.tsx", "utf8");
    assert.match(page, /currentBrand\(\)/);
    assert.match(page, /siteBrand=\{await currentBrand\(\)\}/);
  });
});

describe("the brand tables themselves", () => {
  it("name and domain agree on which brand is which", () => {
    assert.equal(BRAND_NAME.kosher, "White Glove Kosher Travel");
    assert.equal(BRAND_NAME.itineraries, "White Glove Itineraries");
    assert.equal(BRAND_DOMAIN.kosher, "whiteglovekoshertravel.com");
    assert.equal(BRAND_DOMAIN.itineraries, "whitegloveitineraries.com");
  });
});
