import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchSite } from "@/lib/site-search";
import { getSearchIndex } from "@/lib/site-search-index";
import { damerauLevenshtein, maxEditsFor } from "@/lib/site-search-match";

/**
 * The search box is the whole front door of this site — the home page opens on
 * it and nothing else. Two faults met there, and both are pinned here.
 */

describe("a confident wrong answer is worse than none", () => {
  // The hechsherim page indexes every certifier name it knows: Chai, Ches,
  // CHLP, Tikva, Heights. With two edits allowed on a five-letter word,
  // "cheap" reached "chai" and "mikvah" reached "tikva", so a visitor
  // searching either was shown a page about kashrus symbols — and with
  // nothing else matching, that page WON.
  it("does not answer a booking question with a kashrus page", async () => {
    const top = (await searchSite("cheap flights", 5)).results[0];
    assert.notEqual(top?.title, "Hechsherim", "a search for flights landed on hechsherim");
  });

  it("a short word cannot reach a different short word", () => {
    for (const [query, other] of [
      ["cheap", "chai"],
      ["mikvah", "tikva"],
      ["shul", "chlp"],
    ] as const) {
      const distance = damerauLevenshtein(query, other);
      assert.ok(
        distance > maxEditsFor(query),
        `"${query}" still reaches "${other}" (${distance} edits, budget ${maxEditsFor(query)})`,
      );
    }
  });

  it("but a real typo is still forgiven", async () => {
    assert.equal((await searchSite("krakov", 1)).results[0]?.title, "Kraków");
    assert.equal((await searchSite("jerusalm", 1)).results[0]?.title, "Jerusalem");
  });

  it("and a transliteration is not treated as a typo at all", async () => {
    // "bardiab" is what בארדיאב sounds out to; the town is indexed as
    // "bardiov". Two edits, neither spelling wrong. Tightening the budget far
    // enough to kill the short-word reaches broke this bridge once.
    const hits = (await searchSite("בארדיאב", 5)).results;
    assert.ok(hits.length > 0, "the Yiddish name finds nothing");
  });
});

describe("what the site holds, the search box can find", () => {
  // The public mikvaos page builds its list from the static listings AND the
  // notable ones (withNotable, lib/mikvaos.ts). The search index took only the
  // static half, so the mikvaos of London, Manchester, Gateshead, New York,
  // Los Angeles, Miami, Toronto and Jerusalem were on the page and absent from
  // the box on top of it.
  it("finds a mikvah by city, which is how anybody asks for one", async () => {
    for (const [query, expected] of [
      ["mikvah london", "Mikvaos of London"],
      ["mikvah new york", "Mikvaos of New York"],
      ["mikvah in london", "Mikvaos of London"],
    ] as const) {
      const top = (await searchSite(query, 3)).results[0];
      assert.equal(top?.title, expected, `"${query}" returned ${top?.title ?? "nothing"}`);
    }
  });

  it("every notable mikvah reached the index, not just the ones with a page", async () => {
    const index = await getSearchIndex();
    const indexed = index.filter((d) => /^Mikva/i.test(d.title)).length;
    assert.ok(indexed >= 8, `only ${indexed} mikvah listings are searchable`);
  });
});
