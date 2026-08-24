import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { acceptedAddonsCents, emptyAddonItem, pendingAddons, type AddonItem } from "@/data/trip-addons";

function item(over: Partial<AddonItem> = {}): AddonItem {
  return {
    id: "i1",
    name: "Travel insurance",
    priceCents: 10000,
    status: "offered",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("a fresh add-on", () => {
  it("starts offered, with no price set", () => {
    const i = emptyAddonItem();
    assert.equal(i.status, "offered");
    assert.equal(i.priceCents, 0);
  });
});

describe("what a client has accepted", () => {
  it("counts only accepted add-ons toward the total", () => {
    const items = [item({ id: "a", status: "accepted", priceCents: 100 }), item({ id: "b", status: "declined", priceCents: 200 }), item({ id: "c", status: "offered", priceCents: 300 })];
    assert.equal(acceptedAddonsCents(items), 100);
  });

  it("is zero when nothing has been accepted yet", () => {
    assert.equal(acceptedAddonsCents([item({ status: "offered" })]), 0);
  });
});

describe("what's still waiting on an answer", () => {
  it("is only the ones still offered", () => {
    const items = [item({ id: "a", status: "offered" }), item({ id: "b", status: "accepted" }), item({ id: "c", status: "declined" })];
    assert.deepEqual(pendingAddons(items).map((i) => i.id), ["a"]);
  });
});

describe("trip add-ons are Business-only, the same door as a proposal or a payment", () => {
  const PLANNER_ROUTE = readFileSync("app/api/account/addons/route.ts", "utf8");
  const PUBLIC_ROUTE = readFileSync("app/api/addons/[shareId]/route.ts", "utf8");

  it("the planner's route is gated on mayServeCompanionClients", () => {
    assert.match(PLANNER_ROUTE, /mayServeCompanionClients/);
  });

  it("the planner's route resolves the signed-in identity through resolveBusinessOwner", () => {
    assert.match(PLANNER_ROUTE, /resolveBusinessOwner/);
  });

  it("the planner's route checks same-origin before any write", () => {
    const post = PLANNER_ROUTE.slice(PLANNER_ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
    assert.ok(post.indexOf("sameOrigin") < post.indexOf("saveAddonItem"));
  });

  it("the public route never imports the planner-only store functions a client has no business calling", () => {
    assert.doesNotMatch(PUBLIC_ROUTE, /saveAddonItem|ensureAddonsShare|deleteAddonItem/);
  });

  it("the public route checks same-origin before answering", () => {
    const post = PUBLIC_ROUTE.slice(PUBLIC_ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
  });

  it("emails the planner after the answer is saved, never blocking the client's response on it", () => {
    const savedAt = PUBLIC_ROUTE.indexOf("applyAddonClientAction(shareId, body.id, body.accepted)");
    const notifyAt = PUBLIC_ROUTE.indexOf("void notifyOwner(");
    assert.ok(savedAt > 0 && notifyAt > savedAt);
  });
});
