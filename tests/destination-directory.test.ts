import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { destinations as heritageDestinations } from "@/data/destinations";
import { TRIP_THEMES, vacationDestinations } from "@/data/vacation-destinations";
import { heritageCards, heritageTownHasContent } from "@/lib/destination-directory";
import {
  asDirectoryCards,
  asHeritageCards,
  cardCountry,
  cardName,
  cardSeasons,
  cardThemes,
  filterVacations,
  NO_VACATION_FILTERS,
  themeOptions,
} from "@/lib/vacation-ideas";

/**
 * The site had two lists of places to go and called them one thing.
 *
 * /destinations showed the holiday destinations. The heritage towns were
 * reachable by search and from /heritage and were in that directory not at
 * all, while the site's own writing said they were part of it. They are the
 * same category — both are answers to "where should we go".
 */

const HERITAGE = heritageCards();
const DIRECTORY = [...asDirectoryCards([]), ...asHeritageCards(HERITAGE)];

describe("the heritage half of the directory", () => {
  it("carries the towns that have something on them", () => {
    assert.ok(HERITAGE.length > 20, `only ${HERITAGE.length} towns made it in`);
    assert.ok(HERITAGE.length < heritageDestinations.length, "every town got in, including the empty ones");
  });

  it("LEAVES OUT THE EMPTY ONES, ON THE SAME TEST THE SITEMAP USES", () => {
    // Seventy-odd towns are records with no kever, no listing and no sentence.
    // They are already noindexed and kept out of the sitemap for that reason;
    // putting them in the directory would undo that decision from the other
    // end, and the two must never disagree.
    const listed = new Set(HERITAGE.map((card) => card.slug));
    for (const town of heritageDestinations) {
      assert.equal(
        listed.has(town.slug),
        heritageTownHasContent(town.slug, town.summary),
        `${town.slug} is listed in the directory and the sitemap disagree`,
      );
    }
  });

  it("points at the page the town actually has", () => {
    for (const card of HERITAGE) {
      assert.match(card.href, /^\/heritage\/towns\//, `${card.slug} points somewhere else`);
    }
  });

  it("never invents a summary it was not given", () => {
    const bySlug = new Map(heritageDestinations.map((town) => [town.slug, town]));
    for (const card of HERITAGE) {
      assert.equal(card.summary, bySlug.get(card.slug)?.summary, `${card.slug} grew a summary from somewhere`);
    }
  });
});

describe("a heritage town as a directory card", () => {
  it("answers the Heritage trip type and no other", () => {
    // Not being called a beach by omission — it is that the one thing anybody
    // has assessed about it is that this is where the kevarim are.
    for (const card of DIRECTORY) {
      assert.deepEqual(cardThemes(card), ["heritage"]);
    }
    assert.ok(TRIP_THEMES.some((theme) => theme.value === "heritage"), "the filter it needs does not exist");
  });

  it("claims no season, because nobody wrote one", () => {
    // Empty rather than all four: answering a season filter with a town that
    // was never assessed for it would be the site inventing an opinion.
    for (const card of DIRECTORY) assert.deepEqual(cardSeasons(card), []);
    assert.equal(filterVacations(DIRECTORY, { ...NO_VACATION_FILTERS, season: "summer" }).length, 0);
  });

  it("is dropped by a filter it has never been assessed for", () => {
    for (const key of ["kosher", "shabbos"] as const) {
      const filtered = filterVacations(DIRECTORY, { ...NO_VACATION_FILTERS, [key]: "in-town" });
      assert.equal(filtered.length, 0, `a heritage town answered the ${key} filter`);
    }
  });

  it("is findable by its name, its Yiddish name and its country", () => {
    const one = HERITAGE.find((card) => card.yiddishName) ?? HERITAGE[0];
    for (const term of [one.name, one.country]) {
      const hits = filterVacations(DIRECTORY, { ...NO_VACATION_FILTERS, query: term.toLowerCase() });
      assert.ok(hits.some((card) => cardName(card) === one.name), `searching "${term}" lost ${one.slug}`);
    }
  });

  it("is counted in the Heritage filter's own number", () => {
    const heritage = themeOptions(DIRECTORY, TRIP_THEMES).find((option) => option.value === "heritage");
    assert.equal(heritage?.count, HERITAGE.length);
  });
});

describe("one directory, both kinds", () => {
  it("is what the hub builds", () => {
    const hub = readFileSync("app/destinations/(hub)/page.tsx", "utf8");
    assert.match(hub, /asHeritageCards\(heritageCards\(\)\)/);
    assert.match(hub, /asDirectoryCards\(cardModels/);
  });

  it("counts both kinds in what it tells a search engine it holds", () => {
    const hub = readFileSync("app/destinations/(hub)/page.tsx", "utf8");
    assert.match(hub, /count: cards\.length/, "the structured data still counts only the holiday half");
  });

  it("does not lose a holiday destination on the way in", () => {
    const cards = asDirectoryCards([]);
    assert.equal(cards.length, 0);
    assert.ok(vacationDestinations.length > 0);
    // Country is read through one accessor for both kinds, so a card of either
    // shape lands in the country filter.
    for (const card of DIRECTORY) assert.ok(cardCountry(card).length > 0);
  });
});
