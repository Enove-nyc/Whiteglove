import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MAX_RECENT, isStale, recentToShow, usableHref, withVisit, type RecentPlace } from "@/data/recent-places";

const NOW = "2026-09-10T12:00:00.000Z";
const place = (over: Partial<RecentPlace> = {}): RecentPlace => ({
  href: "/destinations/krakow",
  name: "Kraków",
  where: "Poland",
  at: "2026-09-09T12:00:00.000Z",
  ...over,
});

describe("finding your way back", () => {
  it("puts the most recent first", () => {
    const out = withVisit([place({ href: "/destinations/rome", name: "Rome" })], place(), NOW);
    assert.deepEqual(out.map((p) => p.name), ["Kraków", "Rome"]);
  });

  it("IS PLACES, NOT VISITS — opening the same page again moves it, never doubles it", () => {
    // The difference between finding your way back and being counted.
    const once = withVisit([], place(), NOW);
    const twice = withVisit(once, place({ at: NOW }), NOW);
    assert.equal(twice.length, 1);
    assert.equal(twice[0].at, NOW);
  });

  it("is short on purpose", () => {
    let list: RecentPlace[] = [];
    for (let i = 0; i < 20; i += 1) list = withVisit(list, place({ href: `/destinations/p${i}`, name: `P${i}` }), NOW);
    assert.equal(list.length, MAX_RECENT);
  });

  it("forgets a fortnight later, so it never becomes a record of anybody's reading", () => {
    assert.equal(isStale(place({ at: "2026-08-01T00:00:00.000Z" }), NOW), true);
    assert.equal(isStale(place(), NOW), false);
    assert.deepEqual(recentToShow([place({ at: "2026-08-01T00:00:00.000Z" })], NOW), []);
  });

  it("drops a stale entry as soon as anything else is opened", () => {
    const out = withVisit([place({ href: "/destinations/old", at: "2026-08-01T00:00:00.000Z" })], place(), NOW);
    assert.deepEqual(out.map((p) => p.href), ["/destinations/krakow"]);
  });
});

describe("only a path on this site is ever kept", () => {
  it("refuses anything that leaves the site", () => {
    // Otherwise this list would be a way to put a link to somewhere else in
    // front of the account holder.
    for (const bad of ["https://example.com", "//example.com", "javascript:alert(1)", "", "   "]) {
      assert.equal(usableHref(bad), false, bad);
    }
    assert.equal(usableHref("/destinations/krakow"), true);
  });

  it("a refused href is not stored", () => {
    assert.deepEqual(withVisit([], place({ href: "https://example.com" }), NOW), []);
    assert.deepEqual(withVisit([], place({ name: "  " }), NOW), []);
  });

  it("the route checks it too, not only the rules", () => {
    assert.match(readFileSync("app/api/account/recent/route.ts", "utf8"), /usableHref\(href\)/);
  });
});

describe("it is not a preference, and never becomes one", () => {
  it("is never read into the preferences or sent to a model", () => {
    // Looking at Rome twice is not a standing preference for Italy. These two
    // are kept apart deliberately: one is what somebody told us, the other is
    // only where they have been.
    const prefs = readFileSync("data/travel-preferences.ts", "utf8");
    assert.ok(!prefs.includes("recent-places"), "preferences read the recent list");
    const assistant = readFileSync("app/api/itinerary/ai/route.ts", "utf8");
    assert.ok(!assistant.includes("recent-places"), "the assistant is told where somebody has been");
    assert.ok(!assistant.includes("readRecentPlaces"), "the assistant reads the recent list");
  });

  it("is only dropped on the pages somebody researches on", () => {
    // A breadcrumb anywhere else is surveillance with no use behind it.
    const recorder = readFileSync("components/RememberVisit.tsx", "utf8");
    assert.match(recorder, /\/api\/account\/recent/);
    assert.ok(!readFileSync("app/account/page.tsx", "utf8").includes("<RememberVisit"), "the account page records visits");
  });

  it("records nothing at all for somebody signed out", () => {
    const route = readFileSync("app/api/account/recent/route.ts", "utf8");
    const post = route.slice(route.indexOf("export async function POST"));
    assert.match(post, /if \(!email\) return NextResponse\.json\(\{ ok: true \}\)/);
  });
});

describe("the traveller can see all of it and forget it", () => {
  const VIEW = readFileSync("components/RecentPlaces.tsx", "utf8");

  it("shows everything kept — there is no longer list behind it", () => {
    assert.match(VIEW, /Pick up where you left off/);
    assert.match(VIEW, /\{recent\.map\(/);
  });

  it("has a forget button that really deletes", () => {
    assert.match(VIEW, /Forget these/);
    assert.match(readFileSync("lib/recent-places-store.ts", "utf8"), /`del\/\$\{key\(account\)\}`/);
  });

  it("renders nothing at all when there is nothing to resume", () => {
    assert.match(VIEW, /if \(recent\.length === 0\) return null;/);
  });
});
