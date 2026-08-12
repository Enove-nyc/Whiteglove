import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { kosherStays } from "@/data/kosher-stays";
import { SEASONS, TRIP_THEMES, vacationDestinations } from "@/data/vacation-destinations";
import {
  collectionBySlug,
  collectionIsLive,
  destinationsInCollection,
  liveCollections,
  staysInCollection,
} from "@/lib/collections";
import { publicPaths } from "@/lib/site-map";

describe("a collection is only offered when something is behind it", () => {
  it("never returns an empty live list while destinations exist", () => {
    const live = liveCollections(vacationDestinations, kosherStays);
    assert.ok(live.length > 0);
    for (const entry of live) {
      assert.match(entry.path, /^\/collections\//);
      assert.ok(entry.title.trim());
      assert.ok(entry.intro.trim());
    }
  });

  it("drops a season that no destination uses", () => {
    const none = vacationDestinations.map((destination) => ({ ...destination, seasons: [] as typeof destination.seasons }));
    const live = liveCollections(none, []);
    assert.equal(
      live.some((entry) => entry.kind === "season"),
      false,
    );
  });

  it("offers seasonal programmes only when a stay names its season", () => {
    assert.equal(collectionIsLive("seasonal-programmes", vacationDestinations, []), false);
    assert.equal(collectionIsLive("seasonal-programmes", vacationDestinations, kosherStays), true);
    const listed = staysInCollection("seasonal-programmes", kosherStays);
    assert.ok(listed.length > 0);
    assert.ok(listed.every((stay) => stay.season?.trim()));
  });

  it("does not invent a slug", () => {
    assert.equal(collectionBySlug("honeymoon"), null);
    assert.equal(collectionBySlug(""), null);
    assert.equal(collectionIsLive("nowhere", vacationDestinations, kosherStays), false);
  });
});

describe("a collection lists only what it claims", () => {
  it("a season page is destinations that name that season", () => {
    for (const season of SEASONS) {
      const listed = destinationsInCollection(season.value, vacationDestinations);
      for (const destination of listed) {
        assert.ok(destination.seasons.includes(season.value), destination.slug);
      }
      const others = vacationDestinations.filter((destination) => !destination.seasons.includes(season.value));
      for (const destination of others) {
        assert.equal(listed.some((row) => row.slug === destination.slug), false);
      }
    }
  });

  it("a theme page is destinations that name that theme", () => {
    for (const theme of TRIP_THEMES) {
      const listed = destinationsInCollection(theme.value, vacationDestinations);
      assert.ok(listed.every((destination) => destination.themes.includes(theme.value)));
    }
  });

  it("a programmes page is not a destination list", () => {
    assert.deepEqual(destinationsInCollection("seasonal-programmes", vacationDestinations), []);
  });
});

describe("collection pages are indexable", () => {
  it("puts every live collection in the sitemap", () => {
    const paths = new Set(publicPaths().map((entry) => entry.path));
    assert.ok(paths.has("/collections"));
    for (const entry of liveCollections()) {
      assert.ok(paths.has(entry.path), `${entry.path} is live and not submitted`);
    }
  });

  it("the public page 404s an empty slug rather than inventing a list", () => {
    const page = readFileSync("app/collections/[slug]/page.tsx", "utf8");
    assert.match(page, /notFound\(/);
    assert.match(page, /collectionIsLive/);
    assert.match(page, /force-dynamic/);
  });

  it("the front page sends seasons to the collection, not a query string", () => {
    const home = readFileSync("app/page.tsx", "utf8");
    assert.match(home, /href=\{collectionPath\(season\.value\)\}/);
    assert.doesNotMatch(home, /\/destinations\?season=/);
  });
});
