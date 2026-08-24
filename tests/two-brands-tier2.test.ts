import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * A batch of smaller pages that each hand-wrote "White Glove Kosher Travel"
 * in a title or in the page body, reachable from either brand: the flight
 * itinerary a client is handed (app/f/[shareId]), the trip command center,
 * the site status/access/search/assistant/rate utility pages, About, Contact,
 * and the referral programme. Each now resolves currentBrand() (or, for
 * app/f, already did) and uses the shared BRAND_NAME table instead.
 *
 * app/not-found.tsx is the one exception: its title now carries no brand
 * ending at all, rather than gaining an async generateMetadata, because a
 * per-segment not-found.tsx's metadata support isn't confirmed the way
 * global-not-found.js's is in this Next version's own docs — not worth the
 * risk on a page that is never indexed anyway.
 */

function reads(path: string) {
  return readFileSync(path, "utf8");
}

describe("pages that now read the brand before naming it", () => {
  const cases = [
    { path: "app/f/[shareId]/page.tsx", body: /Wordmark\(\{ siteBrand \}: \{ siteBrand: SiteBrand \}\)/ },
    { path: "app/command-center/page.tsx", body: /async function generateMetadata/ },
    { path: "app/version/page.tsx", body: /async function generateMetadata/ },
    { path: "app/access/page.tsx", body: /async function generateMetadata/ },
    { path: "app/search/page.tsx", body: /async function generateMetadata/ },
    { path: "app/assistant/page.tsx", body: /async function generateMetadata/ },
    { path: "app/rate/page.tsx", body: /async function generateMetadata/ },
    { path: "app/about/page.tsx", body: /async function generateMetadata/ },
    { path: "app/contact/page.tsx", body: /async function generateMetadata/ },
    { path: "app/account/referral/page.tsx", body: /async function generateMetadata/ },
  ];

  for (const { path, body } of cases) {
    it(`${path} reads currentBrand()`, () => {
      const src = reads(path);
      assert.match(src, /currentBrand\(\)/, `${path} does not read the real brand`);
      assert.match(src, body, `${path} does not match its expected brand-aware shape`);
    });
  }
});

describe("app/f/[shareId]/page.tsx's body, not just its already-brand-aware title", () => {
  const src = reads("app/f/[shareId]/page.tsx");
  it("the wordmark sub-line names whichever brand made the document", () => {
    assert.match(src, /siteBrand === "itineraries" \? "Itineraries" : "Kosher Travel"/);
  });
  it("the footer credit no longer hardcodes the kosher brand", () => {
    assert.doesNotMatch(src, /Prepared by White Glove Kosher Travel/);
    assert.match(src, /Prepared by \{BRAND_NAME\[siteBrand\]\}/);
  });
});

describe("app/assistant/page.tsx never links /kosher from the itineraries brand", () => {
  const src = reads("app/assistant/page.tsx");
  it("the kosher food finder link only renders on the kosher brand", () => {
    assert.match(src, /!itineraries && \(/);
    assert.match(src, /href="\/kosher"/);
  });
});

describe("components/AboutProfileSection.tsx names whichever brand is based somewhere", () => {
  const src = reads("components/AboutProfileSection.tsx");
  it("takes a siteBrand prop instead of hardcoding the kosher name", () => {
    assert.match(src, /siteBrand: SiteBrand/);
    assert.doesNotMatch(src, /White Glove Kosher Travel is based in/);
    assert.match(src, /\{BRAND_NAME\[siteBrand\]\} is based in/);
  });
  it("app/about/page.tsx passes the real brand down", () => {
    const page = reads("app/about/page.tsx");
    assert.match(page, /<AboutProfileSection profile=\{profile\} siteBrand=\{siteBrand\}/);
  });
});

describe("app/not-found.tsx carries no brand ending rather than risk an unconfirmed metadata API", () => {
  it("names neither brand, so it can stay a static, non-dynamic export", () => {
    const src = reads("app/not-found.tsx");
    assert.doesNotMatch(src, /Kosher Travel/);
    assert.match(src, /title: "Page not found"/);
  });

  it("still holds against the site's own hand-written-ending rule", () => {
    // tests/title-suffix.test.ts already checks this file directly; this just
    // documents why the fix here looks different from every other page.
    const src = reads("app/not-found.tsx");
    assert.doesNotMatch(src, /title:\s*"[^"]*— White Glove/);
    assert.doesNotMatch(src, /title:\s*"[^"]*\| White Glove"/);
  });
});
