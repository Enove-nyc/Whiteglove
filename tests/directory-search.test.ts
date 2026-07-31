import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cemeteries } from "@/data/cemeteries";
import { buildDirectoryIndex, filterDirectory, lettersIn, NO_FILTERS } from "@/lib/directory-browse";

/**
 * Finding a town by typing its name — however you spell it.
 *
 * The directory matched the query as raw lowercased text against a raw
 * lowercased haystack, so an accent had to be typed exactly. Kraków was
 * findable only as "Kraków"; "Krakow" returned nothing at all. Nobody types ó.
 * Leżajsk was the same, and so was every other Polish and Hungarian town on a
 * site whose subject is Polish and Hungarian towns.
 *
 * The search BAR had been folding accents for a long time (lib/place-search).
 * The directory had not, so the same query worked in one box and failed in the
 * one right next to it.
 *
 * Yiddish was never the broken half — the folding keeps Hebrew letters, which
 * is why searching "ליזענסק" already worked and still does. Both are tested
 * here anyway, because the point is that either spelling finds the place.
 */

const entries = buildDirectoryIndex(
  cemeteries.map((c) => ({
    slug: c.slug, city: c.city, yiddishCity: c.yiddishCity, name: c.name,
    yiddishName: c.yiddishName, country: c.country,
    burialCount: c.burials.length, burials: [], ownerAdded: false,
  })),
);

const find = (query: string) => filterDirectory(entries, { ...NO_FILTERS, query });

describe("typing a town's name without its accents", () => {
  it("finds Kraków from “Krakow”", () => {
    assert.ok(find("Krakow").length > 0, "“Krakow” found nothing");
    assert.deepEqual(find("Krakow").map((e) => e.s), find("Kraków").map((e) => e.s));
  });

  it("finds Leżajsk from “Lezajsk”", () => {
    assert.ok(find("Lezajsk").length > 0, "“Lezajsk” found nothing");
    assert.deepEqual(find("Lezajsk").map((e) => e.s), find("Leżajsk").map((e) => e.s));
  });

  it("finds Łańcut from “Lancut”", () => {
    assert.ok(find("Lancut").length > 0);
  });

  it("still finds a town that never had an accent", () => {
    // The folding must not break the ordinary case.
    assert.ok(find("Belz").length > 0);
    assert.ok(find("Uman").length > 0);
  });
});

describe("typing it in Yiddish", () => {
  it("finds the same places the English spelling does", () => {
    for (const [yiddish, english] of [["קראקא", "Krakow"], ["ליזענסק", "Lezajsk"], ["אומאן", "Uman"], ["בעלז", "Belz"]]) {
      const inYiddish = find(yiddish);
      assert.ok(inYiddish.length > 0, `“${yiddish}” found nothing`);
      const overlap = inYiddish.filter((e) => find(english).some((f) => f.s === e.s));
      assert.ok(overlap.length > 0, `“${yiddish}” and “${english}” found different places entirely`);
    }
  });

  it("does not return everything for a Yiddish query", () => {
    // Stripping Hebrew would leave an empty query, and an empty query matches
    // the whole directory — 297 records dressed up as a search result.
    assert.ok(find("ליזענסק").length < 10, "a Yiddish query returned most of the directory");
  });
});

describe("a query that matches nothing", () => {
  it("says so, rather than returning the whole list", () => {
    assert.equal(find("zzzzzznotaplace").length, 0);
  });
});

describe("the A–Z strip", () => {
  it("files an accented name under its plain letter", () => {
    // Łańcut begins with Ł, which is not A–Z, so it belonged to no letter and
    // the strip could not reach it.
    const underL = filterDirectory(entries, { ...NO_FILTERS, letter: "L" });
    assert.ok(underL.some((e) => e.n.startsWith("Łańcut")), "Łańcut is not under L");
  });

  it("offers only letters that have something behind them", () => {
    const letters = lettersIn(entries);
    assert.ok(letters.includes("L"));
    assert.ok(letters.every((l) => /^[A-Z]$/.test(l)), `not a plain letter: ${letters.join("")}`);
    for (const letter of letters) {
      assert.ok(filterDirectory(entries, { ...NO_FILTERS, letter }).length > 0, `${letter} leads to an empty page`);
    }
  });
});
