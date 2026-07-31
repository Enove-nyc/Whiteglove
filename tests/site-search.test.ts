import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { searchEverything } from "../lib/site-search";
import { normalize } from "../lib/place-search";

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

/**
 * Letters that NFD cannot take apart.
 *
 * NFD turns á into a + a combining mark, which is how accents get folded. It
 * does nothing to a letter whose stroke is part of its identity: ł, đ, ø, æ, ß
 * are single characters with no base underneath. They were not folded but
 * DELETED, because normalize keeps only a–z afterwards.
 *
 * Łańcut therefore normalised to "ancut" — it sorted under A in the directory's
 * A–Z strip, and a search for "Lancut" found it only through an alias somebody
 * had thought to type in. Łódź and Żmigród had no such alias. Poland and
 * Lithuania are most of this site's subject, so this was a good share of the
 * towns, not an edge case.
 */
describe("folding a letter that has no accent to remove", () => {
  test("reads Ł as L", () => {
    assert.equal(normalize("Łańcut"), "lancut");
    assert.equal(normalize("Łódź"), "lodz");
  });

  test("still folds the ordinary accents", () => {
    assert.equal(normalize("Kraków"), "krakow");
    assert.equal(normalize("Leżajsk"), "lezajsk");
    assert.equal(normalize("Sátoraljaújhely"), "satoraljaujhely");
    assert.equal(normalize("Šiauliai"), "siauliai");
  });

  test("keeps Yiddish exactly as it is", () => {
    // Folding must never eat the Hebrew letters: an emptied query matches
    // everything, which is how a search for a town returned the whole site.
    assert.equal(normalize("ליזענסק"), "ליזענסק");
    assert.equal(normalize("קראקא"), "קראקא");
  });

  test("never turns a word into nothing", () => {
    for (const word of ["Łódź", "Ø", "æ", "ß", "Đ"]) {
      assert.ok(normalize(word).length > 0, `${word} normalised away to nothing`);
    }
  });
});
