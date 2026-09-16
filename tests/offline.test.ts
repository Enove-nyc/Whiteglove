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
    // The navigation check moved into a local (`isNav`) when navigations stopped
    // using `cache: "reload"` — the fallback itself is unchanged: a page miss
    // with no network lands on /offline, never on the cached homepage.
    assert.match(SW, /const isNav = req\.mode === "navigate";/);
    assert.match(SW, /caches\.match\(req\)\.then\(\(r\) => r \|\| \(isNav \? caches\.match\("\/offline"\) : undefined\)\)/);
  });

  it("/offline is precached, so it's available with no network at all", () => {
    const precache = SW.slice(SW.indexOf("const PRECACHE"), SW.indexOf("const PRECACHE") + 200);
    assert.match(precache, /"\/offline"/);
  });

  it("still leaves API, admin and access routes alone — no change to what this cache never touches", () => {
    assert.match(SW, /url\.pathname\.startsWith\("\/api\/"\) \|\| url\.pathname\.startsWith\("\/admin"\) \|\| url\.pathname\.startsWith\("\/access"\)/);
  });
});

/**
 * A REDIRECT REACHES THE BROWSER AS A REDIRECT.
 *
 * A service worker may not answer a navigation with a response that was itself
 * arrived at through a redirect — a navigation's redirect mode is "manual", and
 * the browser discards such an answer as a network error. fetch() follows
 * redirects by default, so every redirecting page on the site came back here as
 * the final page, flagged `redirected`, and died on the doorstep.
 *
 * The owner found it: the admin hostname's root always redirects to /login, so
 * once this worker had taken control of that origin the dashboard could not be
 * opened at all. Nothing looked wrong from outside — the server answered 307
 * and then 200, twice per attempt, and the phone showed a connection error.
 * Reproduced against this exact file, and it took the itineraries home page
 * with it: signed in there, "/" redirects to /app or /advisor.
 */
describe("a navigation that redirects is handed back to the browser", () => {
  it("navigations ask for the redirect unfollowed, so the answer is never a redirected response", () => {
    assert.match(
      SW,
      /const fresh = isNav\s*\?\s*fetch\(req\.url, \{ credentials: "same-origin", redirect: "manual" \}\)\s*:\s*fetch\(new Request\(req, \{ cache: "reload" \}\)\);/,
    );
  });

  it("everything that is not a navigation still follows redirects as before", () => {
    // Only the navigation arm changed. Scripts, styles and /_next/static keep
    // `cache: "reload"` and the browser's ordinary redirect handling.
    const arm = SW.slice(SW.indexOf("const fresh = isNav"), SW.indexOf("return fresh"));
    assert.ok(!/redirect: "manual"[\s\S]*new Request\(req, \{ cache: "reload", redirect/.test(arm));
    assert.match(arm, /fetch\(new Request\(req, \{ cache: "reload" \}\)\)/);
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
