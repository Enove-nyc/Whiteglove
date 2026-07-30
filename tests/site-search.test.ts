import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { searchEverything } from "../lib/site-search";

// WHAT THIS IS FOR. The search bar in the navbar sits on every page and knew
// about destinations and batei hachaim only. Everything the site has grown
// since — attractions, places to stay, quarters, places to eat — answered "No
// match yet" in that box while /stops found them one Enter away.
//
// These hold the bar open to all of it. A kind that stops being searchable
// here is a kind that becomes invisible on every page of the site at once,
// which is exactly how the first four went missing.

describe("the bar finds every kind of thing the site holds", () => {
  test("a thing to do", async () => {
    const hits = await searchEverything("Colosseum");
    assert.ok(hits.some((h) => h.kind === "Thing to do" && /colosseum/i.test(h.title)), "the Colosseum should be findable from the navbar");
  });

  test("somewhere to eat", async () => {
    const hits = await searchEverything("Kosher Tirol", 15);
    assert.ok(hits.some((h) => h.kind === "Somewhere to eat"), "an eatery should be findable from the navbar");
  });

  test("somewhere to stay", async () => {
    const hits = await searchEverything("Canazei", 15);
    assert.ok(hits.some((h) => h.kind === "Somewhere to stay"), "a stay should be findable from the navbar");
  });

  test("a beis hachaim, which it could always do", async () => {
    const hits = await searchEverything("Lizhensk", 15);
    assert.ok(hits.some((h) => h.kind === "Beis hachaim"), "kevarim must not be lost while adding the rest");
  });

  test("the alternate spellings reach it too", async () => {
    const hits = await searchEverything("Lezajsk", 15);
    assert.ok(hits.length > 0, "a place written another way should still be found");
  });
});

describe("what comes back", () => {
  test("nothing at all for an empty query", async () => {
    // The bar shows its own short default list when the box is empty; an empty
    // query must not return the entire site.
    assert.deepEqual(await searchEverything(""), []);
    assert.deepEqual(await searchEverything("   "), []);
  });

  test("every hit can be opened", async () => {
    const hits = await searchEverything("Rome", 20);
    assert.ok(hits.length > 0);
    for (const hit of hits) {
      assert.ok(hit.href.startsWith("/"), `${hit.id} has no usable link`);
      assert.ok(hit.title.trim(), `${hit.id} has no title`);
      assert.ok(hit.kind, `${hit.id} has no kind to show`);
    }
  });

  test("the limit is honoured", async () => {
    assert.ok((await searchEverything("a", 5)).length <= 5);
    assert.ok((await searchEverything("Rome", 3)).length <= 3);
  });

  test("the city typed comes first", async () => {
    // Same rule as the rest of the site: a whole-city match outranks a name
    // that merely contains the word.
    const hits = await searchEverything("Rome", 10);
    assert.match(hits[0].subtitle + " " + hits[0].title, /rome/i);
  });

  test("no row appears twice", async () => {
    // A city with a guide and a beis hachaim of the same name used to produce
    // the same row twice.
    const hits = await searchEverything("Krakow", 20);
    const keys = hits.map((h) => `${h.kind}:${h.title.toLowerCase()}`);
    assert.equal(new Set(keys).size, keys.length);
  });

  test("nonsense returns nothing", async () => {
    assert.deepEqual(await searchEverything("zzzznonsense"), []);
  });
});
