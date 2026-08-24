import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * The four findings from Cursor's agentic security review of PR #338, pinned
 * so they cannot come back. Each one was real and each one is fixed on main;
 * these fence the fix rather than the symptom.
 */

describe("a staff grant is only as live as the owner's roster says", () => {
  const STORE = readFileSync("lib/account-store.ts", "utf8");
  const fn = STORE.slice(
    STORE.indexOf("export async function resolveBusinessOwner"),
    STORE.indexOf("export async function isOwnBusiness"),
  );

  it("checks the OWNER's roster, not just the member's own teamOwnerEmail", () => {
    assert.match(fn, /getAccountRecord\(owner\)/);
    assert.match(fn, /readTeam\(ownerRecord\?\.team\)/);
  });

  it("requires an ACTIVE roster entry — a pending invite is not a grant", () => {
    assert.match(fn, /m\.status === "active"/);
  });

  it("fails closed: a login the owner no longer lists resolves to itself", () => {
    assert.match(fn, /listedActive \? owner : normalized/);
  });
});

describe("only the owner sets up where the money lands", () => {
  const ROUTE = readFileSync("app/api/account/payments/route.ts", "utf8");

  it("both Stripe Connect actions check the signed-in person, not the resolved business", () => {
    const connect = ROUTE.slice(ROUTE.indexOf('case "connect"'), ROUTE.indexOf('case "refresh-status"'));
    const refresh = ROUTE.slice(ROUTE.indexOf('case "refresh-status"'), ROUTE.indexOf('case "save-balance"'));
    assert.match(connect, /isBusinessOwner\(\)/);
    assert.match(refresh, /isBusinessOwner\(\)/);
  });

  it("the owner check runs before anything Stripe-side happens", () => {
    const connect = ROUTE.slice(ROUTE.indexOf('case "connect"'), ROUTE.indexOf('case "refresh-status"'));
    assert.ok(connect.indexOf("isBusinessOwner()") < connect.indexOf("createConnectAccount"));
  });

  it("a trip's own balance is still staff work — save-balance is NOT owner-gated", () => {
    const save = ROUTE.slice(ROUTE.indexOf('case "save-balance"'));
    assert.doesNotMatch(save, /isBusinessOwner\(\)/);
  });
});

describe("mail a share-token holder can trigger never carries their own host", () => {
  for (const path of ["app/api/addons/[shareId]/route.ts", "app/api/proposal/[shareId]/route.ts"]) {
    it(`${path} builds its link from siteOrigin() first`, () => {
      const src = readFileSync(path, "utf8");
      assert.match(src, /siteOrigin\(\)\?\.origin \|\| request\.nextUrl\.origin/);
    });
  }
});

describe("paid AI calls are rate limited, the same as Smart Import's", () => {
  const routes: Array<[string, string]> = [
    ["app/api/account/packing/route.ts", "packing-generate"],
    ["app/api/account/optimize/route.ts", "optimize-generate"],
    ["app/api/account/translate/route.ts", "translate-generate"],
  ];

  for (const [path, key] of routes) {
    it(`${path} limits its generate call`, () => {
      const src = readFileSync(path, "utf8");
      assert.match(src, new RegExp(`rateLimit\\(\`${key}:\\$\\{email\\}\`, AI_LIMIT\\)`));
      assert.match(src, /const AI_LIMIT = \{ limit: 20, windowSeconds: 3600 \}/);
    });
  }

  it("the free actions are not limited — only the ones that spend the AI quota", () => {
    const packing = readFileSync("app/api/account/packing/route.ts", "utf8");
    const toggle = packing.slice(packing.indexOf('if (body.action === "toggle")'), packing.indexOf('if (body.action === "generate")'));
    assert.doesNotMatch(toggle, /rateLimit\(/);
  });
});
