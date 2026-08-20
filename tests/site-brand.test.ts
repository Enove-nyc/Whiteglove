import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { brandForHost, isItinerariesHost, BRAND_ORIGIN } from "@/lib/site-brand";

describe("site brand by host", () => {
  it("reads the itineraries domain", () => {
    assert.equal(brandForHost("www.whitegloveitineraries.com"), "itineraries");
    assert.equal(brandForHost("whitegloveitineraries.com"), "itineraries");
    assert.equal(isItinerariesHost("WHITEGLOVEITINERARIES.COM"), true);
  });
  it("treats the kosher domain and everything unknown as kosher", () => {
    assert.equal(brandForHost("www.whiteglovekoshertravel.com"), "kosher");
    assert.equal(brandForHost("localhost:3000"), "kosher");
    assert.equal(brandForHost(undefined), "kosher");
    assert.equal(brandForHost(null), "kosher");
  });
  it("keeps the two origins apart", () => {
    assert.notEqual(BRAND_ORIGIN.kosher, BRAND_ORIGIN.itineraries);
  });
});
