import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { matchField } from "@/lib/site-search-match";

/**
 * "ROME" MUST NOT FIND A PROMENADE.
 *
 * Reported from the live site: searching Rome returned results whose only
 * connection to it was the letters r-o-m-e sitting inside a longer word.
 * "Promenade" contains them, and so does any number of unrelated names, so a
 * short place name matched half the site and did it at the same rank as the
 * city itself.
 *
 * The rule now: a one-word query has to land on a word — the whole field, a
 * whole token, or the start of one. A multi-word query may still match inside
 * a longer name, because quoting a phrase out of the middle of a name is
 * exactly what somebody typing two words means.
 */
describe("a single word must match a word", () => {
  it("ranks the city itself first and does not match it inside longer words", () => {
    const rome = matchField("rome", "Rome");
    assert.equal(rome.ok, true);
    assert.equal(rome.rank, 0, "an exact title is the best match there is");

    for (const field of ["The seaside promenade", "Promenade des Anglais", "Le Promenade Hotel"]) {
      assert.equal(matchField("rome", field).ok, false, `rome should not match "${field}"`);
    }
  });

  it("still matches the start of a word, which is how people type", () => {
    // "rome" against "Rome Fiumicino Airport" — a real prefix, not a passenger
    // inside somebody else's word.
    const airport = matchField("rome", "Rome Fiumicino Airport");
    assert.equal(airport.ok, true);
    assert.ok(airport.rank <= 2);
  });

  it("keeps phrase matches inside longer names", () => {
    const phrase = matchField("sally mayer", "Around Via Sally Mayer and the Via Guastalla synagogue");
    assert.equal(phrase.ok, true);
    assert.ok(phrase.rank >= 3, "a phrase found mid-name ranks below a name match, not above it");
  });

  it("leaves the spelling-tolerant paths alone", () => {
    assert.equal(matchField("dolomits", "The Dolomites").ok, true, "a typo still finds the place");
    assert.equal(matchField("esim", "e-SIM data plans").ok, true, "hyphens and spaces still collapse");
  });
});

describe("searches that came back empty from a site that had the answer", () => {
  it("FINDS A TOWN FROM ITS YIDDISH NAME SOUNDED OUT", async () => {
    // בארדיאב found nothing. The town is indexed as Bardejov, with bardiov
    // beside it, and its Yiddish name בארטפעלד — Bartfeld. Both spellings are
    // right and neither is a misspelling of the other, so no amount of fuzzy
    // matching bridges them. The sound does.
    const { searchSite } = await import("@/lib/site-search");
    const found = await searchSite("בארדיאב", 5);
    assert.ok(found.results.length > 0, "בארדיאב still finds nothing");
    assert.ok(
      found.results.some((hit) => /bardejov/i.test(hit.title) || /bardejov/i.test(hit.subtitle ?? "")),
      "found something, but not Bardejov",
    );
  });

  it("FORGIVES A SPELLING THAT DIFFERS AT THE FRONT OF THE WORD", async () => {
    // קרעסטיר against קערעסטיר. Every cheap gate compares the first two or
    // three letters, so a word whose difference is at the front could never be
    // reached — rare in English, ordinary in Yiddish where the ayin written as
    // a vowel is optional.
    const { searchSite } = await import("@/lib/site-search");
    const found = await searchSite("קרעסטיר", 5);
    assert.ok(found.results.some((hit) => /kerestir/i.test(hit.title)), "קרעסטיר does not find Kerestir");
  });

  it("DOES NOT DEMAND THAT EVERY WORD OF A QUESTION MATCH SOMETHING", async () => {
    // "tours and activities" found nothing while "tours" found five: every
    // token had to hit, and no page carries all three.
    const { searchSite } = await import("@/lib/site-search");
    for (const query of ["tours and activities", "Food in paris", "where is kosher food in paris"]) {
      const found = await searchSite(query, 5);
      assert.ok(found.results.length > 0, `"${query}" finds nothing`);
    }
  });

  it("keeps the words that narrow a search on THIS site", async () => {
    // "kosher" and "jewish" are not padding here, whatever a general stop-word
    // list would say.
    //
    // Two of this site's own section names are made almost entirely of joining
    // words — "Things to do", "Where to stay" — so stripping them looks
    // dangerous. It is not, because this only ever runs after the ordinary
    // search found nothing, and both of those already find their section. The
    // test below proves it rather than assuming it.
    const { withoutStopWords } = await import("@/lib/site-search");
    assert.equal(withoutStopWords("kosher food in paris"), "kosher food paris");
    assert.equal(withoutStopWords("things to do near the ghetto"), "things ghetto");
    // A question made entirely of joining words leaves nothing to search for,
    // and that is better than searching for "the".
    assert.equal(withoutStopWords("what is it"), "");
  });

  it("RETRIES ONLY WHEN THE ONE BEFORE FOUND NOTHING", async () => {
    // Otherwise a loose retry would dilute a good answer with near misses.
    const source = readFileSync("lib/site-search.ts", "utf8");
    for (const guard of [
      /if \(!scored\.length\) \{\s*\n\s*const meaningful/,
      /if \(!scored\.length && hasHebrew\(q\)\)/,
      /if \(!scored\.length\) \{\s*\n\s*const longest/,
    ]) {
      assert.match(source, guard);
    }
  });

  it("LEAVES THE SECTION NAMES MADE OF JOINING WORDS ALONE", async () => {
    // "Things to do" and "Where to stay" survive because the retries never run
    // for them: the ordinary search finds them first.
    const { searchSite } = await import("@/lib/site-search");
    for (const [query, expected] of [
      ["things to do", /things to do/i],
      ["where to stay", /where to stay/i],
    ] as const) {
      const found = await searchSite(query, 4);
      assert.ok(found.results.some((hit) => expected.test(hit.title)), `"${query}" lost its own section`);
    }
  });

  it("still refuses the match that started all this", async () => {
    // "rome" must not find "promenade". None of the retries may reopen it.
    const { searchSite } = await import("@/lib/site-search");
    const found = await searchSite("rome", 10);
    assert.ok(found.results.length > 0);
    assert.ok(
      !found.results.some((hit) => /promenade/i.test(hit.title)),
      "a retry has reopened the promenade problem",
    );
  });
});
