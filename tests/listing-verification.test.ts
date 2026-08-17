import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifiedListingProblem } from "../lib/listing-verification";

describe("verified listings", () => {
  it("lets an unchecked listing save without a source or date", () => {
    assert.equal(
      verifiedListingProblem({ verification: "NEEDS_VERIFICATION", sourceUrl: null, lastVerified: null }),
      null,
    );
  });

  it("refuses Verified without a source", () => {
    assert.match(
      verifiedListingProblem({
        verification: "VERIFIED",
        sourceUrl: "  ",
        lastVerified: new Date("2026-03-03"),
      }) ?? "",
      /source/,
    );
  });

  it("refuses Verified without a date", () => {
    assert.match(
      verifiedListingProblem({
        verification: "VERIFIED",
        sourceUrl: "https://example.com/source",
        lastVerified: null,
      }) ?? "",
      /date/,
    );
  });

  it("accepts Verified with both", () => {
    assert.equal(
      verifiedListingProblem({
        verification: "VERIFIED",
        sourceUrl: "https://example.com/source",
        lastVerified: new Date("2026-03-03"),
      }),
      null,
    );
  });
});
