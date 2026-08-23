import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * The AI travel assistant's system prompt told every visitor, in the
 * assistant's own words, "You are the White Glove Kosher Travel AI travel
 * assistant" — even one on whitegloveitineraries.com, the one brand this
 * site must never reveal to the other. The prompt is now built per request
 * from the request's own Host, the same way every other brand-aware page
 * resolves it, and the kosher food finder — a guide-only path that does not
 * exist on the itineraries brand — is only named by path on the kosher one.
 */

const ROUTE = readFileSync("app/api/itinerary/ai/route.ts", "utf8");

describe("the AI travel assistant names whichever brand actually asked", () => {
  it("builds the prompt from the request's own host, not a fixed constant", () => {
    assert.match(ROUTE, /function systemPromptFor\(brand: SiteBrand\): string/);
    // Resolved once, per request, from the request's own headers — reused for
    // the prompt, the off-topic reply and the user message, not re-derived or
    // hardcoded anywhere.
    assert.match(ROUTE, /const brand = brandFromRequestHeaders\(request\.headers\)/);
    assert.match(ROUTE, /systemPromptFor\(brand\)/);
    // No brand name is hardcoded outside the shared table.
    assert.doesNotMatch(ROUTE, /You are the White Glove Kosher Travel AI travel assistant/);
    assert.doesNotMatch(ROUTE, /an AI assistant for White Glove Kosher Travel/);
  });

  it("uses BRAND_NAME for both the identity line and the self-description", () => {
    assert.match(ROUTE, /You are the \$\{name\} AI travel assistant/);
    assert.match(ROUTE, /an AI assistant for \$\{name\}/);
  });

  it("kosher food is not a subject on the itineraries brand at all — the kosher brand still points at /kosher", () => {
    // White Glove Itineraries is not a kosher or Jewish travel product (see
    // app/api/itinerary/ai/route.ts's own file note): its branch of the
    // prompt never raises kosher food, so there is nothing on that brand for
    // a "kosher food directory" pointer to stand in for.
    assert.match(ROUTE, /do not ask about or mention kashrus, kosher food, Shabbos, minyanim, mikvaos, or kevarim/);
    assert.match(ROUTE, /point the traveler to White Glove's kosher food finder at \/kosher/);
  });

  it("every provider call is handed the per-request prompt, not a stale module-level one", () => {
    assert.doesNotMatch(ROUTE, /text: SYSTEM|system: SYSTEM|content: SYSTEM/, "no reference to the old fixed SYSTEM constant remains");
    assert.match(ROUTE, /systemInstruction: \{ parts: \[\{ text: system \}\] \}/);
    assert.match(ROUTE, /max_tokens: 1200, system, messages:/);
    assert.match(ROUTE, /\{ role: "system", content: system \}/);
  });
});
