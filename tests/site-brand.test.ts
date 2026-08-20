import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { brandForHost, brandFromRequestHeaders, isItinerariesHost, BRAND_ORIGIN, BRAND_HEADER } from "@/lib/site-brand";

/** A tiny stand-in for a request's header bag. */
function bag(entries: Record<string, string>) {
  const lower = new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

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

describe("site brand from a request's headers", () => {
  it("falls through to the Host when no brand header is set", () => {
    // The kosher site is served straight off Railway with no proxy header, so
    // this is the ordinary case and must read exactly like brandForHost.
    assert.equal(brandFromRequestHeaders(bag({ host: "www.whiteglovekoshertravel.com" })), "kosher");
    assert.equal(brandFromRequestHeaders(bag({ host: "www.whitegloveitineraries.com" })), "itineraries");
  });

  it("lets the proxy header name the brand when the Host has been rewritten", () => {
    // This is the itineraries case behind the proxy: Host is the Railway
    // service domain (which reads as kosher), and the header carries the truth.
    assert.equal(
      brandFromRequestHeaders(bag({ host: "whiteglove-production.up.railway.app", [BRAND_HEADER]: "itineraries" })),
      "itineraries",
    );
  });

  it("ignores a header that names nothing it knows, and reads the Host", () => {
    assert.equal(brandFromRequestHeaders(bag({ host: "www.whiteglovekoshertravel.com", [BRAND_HEADER]: "nonsense" })), "kosher");
    assert.equal(brandFromRequestHeaders(bag({ host: "www.whiteglovekoshertravel.com", [BRAND_HEADER]: "" })), "kosher");
  });
});
