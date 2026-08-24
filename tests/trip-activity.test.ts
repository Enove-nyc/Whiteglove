import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { MAX_ACTIVITY, recentActivity, withActivity, type ActivityEntry } from "@/data/trip-activity";

function entry(over: Partial<ActivityEntry> = {}): ActivityEntry {
  return { id: "e1", kind: "payment_received", message: "Payment received.", at: "2026-01-01T00:00:00Z", ...over };
}

describe("appending to a trip's activity feed", () => {
  it("adds the entry to the end", () => {
    const out = withActivity([entry({ id: "a" })], entry({ id: "b" }));
    assert.deepEqual(out.map((e) => e.id), ["a", "b"]);
  });

  it("drops the oldest once past the cap, keeping the most recent", () => {
    const full = Array.from({ length: MAX_ACTIVITY }, (_, i) => entry({ id: `e${i}` }));
    const out = withActivity(full, entry({ id: "newest" }));
    assert.equal(out.length, MAX_ACTIVITY);
    assert.equal(out[out.length - 1].id, "newest");
    assert.ok(!out.some((e) => e.id === "e0")); // the very oldest fell off
  });
});

describe("reading a feed back", () => {
  it("comes back most recent first, without touching storage order", () => {
    const stored = [entry({ id: "first" }), entry({ id: "second" })];
    assert.deepEqual(recentActivity(stored).map((e) => e.id), ["second", "first"]);
    assert.deepEqual(stored.map((e) => e.id), ["first", "second"]); // unchanged
  });
});

describe("a trip's activity feed is read-only and Business-only", () => {
  const ROUTE = readFileSync("app/api/account/activity/route.ts", "utf8");

  it("has no POST or PATCH handler — nothing here is written by hand", () => {
    assert.doesNotMatch(ROUTE, /export async function POST|export async function PATCH/);
  });

  it("is gated on mayServeCompanionClients", () => {
    assert.match(ROUTE, /mayServeCompanionClients/);
  });

  it("resolves the signed-in identity through resolveBusinessOwner", () => {
    assert.match(ROUTE, /resolveBusinessOwner/);
  });
});

describe("activity is logged where the action itself happens, not duplicated elsewhere", () => {
  const STORE = readFileSync("lib/account-store.ts", "utf8");

  it("logs a payment the moment it succeeds", () => {
    assert.match(STORE, /record\.status === "succeeded"[\s\S]{0,120}payment_received/);
  });

  it("logs a proposal being approved or having changes requested", () => {
    assert.match(STORE, /proposal_approved/);
    assert.match(STORE, /proposal_changes_requested/);
  });

  it("logs an add-on being accepted or declined", () => {
    assert.match(STORE, /addon_accepted/);
    assert.match(STORE, /addon_declined/);
  });

  it("logs a pipeline stage change", () => {
    assert.match(STORE, /stage_changed/);
  });
});
