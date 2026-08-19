import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isPrivatePath } from "@/lib/site-map";

/**
 * The planning tools are signed-in only, at the owner's word: the planner
 * (/plan), the day-by-day builder (/itinerary) and a saved route (/my-route).
 * A signed-out visitor meets the sign-in door, with the way back carried in
 * ?next= so they land where they were headed.
 *
 * Asserted on the page source rather than by rendering, the same way the
 * assistant route's rules are — a page that quietly drops the guard tomorrow
 * fails here today.
 */
const GATED: Record<string, string> = {
  "/plan": "app/plan/page.tsx",
  "/itinerary": "app/itinerary/page.tsx",
  "/my-route": "app/my-route/page.tsx",
};

describe("the planning pages are signed-in only", () => {
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
});
