import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SITE_DOMAIN, SITE_NAME } from "@/lib/features";
import { BRAND_NAME } from "@/lib/site-brand-core";

/**
 * One app, two domains. Most of the separation was already done — the footer,
 * the navbar, the manifest, the terms and privacy pages all read the brand at
 * request time. These pin the two places that did not, and, just as
 * importantly, the places that MUST stay kosher and would be a regression to
 * "fix".
 */

describe("the root shell names neither brand", () => {
  const LAYOUT = readFileSync("app/layout.tsx", "utf8");

  it("the fallback title and app name are the name both brands share", () => {
    assert.match(LAYOUT, /title: "White Glove",/);
    assert.match(LAYOUT, /applicationName: "White Glove",/);
  });

  it("it does not name either brand outright", () => {
    assert.doesNotMatch(LAYOUT, /title: "White Glove Kosher Travel"/);
    assert.doesNotMatch(LAYOUT, /applicationName: "White Glove Kosher Travel"/);
    assert.doesNotMatch(LAYOUT, /"White Glove Itineraries"/);
  });

  it("and it stays STATIC — reading the brand here would un-prerender the site", () => {
    // 841 pages prerender today. A generateMetadata() reading headers() in the
    // ROOT layout makes every one of them render on demand, to fix a string
    // that only shows on a page setting no title of its own.
    assert.match(LAYOUT, /export const metadata: Metadata = \{/);
    assert.doesNotMatch(LAYOUT, /export async function generateMetadata/);
  });
});

describe("the manifest is what an installed icon is really named from", () => {
  it("and it does read the brand per request", () => {
    const MANIFEST = readFileSync("app/manifest.ts", "utf8");
    assert.match(MANIFEST, /itineraries \? "White Glove Itineraries" : "White Glove Kosher Travel"/);
  });
});

describe("a brand name has one source", () => {
  it("lib/features.ts no longer keeps its own copy", () => {
    assert.equal(SITE_NAME, BRAND_NAME.kosher);
    const FEATURES = readFileSync("lib/features.ts", "utf8");
    assert.doesNotMatch(FEATURES, /SITE_NAME = "White Glove Kosher Travel"/);
    assert.match(FEATURES, /SITE_NAME = BRAND_NAME\.kosher/);
  });
});

describe("what must NOT be made brand-neutral", () => {
  it("SITE_DOMAIN stays the kosher domain — it pins a verified sender and an affiliate host", () => {
    // lib/travelpayouts-search.ts sends it as x-real-host, and the alerts
    // sender is checked against it. Neither follows the visitor's brand.
    assert.equal(SITE_DOMAIN, "whiteglovekoshertravel.com");
  });

  it("the alert-list consent line still names what people actually subscribed to", () => {
    // Everyone on that list ticked a box on the kosher site. Rewording this to
    // follow the reader's current domain would misstate their consent.
    const BLAST = readFileSync("lib/email-blast.ts", "utf8");
    assert.match(BLAST, /You asked to hear from White Glove Kosher Travel\./);
  });

  it("transactional mail stays on the shared name, deliberately", () => {
    const EMAIL = readFileSync("lib/email.ts", "utf8");
    assert.match(EMAIL, /subject: "Your White Glove verification code"/);
    assert.match(EMAIL, /subject: "Reset your White Glove password"/);
  });
});
