import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { bulkDestinations } from "@/data/destinations-bulk";
import { vacationDestinations } from "@/data/vacation-destinations";
import {
  contestedSlugs,
  heritageTownHref,
  MIGRATION_LISTS,
  movedTo,
  vacationDestinationHref,
  type MigrationLists,
} from "@/lib/route-migration";
import { publicPaths } from "@/lib/site-map";

/**
 * Two things called "destinations", and only one of them can have the address.
 *
 * THE RENAME. The vacation hub took `/destinations` because the navigation item
 * has to mean places to go on holiday; the heritage towns that were there moved
 * to `/heritage/towns`. Both sets of old addresses keep working.
 *
 * THE DANGEROUS PART, and the reason this file exists: `/destinations/:slug`
 * now answers two different kinds of page depending on the slug. A single
 * redirect rule sending it to `/heritage/towns/:slug` would send every vacation
 * page on the site — the eighteen pages this whole business now runs on — to a
 * town with graves in it. That is a mistake nobody would see until traffic
 * dropped, so it is decided per slug and asserted here.
 */

const LISTS: MigrationLists = { vacationSlugs: ["rome", "prague"], heritageTownSlugs: ["uman", "prague"] };

describe("the hub moved wholesale", () => {
  it("redirects the hub and everything under it", () => {
    assert.equal(movedTo("/vacation-ideas", LISTS), "/destinations");
    assert.equal(movedTo("/vacation-ideas/rome", LISTS), "/destinations/rome");
    assert.equal(movedTo("/vacation-ideas/", LISTS), "/destinations");
  });

  it("leaves the new addresses alone", () => {
    assert.equal(movedTo("/destinations", LISTS), null);
    assert.equal(movedTo("/heritage/towns/uman", LISTS), null);
  });
});

describe("the heritage towns moved per slug", () => {
  it("SENDS A HERITAGE TOWN TO ITS NEW HOME", () => {
    assert.equal(movedTo("/destinations/uman", LISTS), "/heritage/towns/uman");
  });

  it("NEVER TOUCHES A VACATION DESTINATION", () => {
    // The failure this whole module exists to prevent. A blanket rule would
    // send every one of these to a town with graves in it.
    assert.equal(movedTo("/destinations/rome", LISTS), null);
    for (const destination of vacationDestinations) {
      assert.equal(
        movedTo(`/destinations/${destination.slug}`, MIGRATION_LISTS),
        null,
        `${destination.slug} is being redirected away from its own page`,
      );
    }
  });

  it("gives the contested slug to the vacation page, and says which it is", () => {
    // `prague` is both. The address can only serve one, the navigation now
    // means holidays by the word, and the heritage town keeps its own address.
    assert.equal(movedTo("/destinations/prague", LISTS), null);
    assert.deepEqual(contestedSlugs(LISTS), ["prague"]);
    assert.deepEqual(contestedSlugs(MIGRATION_LISTS), ["prague"], "the collision set changed — check both pages still resolve");
  });

  it("leaves anything it is not certain about alone", () => {
    // A wrong redirect is worse than a 404: it sends somebody somewhere
    // confidently and they never find out what they were looking for.
    assert.equal(movedTo("/destinations/not-a-place", LISTS), null);
    assert.equal(movedTo("/destinations/uman/photos", LISTS), null);
    assert.equal(movedTo("/", LISTS), null);
    assert.equal(movedTo("/heritage", LISTS), null);
  });

  it("moves every heritage town that had an address", () => {
    for (const place of bulkDestinations) {
      const expected = MIGRATION_LISTS.vacationSlugs.includes(place.slug) ? null : `/heritage/towns/${place.slug}`;
      assert.equal(movedTo(`/destinations/${place.slug}`, MIGRATION_LISTS), expected, place.slug);
    }
  });
});

describe("the rest of the site agrees", () => {
  it("is wired into the middleware, not only available to it", () => {
    const middleware = readFileSync("middleware.ts", "utf8");
    assert.match(middleware, /movedTo\(pathname, MIGRATION_LISTS\)/);
    // 308, not 307: this is permanent, and a search engine should move the
    // ranking across rather than keep both addresses.
    assert.match(middleware, /NextResponse\.redirect\(url, 308\)/);
  });

  it("redirects the hub from the config, where a wildcard is safe", () => {
    const config = readFileSync("next.config.ts", "utf8");
    assert.match(config, /source: "\/vacation-ideas", destination: "\/destinations"/);
    assert.match(config, /source: "\/vacation-ideas\/:slug", destination: "\/destinations\/:slug"/);
    // …and NOT as a wildcard for the heritage half, which would swallow the
    // vacation pages.
    assert.doesNotMatch(config, /source: "\/destinations\/:\w+"/);
  });

  it("lists both sets at their new addresses in the sitemap", () => {
    const known = new Set(publicPaths().map((entry) => entry.path));
    for (const destination of vacationDestinations) {
      assert.ok(known.has(vacationDestinationHref(destination.slug)), destination.slug);
    }
    for (const place of bulkDestinations) {
      assert.ok(known.has(heritageTownHref(place.slug)), place.slug);
    }
    // And nothing is still offered at an address that now redirects.
    for (const entry of publicPaths()) {
      assert.doesNotMatch(entry.path, /^\/vacation-ideas/, `${entry.path} is in the sitemap and redirects`);
    }
  });

  it("TYPES NEITHER OLD PATH INTO A LIVE LINK", () => {
    // A redirect is a safety net, not an address to keep using: every hop
    // costs a request and search engines discount a chain.
    for (const file of [
      "app/page.tsx",
      "components/Footer.tsx",
      "lib/navigation.ts",
      "lib/trip-plan.ts",
      "lib/site-map.ts",
      "app/heritage/page.tsx",
      "app/kosher-travel/page.tsx",
    ]) {
      const source = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      assert.doesNotMatch(source, /["'`]\/vacation-ideas/, `${file} still links to the old hub`);
    }
  });
});
