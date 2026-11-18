import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { DIRECTORY_SEARCH_IS_PUBLIC, isDirectoryApi, isPublicPage } from "@/lib/public-access";
import { brandForHost } from "@/lib/site-brand-core";

/**
 * One site, on whitegloveitineraries.com (AGENTS.md, 18 November 2026). The
 * public plans, books and uses the companion app; the directory is the
 * owner's alone. An allow-list, so a new page is private until opened on
 * purpose.
 */
describe("what the public can reach", () => {
  it("opens planning, booking, accounts, the companion and trip links", () => {
    for (const p of ["/", "/itinerary", "/book", "/login", "/account", "/app", "/i/abc", "/t/abc/app", "/p/abc", "/sample-itinerary", "/about", "/contact", "/privacy", "/terms"]) {
      assert.equal(isPublicPage(p), true, p);
    }
  });

  it("keeps pricing, the app demo, recommendations and the adviser screens for the owner alone", () => {
    // The owner's word, 18 November 2026. The trip app itself stays public:
    // a traveller holding a trip code opens their trip at /app.
    for (const p of ["/pricing", "/app/preview", "/plan", "/advisor", "/clients", "/clients/x", "/pipeline", "/proposal", "/payments", "/forms", "/library", "/history", "/commissions", "/agency", "/team/join/x", "/group", "/addons", "/activity"]) {
      assert.equal(isPublicPage(p), false, p);
    }
  });

  it("keeps the whole directory private", () => {
    for (const p of ["/destinations", "/destinations/rome", "/kosher", "/shuls", "/mikvaos", "/heritage", "/hotels", "/things-to-do", "/map", "/directory", "/search", "/cemeteries/x", "/zmanim", "/uman", "/near", "/travel"]) {
      assert.equal(isPublicPage(p), false, p);
    }
  });

  it("does not open a page by sharing a prefix with a public one", () => {
    assert.equal(isPublicPage("/application"), false);
    assert.equal(isPublicPage("/books"), false);
    assert.equal(isPublicPage("/address"), false);
  });

  it("closes the directory's searches and leaves trips and partner searches open", () => {
    for (const p of ["/api/search", "/api/kosher/search", "/api/attractions/search", "/api/lodging/search", "/api/kevarim/search", "/api/itinerary/nearby", "/api/assistant/site"]) {
      assert.equal(isDirectoryApi(p), true, p);
    }
    for (const p of ["/api/account/itinerary", "/api/companion/chat", "/api/lodging/places-search", "/api/flights/search", "/api/hotels/search", "/api/health", "/api/itinerary/ai"]) {
      assert.equal(isDirectoryApi(p), false, p);
    }
  });

  it("the middleware enforces both, with the owner's admin cookie as the only way past", () => {
    const mw = readFileSync("middleware.ts", "utf8");
    assert.match(mw, /isDirectoryApi\(pathname\) && !\(await isOwner\(request\)\)/);
    assert.match(mw, /!isPublicPage\(pathname\) && !\(await isOwner\(request\)\)/);
  });

  it("the planner offers no search of the owner's listings", () => {
    assert.equal(DIRECTORY_SEARCH_IS_PUBLIC, false);
    const builder = readFileSync("components/ItineraryBuilder.tsx", "utf8");
    assert.match(builder, /\{DIRECTORY_SEARCH_IS_PUBLIC && \(\s*<>\s*<span className=\{caption\}>Pick from our listed lodging/);
    assert.match(builder, /\{DIRECTORY_SEARCH_IS_PUBLIC && \(\s*<div[^>]*>\s*\{!itineraries && \(/);
  });

  it("every host but the closed kosher domain is White Glove Itineraries", () => {
    assert.equal(brandForHost("www.whitegloveitineraries.com"), "itineraries");
    assert.equal(brandForHost("localhost:3000"), "itineraries");
    assert.equal(brandForHost("white-glove.netlify.app"), "itineraries");
    assert.equal(brandForHost("www.whiteglovekoshertravel.com"), "kosher");
  });
});
