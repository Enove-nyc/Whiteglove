import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import { BRAND_NAME, BRAND_ORIGIN } from "@/lib/site-brand-core";

/**
 * One app, two domains, one build-time metadataBase. Every itineraries page
 * but the home page was shipping a canonical pointing at the kosher domain —
 * telling Google the itineraries domain is a duplicate and should not be the
 * one indexed. These pin the fix.
 */

function canonicalOf(meta: ReturnType<typeof pageMetadata>): string {
  return String(meta.alternates?.canonical ?? "");
}

describe("a page is canonical on its own brand's domain", () => {
  it("an itineraries title is canonical on the itineraries domain", () => {
    const meta = pageMetadata({ title: "Plan a trip | White Glove Itineraries", description: "d", path: "/plan" });
    assert.equal(canonicalOf(meta), `${BRAND_ORIGIN.itineraries}/plan`);
  });

  it("a kosher title stays canonical on the kosher domain", () => {
    const meta = pageMetadata({ title: "Kosher food | White Glove Kosher Travel", description: "d", path: "/kosher" });
    assert.equal(canonicalOf(meta), `${BRAND_ORIGIN.kosher}/kosher`);
  });

  it("an unbranded title falls back to kosher — the site's long-standing default", () => {
    const meta = pageMetadata({ title: "Travel gear", description: "d", path: "/travel-gear" });
    assert.equal(canonicalOf(meta), `${BRAND_ORIGIN.kosher}/travel-gear`);
  });

  it("the canonical is absolute, so no metadataBase can move it", () => {
    const meta = pageMetadata({ title: "Plan a trip | White Glove Itineraries", description: "d", path: "/plan" });
    assert.match(canonicalOf(meta), /^https:\/\//);
  });

  it("a path missing its leading slash is still a real URL", () => {
    const meta = pageMetadata({ title: "Book", description: "d", path: "book" });
    assert.equal(canonicalOf(meta), `${BRAND_ORIGIN.kosher}/book`);
  });
});

describe("an explicit brand outranks whatever the title says", () => {
  it("a kosher-worded CMS title cannot drag an itineraries page onto the kosher domain", () => {
    // Exactly /about's case: one stored seoTitle, shown on both domains.
    const meta = pageMetadata({
      title: "About White Glove Kosher Travel — who we are",
      description: "d",
      path: "/about",
      brand: "itineraries",
    });
    assert.equal(canonicalOf(meta), `${BRAND_ORIGIN.itineraries}/about`);
    assert.equal(meta.openGraph?.siteName, BRAND_NAME.itineraries);
  });

  it("and the reverse holds too", () => {
    const meta = pageMetadata({ title: "Something | White Glove Itineraries", description: "d", path: "/x", brand: "kosher" });
    assert.equal(canonicalOf(meta), `${BRAND_ORIGIN.kosher}/x`);
    assert.equal(meta.openGraph?.siteName, SITE_NAME);
  });
});

describe("title, share card and canonical never name different brands", () => {
  for (const brand of ["kosher", "itineraries"] as const) {
    it(`${brand}: all three agree`, () => {
      const meta = pageMetadata({ title: "A page", description: "d", path: "/p", brand });
      assert.equal(meta.openGraph?.siteName, BRAND_NAME[brand]);
      assert.ok(String(meta.title).endsWith(BRAND_NAME[brand]));
      assert.ok(canonicalOf(meta).startsWith(BRAND_ORIGIN[brand]));
      // og:url is the same absolute address as the canonical, not a bare path.
      assert.equal(meta.openGraph?.url, canonicalOf(meta));
    });
  }
});

describe("the brand names have one source", () => {
  it("seo.ts does not keep its own copy of either brand name", () => {
    assert.equal(SITE_NAME, BRAND_NAME.kosher);
  });
});
