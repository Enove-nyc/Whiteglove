import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { listMatches, listRank } from "../components/ListToolbar";
import { attractions } from "../data/attractions";
import { kosherEateries } from "../data/kosher-eateries";
import { extraSpellings } from "../lib/place-search";

// THE BUG THESE EXIST FOR: this site had two search matchers, and the pages a
// visitor actually browses used the weaker one. "Yungfrau" found the
// Jungfraujoch on /stops and nothing at all on /attractions; "Lezajsk" found
// Lizhensk in the planner and nothing on /cemeteries. The directory pages now
// go through the same matcher as everything else, and these hold that shut.

const attractionHay = (a: (typeof attractions)[number]) =>
  [a.name, a.city, a.country, a.kind, a.summary, (a.notes ?? []).join(" "), extraSpellings([a.slug, a.city])].join(" ");

const findable = (query: string) => attractions.filter((a) => listMatches(attractionHay(a), query));

describe("the browse pages spell as well as the planner does", () => {
  test("a misspelling still lands", () => {
    assert.ok(
      findable("Colosseom").some((a) => a.slug === "rome-colosseum"),
      "the directory should tolerate the same typos the planner does",
    );
  });

  test("a long name is findable by the part of it people say", () => {
    // "Jungfrau" for the Jungfraujoch, and the full word too. NOT "Yungfrau":
    // the typo is on a twelve-letter token and the edit distance is five, well
    // past what the matcher allows. That is a real limit and the fix for it is
    // an alias, not a looser matcher — see the spelling table in place-search.
    assert.ok(findable("Jungfrau").some((a) => a.slug === "jungfraujoch"));
    assert.ok(findable("Jungfraujoch").some((a) => a.slug === "jungfraujoch"));
  });

  test("an accent is not something anybody types", () => {
    assert.ok(findable("Lauterbrunnen").length > 0);
    assert.ok(findable("gorges du fier").some((a) => a.slug === "gorges-du-fier"));
  });

  test("the alternate-spelling table reaches the directory pages", () => {
    // extraSpellings is what /stops has always used. Before this it was not
    // consulted by any browse page at all.
    const hay = ["Lizhensk Jewish Cemetery", extraSpellings(["lizensk", "Lizhensk"])].join(" ");
    for (const spelling of ["Lezajsk", "Leżajsk", "lizhinsk"]) {
      assert.ok(listMatches(hay, spelling), `"${spelling}" should find Lizhensk`);
    }
  });
});

describe("what is searched, not just how", () => {
  test("the notes are searchable, because half the useful words live there", () => {
    // Nothing in this entry's name, city or summary says "pushchair".
    const hits = findable("pushchair");
    assert.ok(hits.length > 0, "a word that appears only in the notes should still find its entry");
  });

  test("an eatery is findable by the quarter it is tied to", () => {
    const hay = (e: (typeof kosherEateries)[number]) =>
      [e.name, e.city, e.country, e.kind, e.diet, e.summary, (e.notes ?? []).join(" "), e.nearQuarter ?? ""].join(" ");
    assert.ok(
      kosherEateries.filter((e) => listMatches(hay(e), "lyon-villeurbanne")).length > 0,
      "the quarter an eatery names should find it",
    );
  });
});

describe("closest first", () => {
  test("a city typed whole outranks a name that merely contains it", () => {
    // The recorded failure: "P-rome-nade" contains "rome", so a search for
    // Rome opened in Nice. City is compared whole, and before the name.
    assert.ok(listRank("Rome", "Rome", "The Colosseum") < listRank("Rome", "Nice", "The Promenade des Anglais"));
  });

  test("an empty query ranks everything equally, so the page keeps its own order", () => {
    assert.equal(listRank("", "Zermatt", "Gornergrat"), listRank("", "Annecy", "Annecy and its lake"));
  });

  test("ranking never drops a hit — it only orders them", () => {
    const hits = findable("Dolomites");
    assert.ok(hits.length >= 4);
    const ranked = [...hits].sort((a, b) => listRank("Dolomites", a.city, a.name) - listRank("Dolomites", b.city, b.name));
    assert.equal(ranked.length, hits.length);
  });
});

describe("looseness has a floor", () => {
  test("nonsense still returns nothing", () => {
    // The matcher's own recorded trap: "on" is a substring of half the
    // descriptions on the site, so a loose matcher answers everything. The
    // four-character floor that fixed that was still not enough — "sense" is a
    // real five-letter word sitting inside "zzzznonsense", and that query
    // returned the Lake District until a haystack word was also required to be
    // at least half of what was typed.
    assert.equal(findable("zzzznonsense").length, 0);
    assert.equal(findable("qqqqqqqq").length, 0);
    assert.equal(findable("xylophonium").length, 0);
  });

  test("but a real word inside a longer query still counts", () => {
    // The rule the floor above must not break: somebody types more than the
    // entry says, and the entry should still be found.
    assert.ok(findable("Jungfraujoch").some((a) => a.slug === "jungfraujoch"));
  });

  test("an empty box shows everything rather than nothing", () => {
    assert.equal(findable("").length, attractions.length);
    assert.equal(findable("   ").length, attractions.length);
  });
});
