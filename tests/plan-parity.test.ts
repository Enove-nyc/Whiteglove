import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ALWAYS_FREE, PLAN_FEATURES, planParity, planParitySentence } from "@/lib/account-limits";

/**
 * The pricing page and the account page cannot promise what the table takes
 * back, because neither of them writes the sentence any more.
 *
 * BOTH SAID IT. "Everything on the site — the planner, the map, the guides,
 * sharing a trip with anybody you like — is the same on every plan", above the
 * three cards; and "Everything else on the site is the same … and sharing a
 * trip with anybody you like" in describeLimits, on the account page and in
 * the admin. Four rows below the first one, the feature table says handing a
 * client their own app is an advisor plan.
 *
 * Both were describing something real — a share link, which every plan has,
 * and companionClients, which One Trip does not — under one word. A buyer read
 * a promise and then found it withdrawn, in the paragraph they were deciding
 * on. Two hand-written sentences about a table cannot be kept true by hand.
 */

describe("what is the same on every plan is worked out, not asserted", () => {
  it("puts a feature that differs on the differs side", () => {
    // The one that started this. One Trip cannot hand a client an app.
    assert.equal(PLAN_FEATURES.one_trip.companionClients, false);
    assert.equal(PLAN_FEATURES.starter.companionClients, true);
    assert.ok(planParity().differs.some((line) => /handing a client/i.test(line)));
    assert.ok(!planParity().same.some((line) => /handing a client/i.test(line)));
  });

  it("puts a feature every paid plan has on the same side", () => {
    for (const plan of ["one_trip", "starter", "pro"] as const) {
      assert.equal(PLAN_FEATURES[plan].companionApp, true);
    }
    assert.ok(planParity().same.some((line) => /app for your own trip/i.test(line)));
  });

  it("accounts for every entitlement, on one side or the other", () => {
    const { same, differs } = planParity();
    assert.equal(same.length + differs.length, Object.keys(PLAN_FEATURES.pro).length);
  });

  it("names the floor rather than computing it", () => {
    // The planner, the map and the guides are not entitlements — nothing gates
    // them on any plan, including free — so they are stated as the floor.
    assert.match(ALWAYS_FREE, /planner/);
    assert.doesNotMatch(JSON.stringify(planParity()), /planner|map|guides/i);
  });

  it("says what changes as well as what does not", () => {
    // A promise with no limit beside it is the one a buyer later feels tricked
    // by. This is the whole defect, in one assertion.
    const sentence = planParitySentence();
    assert.match(sentence, /same on every plan/);
    assert.match(sentence, /What changes is/);
    assert.match(sentence, /handing a client their own app/);
  });
});

describe("neither surface writes that sentence itself any more", () => {
  const PRICING = readFileSync("app/pricing/page.tsx", "utf8");
  const LIMITS = readFileSync("lib/account-limits.ts", "utf8");

  it("the pricing page renders the computed one", () => {
    assert.match(PRICING, /\{planParitySentence\(\)\}/);
  });

  it("neither claims sharing is the same on every plan", () => {
    // Comments out — this file and those two discuss the wording they removed.
    const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const [name, source] of [["pricing", PRICING], ["account-limits", LIMITS]] as const) {
      assert.doesNotMatch(strip(source), /sharing a trip with anybody you like/, `${name} still promises it`);
    }
  });
});
