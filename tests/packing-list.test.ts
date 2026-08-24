import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { byCategory, emptyPackingList, isStale, toggleItem, tripSignature, type PackingItem, type PackingList } from "@/data/packing-list";

function item(over: Partial<PackingItem> = {}): PackingItem {
  return { id: "i1", label: "Passport", category: "Documents", checked: false, ...over };
}

describe("a trip's signature", () => {
  it("is the same regardless of destination order", () => {
    const a = tripSignature({ destinations: ["Rome", "Venice"], startDate: "2026-06-01", endDate: "2026-06-10", activityCount: 3 });
    const b = tripSignature({ destinations: ["Venice", "Rome"], startDate: "2026-06-01", endDate: "2026-06-10", activityCount: 3 });
    assert.equal(a, b);
  });

  it("changes when the dates change", () => {
    const a = tripSignature({ destinations: ["Rome"], startDate: "2026-06-01", endDate: "2026-06-10", activityCount: 3 });
    const b = tripSignature({ destinations: ["Rome"], startDate: "2026-07-01", endDate: "2026-07-10", activityCount: 3 });
    assert.notEqual(a, b);
  });
});

describe("whether a list has gone stale", () => {
  it("is stale once the trip's signature no longer matches", () => {
    const list: PackingList = { ...emptyPackingList(), forSignature: "old" };
    assert.equal(isStale(list, "new"), true);
  });

  it("is fresh when the signature still matches", () => {
    const list: PackingList = { ...emptyPackingList(), forSignature: "same" };
    assert.equal(isStale(list, "same"), false);
  });
});

describe("checking an item off", () => {
  it("toggles only the one item", () => {
    const list: PackingList = { ...emptyPackingList(), items: [item({ id: "a" }), item({ id: "b" })] };
    const out = toggleItem(list, "a", true);
    assert.equal(out.items.find((i) => i.id === "a")?.checked, true);
    assert.equal(out.items.find((i) => i.id === "b")?.checked, false);
  });
});

describe("grouping by category", () => {
  it("keeps items together in the order each category first appeared", () => {
    const items = [item({ id: "a", category: "Documents" }), item({ id: "b", category: "Clothing" }), item({ id: "c", category: "Documents" })];
    const groups = byCategory(items);
    assert.deepEqual(groups.map((g) => g.category), ["Documents", "Clothing"]);
    assert.deepEqual(groups[0].items.map((i) => i.id), ["a", "c"]);
  });
});

describe("the packing list is a personal-travel feature, not Business-gated", () => {
  const ROUTE = readFileSync("app/api/account/packing/route.ts", "utf8");

  it("has no mayServeCompanionClients gate — a personal trip gets a packing list too", () => {
    assert.doesNotMatch(ROUTE, /mayServeCompanionClients/);
  });

  it("checks same-origin before any write", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
  });

  it("resolves a staff login through resolveBusinessOwner, the same as every other per-trip route", () => {
    assert.match(ROUTE, /resolveBusinessOwner/);
  });
});
