import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * An address that goes nowhere is worse than no address: somebody forwards a
 * booking to it and learns the feature is broken rather than unwired. These
 * pin the gate, and the two places the address is offered from.
 */

const store = readFileSync(new URL("../lib/inbound-import-store.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/account/inbound/route.ts", import.meta.url), "utf8");
const panel = readFileSync(new URL("../components/ForwardingAddress.tsx", import.meta.url), "utf8");
const account = readFileSync(new URL("../app/account/page.tsx", import.meta.url), "utf8");

test("readiness needs the queue AND the secret the inbound route verifies with", () => {
  const fn = store.slice(store.indexOf("export function inboundMailReady"));
  assert.match(fn, /inboundStoreAvailable\(\)/);
  assert.match(fn, /INBOUND_EMAIL_SECRET/);
});

test("the account route hands back no address until mail can arrive", () => {
  assert.match(route, /inboundMailReady/);
  const guard = route.slice(route.indexOf("if (!inboundMailReady())"));
  // Still hands back anything already queued — a message that got in before
  // the provider was reconfigured is still somebody's booking.
  assert.match(guard.slice(0, 400), /address: ""/);
  assert.match(guard.slice(0, 400), /pendingToShow/);
});

test("the account panel draws nothing without an address", () => {
  assert.match(panel, /if \(!address\) return null;/);
});

test("the panel does not review anything itself — the planner does", () => {
  assert.match(panel, /href="\/itinerary"/);
  for (const forbidden of ["Add to trip", "/api/account/smart-import"]) {
    assert.ok(!panel.includes(forbidden), `ForwardingAddress should not contain ${forbidden}`);
  }
});

test("it is reachable from the account page", () => {
  assert.match(account, /import ForwardingAddress from "@\/components\/ForwardingAddress";/);
  assert.match(account, /<ForwardingAddress \/>/);
});

test("trip updates sit above the trips on the account page", () => {
  assert.ok(account.indexOf("<TripUpdates") < account.indexOf("<AccountRoutePanel"), "updates must come before the trips list");
});
