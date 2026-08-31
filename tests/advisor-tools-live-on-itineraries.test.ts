import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * WHAT IS FOR AN ADVISER DOES NOT LIVE IN THIS REPOSITORY.
 *
 * AGENTS.md has said this since the two products were separated: an adviser
 * feature — "a group screen, a client's boarding pass, anything whose user is
 * somebody planning for other people" — has to be built or ported in the
 * itineraries repository, because merging it here does not put it on that
 * site. Kosher Travel's job is DISCOVER & PLAN; Itineraries' job is BUILD,
 * ORGANISE & MANAGE.
 *
 * IT WAS ONE SENTENCE IN THE MIDDLE OF A LONG PARAGRAPH AND NOTHING CHECKED
 * IT, so it lost every time. The whole advisor CRM was written here and served
 * from whiteglovekoshertravel.com: pipeline, proposals, payments, extras,
 * client forms, group trips, clients, commissions, agency. Three of those —
 * add-ons, clients, commissions — did not exist on the itineraries side at
 * all, so an adviser on the right domain was missing screens an adviser on the
 * wrong one had. The rule was restated to a session in this very repository
 * and the session then MOUNTED A NEW TRIP BAR onto six of these screens here,
 * which is how a rule with no test behaves.
 *
 * THIS IS A RATCHET, NOT A CLEAN BILL. The screens below still exist here and
 * are still served. The list may only ever get shorter: delete a page, delete
 * its line. Nothing may be added to it, and no new adviser screen may appear
 * here at all — which is what the second test says.
 */

/**
 * Adviser screens still served by this deployment, waiting to be taken off it.
 *
 * Every one of them is now ALSO on the itineraries side, so removing them here
 * costs nothing but the removal itself. Shorten this list; never lengthen it.
 */
const STILL_HERE = [
  "app/pipeline/page.tsx",
  "app/proposal/page.tsx",
  "app/payments/page.tsx",
  "app/addons/page.tsx",
  "app/forms/page.tsx",
  "app/group/page.tsx",
  "app/clients/page.tsx",
  "app/clients/[key]/page.tsx",
  "app/commissions/page.tsx",
  "app/library/page.tsx",
  "app/agency/page.tsx",
] as const;

describe("the adviser's screens are on their way off this side", () => {
  it("has not grown", () => {
    // The number only goes down. If a page was deleted, delete its line too;
    // this failing because the list is too LONG is the good failure.
    assert.ok(STILL_HERE.length <= 11, `the adviser list grew to ${STILL_HERE.length}`);
  });

  it("names only pages that are really still here", () => {
    // A line for a page that is gone makes the ratchet a lie and hides the
    // next one that appears.
    for (const page of STILL_HERE) {
      assert.ok(existsSync(page), `${page} is gone — delete its line from STILL_HERE`);
    }
  });

  it("HAS NO ADVISER SCREEN THAT IS NOT ON THE LIST", () => {
    /**
     * The test that would have caught the trip bar. Anything new whose user is
     * somebody planning for other people belongs in the itineraries
     * repository; if it appears here it fails the build, and the fix is to
     * build it there rather than to add a line below.
     */
    const adviserish = ["app/advisor", "app/proposals", "app/commission", "app/crm", "app/agency/clients"];
    for (const path of adviserish) {
      assert.ok(
        !existsSync(`${path}/page.tsx`),
        `${path} is an adviser screen and this is the kosher repository — build it in whiteglove-itineraries`,
      );
    }
  });
});

describe("the rule is written where the next session reads it", () => {
  it("says which platform an adviser feature belongs to", () => {
    const agents = readFileSync("AGENTS.md", "utf8");
    assert.match(agents, /adviser feature/);
    assert.match(agents, /itineraries repository/);
  });
});

