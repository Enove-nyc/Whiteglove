import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { emptyTranslation, isStale } from "@/data/itinerary-translation";

describe("a fresh translation", () => {
  it("carries the language it was made for and nothing else", () => {
    const t = emptyTranslation("French");
    assert.equal(t.language, "French");
    assert.deepEqual(t.activities, {});
    assert.deepEqual(t.lodging, {});
    assert.deepEqual(t.flights, {});
  });
});

describe("whether a translation has gone stale", () => {
  it("is stale once the itinerary's signature no longer matches", () => {
    const t = { ...emptyTranslation("French"), forSignature: "old" };
    assert.equal(isStale(t, "new"), true);
  });

  it("is fresh when the signature still matches", () => {
    const t = { ...emptyTranslation("French"), forSignature: "same" };
    assert.equal(isStale(t, "same"), false);
  });
});

describe("translation is a personal-travel feature, not Business-gated", () => {
  const ROUTE = readFileSync("app/api/account/translate/route.ts", "utf8");

  it("has no mayServeCompanionClients gate", () => {
    assert.doesNotMatch(ROUTE, /mayServeCompanionClients/);
  });

  it("checks same-origin before any write", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
  });

  it("resolves a staff login through resolveBusinessOwner", () => {
    assert.match(ROUTE, /resolveBusinessOwner/);
  });
});

describe("what gets translated, and what never does", () => {
  const STORE = readFileSync("lib/account-store.ts", "utf8");

  it("translates an activity's own name and notes", () => {
    const fn = STORE.slice(STORE.indexOf("function translatableFields"), STORE.indexOf("function translatableFields") + 900);
    assert.match(fn, /activity:\$\{a\.id\}:name/);
    assert.match(fn, /activity:\$\{a\.id\}:notes/);
  });

  it("never translates a lodging stay's own name — only its notes", () => {
    const fn = STORE.slice(STORE.indexOf("function translatableFields"), STORE.indexOf("function translatableFields") + 900);
    assert.doesNotMatch(fn, /lodging:\$\{l\.id\}:name/);
    assert.match(fn, /lodging:\$\{l\.id\}:notes/);
  });
});
