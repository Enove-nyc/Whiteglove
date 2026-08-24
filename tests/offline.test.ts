import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Offline access for a traveler mid-trip — see public/sw.js and
 * app/offline/page.tsx.
 */

const SW = readFileSync("public/sw.js", "utf8");
const APP = readFileSync("components/companion/CompanionApp.tsx", "utf8");

describe("a page miss while offline lands on /offline, not the marketing homepage", () => {
  it("the navigation fallback goes to /offline", () => {
    assert.match(SW, /caches\.match\(req\)\.then\(\(r\) => r \|\| \(req\.mode === "navigate" \? caches\.match\("\/offline"\) : undefined\)\)/);
  });

  it("/offline is precached, so it's available with no network at all", () => {
    const precache = SW.slice(SW.indexOf("const PRECACHE"), SW.indexOf("const PRECACHE") + 200);
    assert.match(precache, /"\/offline"/);
  });

  it("still leaves API, admin and access routes alone — no change to what this cache never touches", () => {
    assert.match(SW, /url\.pathname\.startsWith\("\/api\/"\) \|\| url\.pathname\.startsWith\("\/admin"\) \|\| url\.pathname\.startsWith\("\/access"\)/);
  });
});

describe("the companion app tells a traveler when their own device has no connection", () => {
  it("listens for the browser's own online/offline events rather than polling", () => {
    const block = APP.slice(APP.indexOf("const [isOffline, setIsOffline]"), APP.indexOf("const advisor = trip.advisorName"));
    assert.match(block, /addEventListener\("offline"/);
    assert.match(block, /addEventListener\("online"/);
    assert.match(block, /removeEventListener\("offline"/);
    assert.match(block, /removeEventListener\("online"/);
  });

  it("reads navigator.onLine for its starting value, guarded for the server where navigator doesn't exist", () => {
    const block = APP.slice(APP.indexOf("const [isOffline, setIsOffline]"), APP.indexOf("const advisor = trip.advisorName"));
    assert.match(block, /useState\(\(\) => typeof navigator !== "undefined" && !navigator\.onLine\)/);
  });

  it("the banner only claims the device has no connection, never that the trip data is stale", () => {
    const marker = APP.indexOf("No connection — showing what was last loaded");
    assert.ok(marker > -1);
  });

  it("the offline banner is gated on isOffline, not always rendered", () => {
    const idx = APP.indexOf("No connection — showing what was last loaded");
    const block = APP.slice(Math.max(0, idx - 400), idx);
    assert.match(block, /\{isOffline && \(/);
  });
});
