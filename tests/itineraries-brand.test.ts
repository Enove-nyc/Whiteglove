import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  categoriesForBrand,
  ITINERARIES_CATEGORIES,
  itinerariesBookingCategoryFor,
  NAV_CATEGORIES,
} from "@/lib/navigation";
import { brandForHost, brandFromRequestHeaders } from "@/lib/site-brand-core";

/**
 * whitegloveitineraries.com is its own site — STRICTLY the planner, not a guide.
 *
 * This pins the two halves of that. The navigation the itineraries domain shows
 * carries only planning, booking and the app — none of the guide's browsable
 * sections. And the middleware sends any guide page reached on that domain to
 * the kosher site, so the two never blur into one.
 */

function bag(entries: Record<string, string>) {
  const lower = new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

const guideHref = (href: string) =>
  ["/kosher", "/cemeteries", "/tzaddikim", "/shuls", "/mikvaos", "/heritage", "/hotels", "/things-to-do", "/destinations", "/map", "/directory"]
    .some((p) => href === p || href.startsWith(`${p}?`) || href.startsWith(`${p}/`));

describe("the itineraries bar is a planner, not a guide", () => {
  it("carries only Plan, Book and the app", () => {
    assert.deepEqual(
      ITINERARIES_CATEGORIES.map((c) => c.label),
      ["Plan", "Book", "The app"],
    );
  });

  it("names no guide page anywhere in its menus", () => {
    for (const category of ITINERARIES_CATEGORIES) {
      for (const link of category.links) {
        assert.ok(!guideHref(link.href), `itineraries menu should not link the guide page ${link.href}`);
      }
    }
  });

  it("hands the itineraries brand its own bar, and leaves the kosher one alone", () => {
    assert.equal(categoriesForBrand("itineraries"), ITINERARIES_CATEGORIES);
    assert.equal(categoriesForBrand("kosher"), NAV_CATEGORIES);
    // The kosher bar still has its guide category — untouched.
    assert.ok(NAV_CATEGORIES.some((c) => c.label === "Kosher"));
  });

  it("resolves Book to the booking searches, never a browse", () => {
    const open = itinerariesBookingCategoryFor({ searchIsPublic: true, label: "Book", href: "/book", description: "" });
    assert.deepEqual(open.links.map((l) => l.label), ["Flights", "Hotels", "Cars"]);
    // Locked, it collapses to the one public assistance link — still not a browse.
    const locked = itinerariesBookingCategoryFor({ searchIsPublic: false, label: "Ask us to book", href: "/contact", description: "d" });
    assert.equal(locked.links.length, 1);
    assert.equal(locked.links[0].href, "/contact");
  });
});

describe("brand reads the proxy header, then the host", () => {
  it("honours the header when the worker has rewritten the Host", () => {
    assert.equal(brandFromRequestHeaders(bag({ host: "whiteglove-production.up.railway.app", "x-wg-brand": "itineraries" })), "itineraries");
    assert.equal(brandForHost("www.whitegloveitineraries.com"), "itineraries");
    assert.equal(brandForHost("www.whiteglovekoshertravel.com"), "kosher");
  });
});

describe("the guide is redirected off the itineraries domain", () => {
  const MW = readFileSync("middleware.ts", "utf8");

  it("redirects a guide path to the kosher origin, on the itineraries brand", () => {
    assert.match(MW, /isGuidePath\(pathname\) && brandFromRequestHeaders\(request\.headers\) === "itineraries"/);
    assert.match(MW, /BRAND_ORIGIN\.kosher/);
  });

  it("lists the guide's sections and NOT the planner's own paths", () => {
    const list = MW.slice(MW.indexOf("GUIDE_ONLY_PREFIXES"), MW.indexOf("function isGuidePath"));
    for (const guide of ["/kosher", "/cemeteries", "/heritage", "/destinations", "/hotels", "/things-to-do", "/directory"]) {
      assert.ok(list.includes(`"${guide}"`), `guide prefix ${guide} should be redirected`);
    }
    for (const planner of ["/plan", "/itinerary", "/app", "/account", "/i", "/f", "/book"]) {
      assert.ok(!list.includes(`"${planner}"`), `planner path ${planner} must stay on the itineraries domain`);
    }
  });
});
