import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * The terms and the privacy policy both named the kosher brand outright —
 * in the tab title, the hero eyebrow, the opening paragraph, and (on the
 * terms page) the description of what the Service even is. Both pages are
 * reachable from either brand, so both are now rendered per request rather
 * than prerendered, and pull the name/domain from currentBrand() the same
 * way every other brand-aware page does.
 */

const TERMS = readFileSync("app/terms/page.tsx", "utf8");
const PRIVACY = readFileSync("app/privacy/page.tsx", "utf8");

describe("the terms page names whichever brand a visitor is actually on", () => {
  it("is rendered per request, not prerendered with one brand baked in", () => {
    assert.match(TERMS, /export const dynamic = "force-dynamic"/);
    assert.match(TERMS, /async function generateMetadata/);
    assert.match(TERMS, /currentBrand\(\)/);
  });

  it("no longer hardcodes the kosher name outside the brand table", () => {
    assert.doesNotMatch(TERMS, /"Terms of Use — White Glove Kosher Travel"/);
    assert.doesNotMatch(TERMS, /owned by White Glove Kosher Travel/);
    assert.doesNotMatch(TERMS, /White Glove Kosher Travel will not be liable/);
  });

  it("describes a different Service for itineraries — no guide content that doesn't exist there", () => {
    assert.match(TERMS, /itineraries \? \(/);
    assert.match(TERMS, /White Glove Itineraries provides trip-planning tools/);
    // The kosher description (destination guides, cemetery and access info) is
    // still there for the kosher branch — just no longer the only one.
    assert.match(TERMS, /destination guides, cemetery and access information/);
  });

  it("keeps the affiliate disclosure section — a different finding, not this one", () => {
    assert.match(TERMS, /affiliateDisclosure/);
    assert.match(TERMS, /How this site is paid/);
  });
});

describe("the privacy policy names whichever brand a visitor is actually on", () => {
  it("is rendered per request, not prerendered with one brand baked in", () => {
    assert.match(PRIVACY, /export const dynamic = "force-dynamic"/);
    assert.match(PRIVACY, /async function generateMetadata/);
    assert.match(PRIVACY, /currentBrand\(\)/);
  });

  it("no longer hardcodes the kosher name or domain outside the brand tables", () => {
    assert.doesNotMatch(PRIVACY, /"Privacy Policy — White Glove Kosher Travel"/);
    assert.doesNotMatch(PRIVACY, /White Glove Kosher Travel \(&ldquo;White Glove/);
    assert.doesNotMatch(PRIVACY, /import \{ SITE_DOMAIN \} from "@\/lib\/features"/);
  });

  it("describes what it provides differently per brand, in the same sentence structure", () => {
    assert.match(PRIVACY, /itineraries \? "trip-planning tools" : "travel guides and planning tools for kosher travel and Jewish heritage journeys"/);
  });
});
