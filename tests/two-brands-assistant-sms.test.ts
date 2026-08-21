import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { siteAssistantSystemFor } from "@/lib/site-assistant";
import { BRAND_NAME } from "@/lib/site-brand-core";

/**
 * Two more gaps in the same "Itineraries must never reveal Kosher Travel"
 * sweep, found after the audit's own list was already closed out:
 *
 *   - The SITE assistant (the corner chat widget mounted in the root layout,
 *     app/layout.tsx — on every page of both brands) told an itineraries
 *     visitor, in its own words, "You are White Glove Kosher Travel's site
 *     assistant." This is the sibling of the AI travel assistant fix
 *     (tests/two-brands-assistant.test.ts) for the OTHER assistant on the
 *     site — the one that answers only from published pages rather than
 *     general AI knowledge.
 *   - The verification-code and password-reset text messages (lib/sms.ts)
 *     said "White Glove Kosher Travel" outright, reachable from a phone
 *     sign-up or sign-in on either brand.
 */

describe("the site assistant (the corner widget on every page) names whichever brand asked", () => {
  it("siteAssistantSystemFor is a function of brand, not a fixed constant", () => {
    const kosher = siteAssistantSystemFor("kosher");
    const itineraries = siteAssistantSystemFor("itineraries");
    assert.match(kosher, /You are the site assistant for White Glove Kosher Travel/);
    assert.match(itineraries, /You are the site assistant for White Glove Itineraries/);
    assert.doesNotMatch(itineraries, /Kosher Travel/);
  });

  it("the route resolves the brand from the request and hands every provider the same prompt", () => {
    const route = readFileSync("app/api/assistant/site/route.ts", "utf8");
    assert.match(route, /siteAssistantSystemFor\(brandFromRequestHeaders\(request\.headers\)\)/);
    assert.doesNotMatch(route, /SITE_ASSISTANT_SYSTEM/, "the old fixed export should not still be referenced");
    assert.match(route, /systemInstruction: \{ parts: \[\{ text: system \}\] \}/);
    assert.match(route, /\n\s*system,\n/);
  });
});

describe("verification and password-reset text messages name whichever brand asked", () => {
  const SMS = readFileSync("lib/sms.ts", "utf8");
  const DELIVERY = readFileSync("lib/verification-delivery.ts", "utf8");

  it("sendVerificationSms and sendPasswordResetSms take a siteBrand, defaulted to kosher", () => {
    assert.match(SMS, /sendVerificationSms\(to: string, code: string, siteBrand: SiteBrand = "kosher"\)/);
    assert.match(SMS, /sendPasswordResetSms\(to: string, code: string, siteBrand: SiteBrand = "kosher"\)/);
    assert.doesNotMatch(SMS, /is your White Glove Kosher Travel/);
    assert.match(SMS, /is your \$\{BRAND_NAME\[siteBrand\]\}/);
  });

  it("verification-delivery.ts threads siteBrand through to the text-message sender only", () => {
    assert.match(DELIVERY, /export function verificationCodeTo\(identity: string, code: string, siteBrand: SiteBrand\)/);
    assert.match(DELIVERY, /export function resetCodeTo\(identity: string, code: string, siteBrand: SiteBrand\)/);
  });

  for (const route of [
    "app/api/account/register/route.ts",
    "app/api/account/resend-verification/route.ts",
    "app/api/account/forgot-password/route.ts",
  ]) {
    it(`${route} resolves the real brand and passes it through`, () => {
      const src = readFileSync(route, "utf8");
      assert.match(src, /brandFromRequestHeaders\(request\.headers\)/);
    });
  }
});

describe("the brand table used by both fixes", () => {
  it("matches the same names every other brand-aware fix uses", () => {
    assert.equal(BRAND_NAME.kosher, "White Glove Kosher Travel");
    assert.equal(BRAND_NAME.itineraries, "White Glove Itineraries");
  });
});
