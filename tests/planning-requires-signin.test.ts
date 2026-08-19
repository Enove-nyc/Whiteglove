import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isPrivatePath } from "@/lib/site-map";

/**
 * Building and saving a trip is signed-in only, at the owner's word: the
 * day-by-day builder (/itinerary) and a saved route (/my-route). A signed-out
 * visitor meets the sign-in door, with the way back carried in ?next= so they
 * land where they were headed.
 *
 * /plan is NOT here: it is the visitor planning their own trip, a public
 * self-service front door, so it stays open and crawlable. The done-for-you
 * planning — us planning a trip for someone — is the thing that is gone from
 * the site, and it was never this page.
 *
 * Asserted on the page source rather than by rendering, the same way the
 * assistant route's rules are — a page that quietly drops the guard tomorrow
 * fails here today.
 */
const GATED: Record<string, string> = {
  "/itinerary": "app/itinerary/page.tsx",
  "/my-route": "app/my-route/page.tsx",
};

describe("building and saving a trip is signed-in only", () => {
  for (const [route, file] of Object.entries(GATED)) {
    it(`${route} sends a signed-out visitor to sign in`, () => {
      const src = readFileSync(file, "utf8");
      assert.match(src, /requireSignedIn\(/, `${route} no longer guards sign-in`);
    });
  }

  it("keeps them out of search and the sitemap", () => {
    // A page a crawler is redirected away from must not be offered to it.
    for (const route of Object.keys(GATED)) {
      assert.equal(isPrivatePath(route), true, route);
    }
  });

  it("leaves /plan public — it is self-service planning, not done-for-you", () => {
    assert.equal(isPrivatePath("/plan"), false);
    assert.doesNotMatch(readFileSync("app/plan/page.tsx", "utf8"), /requireSignedIn\(/);
  });
});
