import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Free Gemini for everybody; the paid AI services only for the owner in his
 * admin (owner, 20 November 2026).
 */
describe("who may reach the paid AI services", () => {
  const HELPER = readFileSync("lib/ai-keys.ts", "utf8");
  it("hands out the paid keys only behind the admin token", () => {
    assert.match(HELPER, /isValidAccessToken\("admin", jar\.get\("white_glove_admin"\)\?\.value\)/);
    assert.match(HELPER, /if \(!paidAllowed\) return \{ gemini, paidAllowed \};/);
  });
  it("is the only way any public AI feature reads a paid key", () => {
    for (const file of ["lib/packing-ai.ts", "lib/smart-import.ts", "lib/itinerary-translation-ai.ts", "lib/itinerary-optimization-ai.ts", "app/api/itinerary/ai/route.ts"]) {
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(src, /process\.env\.(ANTHROPIC|OPENAI)_API_KEY/, file);
      assert.match(src, /await aiKeys\(\)/, file);
    }
  });
});

describe("the travel assistant is public, inside Gemini's free allowance", () => {
  it("is a public page and in the menu", async () => {
    const { isPublicPage } = await import("@/lib/public-access");
    assert.ok(isPublicPage("/assistant"));
    assert.match(readFileSync("lib/navigation.ts", "utf8"), /href: "\/assistant"/);
  });
  it("caps the public per day, site-wide and per visitor, and not the owner", () => {
    const route = readFileSync("app/api/itinerary/ai/route.ts", "utf8");
    assert.match(route, /"assistant:all:day", limit: 200/);
    assert.match(route, /ASSISTANT_DAILY = \{ limit: 30/);
    assert.match(route, /ownerInAdmin \? \[\] : ASSISTANT_CEILING/);
  });
});
