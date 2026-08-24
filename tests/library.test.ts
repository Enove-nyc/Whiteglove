import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { emptyLibraryItem, emptyLibraryPack, itemsInPack, libraryItemToProposalComponent, type LibraryItem } from "@/data/library";

describe("a fresh library item and pack", () => {
  it("starts with the kind it was given and nothing else", () => {
    const item = emptyLibraryItem("hotel");
    assert.equal(item.kind, "hotel");
    assert.equal(item.name, "");
  });

  it("a fresh pack starts empty, carrying only the name it was given", () => {
    const pack = emptyLibraryPack("Rome Family Trip");
    assert.equal(pack.name, "Rome Family Trip");
    assert.deepEqual(pack.itemIds, []);
  });
});

describe("turning a saved item into a proposal component", () => {
  const item: LibraryItem = {
    id: "lib-1",
    kind: "hotel",
    name: "Hotel Rossi",
    description: "Steps from the Ghetto",
    address: "Via Roma 1",
    phone: "+39 06 555 0100",
    price: 220,
    savedAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("carries every field a proposal component actually uses, under a fresh id", () => {
    const component = libraryItemToProposalComponent(item, "fresh-id");
    assert.equal(component.id, "fresh-id");
    assert.equal(component.kind, "hotel");
    assert.equal(component.name, "Hotel Rossi");
    assert.equal(component.address, "Via Roma 1");
    assert.equal(component.price, 220);
  });

  it("the same item dropped twice gets two independent ids, not one shared reference", () => {
    const a = libraryItemToProposalComponent(item, "id-a");
    const b = libraryItemToProposalComponent(item, "id-b");
    assert.notEqual(a.id, b.id);
  });
});

describe("resolving a pack's items", () => {
  const items: LibraryItem[] = [
    { id: "a", kind: "hotel", name: "Hotel A", savedAt: "t", updatedAt: "t" },
    { id: "b", kind: "activity", name: "Tour B", savedAt: "t", updatedAt: "t" },
  ];

  it("returns the items in the order the pack lists them", () => {
    const pack = { ...emptyLibraryPack("Pack"), id: "p1", itemIds: ["b", "a"] };
    const resolved = itemsInPack(pack, items);
    assert.deepEqual(resolved.map((i) => i.id), ["b", "a"]);
  });

  it("quietly drops a reference to an item that no longer exists, rather than leaving a hole", () => {
    const pack = { ...emptyLibraryPack("Pack"), id: "p1", itemIds: ["a", "deleted-item", "b"] };
    const resolved = itemsInPack(pack, items);
    assert.equal(resolved.length, 2);
    assert.ok(!resolved.some((i) => i.id === "deleted-item"));
  });
});

describe("the library is a planner's own — never reachable by a client", () => {
  const ROUTE = readFileSync("app/api/account/library/route.ts", "utf8");

  it("is Business-gated, the same as a proposal", () => {
    assert.match(ROUTE, /mayServeCompanionClients/);
  });

  it("checks same-origin before any write", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
    assert.ok(post.indexOf("sameOrigin") < post.indexOf("switch"));
  });

  it("has no public, unauthenticated route the way a proposal or a shared itinerary does", () => {
    assert.doesNotMatch(ROUTE, /getShareOwnerEmail|getSharedProposal/);
  });
});
