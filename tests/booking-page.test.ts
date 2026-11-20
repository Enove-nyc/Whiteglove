import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * /book is gone; the booking search lives on the home page (owner,
 * 20 November 2026: "I want the /book page to go, everything should be on the
 * main page"). These hold the two halves of that: old links still land on the
 * right search, and the home page shows it to anybody who asked for it.
 */
const BOOK = readFileSync("app/book/page.tsx", "utf8");
const HOME = readFileSync("app/page.tsx", "utf8");
const HOME_VIEW = readFileSync("components/ItinerariesHome.tsx", "utf8");

describe("/book only redirects", () => {
  it("sends every visitor to the home search, keeping what the link carried", () => {
    assert.match(BOOK, /permanentRedirect\(/);
    assert.match(BOOK, /#search/);
    for (const key of ["type", "from", "to", "depart", "return", "destination"]) assert.match(BOOK, new RegExp(`"${key}"`));
    assert.doesNotMatch(BOOK, /BookPartners|TravelSearch/);
  });
});

describe("the home page carries the search", () => {
  it("opens the asked-for tab, prefilled, and does not send a searcher to their trips", () => {
    assert.match(HOME, /askingForSearch/);
    assert.match(HOME, /<ItinerariesHome initialTab=\{initialTab\} prefill=\{prefill\} \/>/);
    assert.match(HOME_VIEW, /id="search"/);
  });
  it("keeps the pointer to Smart Import under the search", () => {
    assert.match(HOME_VIEW, /href="\/itinerary\?import=1"/);
  });
  it("is no longer in the sitemap or the edge cache list as /book", () => {
    assert.doesNotMatch(readFileSync("lib/site-map.ts", "utf8"), /path: "\/book"/);
    assert.doesNotMatch(readFileSync("lib/edge-page-cache.ts", "utf8"), /"\/book"/);
  });
});
