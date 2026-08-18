import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { sortedTzaddikim } from "@/lib/tzaddikim";

/**
 * /tzaddikim was three hundred and twenty-seven links with no heading on the
 * page — not one h2, not one h3. The headings list a screen reader offers was
 * empty, so the only way through was link by link, all three hundred and
 * twenty-seven of them.
 */

const DIRECTORY = readFileSync("components/TzaddikimDirectory.tsx", "utf8");
const CSS = readFileSync("app/globals.css", "utf8");

describe("the kevarim directory has a shape", () => {
  it("groups under real headings, with a landmark per group", () => {
    assert.match(DIRECTORY, /<h2/, "the page still has no heading of any kind");
    assert.match(DIRECTORY, /aria-labelledby=\{countryId\(country\)\}/, "the groups are not announced as sections");
    assert.match(DIRECTORY, /aria-label="Jump to a country"/, "there is no way to skip to a country");
  });

  it("GROUPS BY COUNTRY, NOT BY LETTER, AND THE DATA IS WHY", () => {
    // Alphabetical was the obvious choice and is useless here: the name a
    // tzadik is known by usually begins "The" or "Reb", so two letters hold
    // three quarters of the page. This asserts the thing that made
    // alphabetical wrong, so if the naming ever changes enough to make it
    // right again, somebody is told rather than left guessing.
    const names = sortedTzaddikim().map((entry) => entry.burial.knownAs || entry.burial.name);
    const byLetter = new Map<string, number>();
    for (const name of names) {
      const letter = name[0].toUpperCase();
      byLetter.set(letter, (byLetter.get(letter) ?? 0) + 1);
    }
    const biggestTwo = [...byLetter.values()].sort((a, b) => b - a).slice(0, 2).reduce((a, b) => a + b, 0);
    assert.ok(
      biggestTwo / names.length > 0.5,
      `two letters hold ${Math.round((biggestTwo / names.length) * 100)}% — alphabetical may be worth revisiting`,
    );
    assert.match(DIRECTORY, /byCountry/, "the grouping is no longer by country");
  });

  it("has enough countries to be worth grouping by, and not too many to scan", () => {
    const countries = new Set(sortedTzaddikim().map((entry) => entry.cemetery.country));
    assert.ok(countries.size > 5, `only ${countries.size} countries — grouping buys nothing`);
    assert.ok(countries.size < 40, `${countries.size} countries is a jump bar nobody reads`);
  });

  it("keeps the name order inside a group", () => {
    // Sorting by the name he is known by rather than his surname is the
    // decision that made this page work — somebody looking for the Noam
    // Elimelech is not looking under W. Grouping must not quietly undo it.
    assert.match(DIRECTORY, /listRank\(query, a\.city, a\.knownAs \|\| a\.name\)/);
  });

  it("drops a heading when the search leaves nothing under it", () => {
    // A country heading over an empty grid is a heading that lies. The groups
    // are built from what is on screen, not from the whole list.
    assert.match(DIRECTORY, /for \(const person of shown\)/);
  });
});

describe("what the page weighs", () => {
  it("names the repeated card styling once instead of on every card", () => {
    // Three hundred and twenty-seven cards were each carrying the same two
    // hundred and fifty characters of utility classes. Same rendering, one
    // copy of the description.
    for (const rule of [".wg-kever-card", ".wg-kever-yiddish", ".wg-kever-name", ".wg-kever-place"]) {
      assert.ok(CSS.includes(rule), `${rule} is missing from the stylesheet`);
    }
    assert.match(DIRECTORY, /className="wg-card wg-kever-card/);
  });

  it("KEEPS THE HOVER INLINE, deliberately", () => {
    // .wg-card already has a hover rule and the card carries hover utilities
    // of its own; the two interact. Moving one of them into the stylesheet is
    // a visual change dressed up as a saving, so only what cannot vary moved.
    assert.match(DIRECTORY, /hover:border-\[var\(--gold\)\] hover:shadow-md/);
  });

  it("does not repeat the country on every card under its own heading", () => {
    assert.doesNotMatch(DIRECTORY, /\{person\.city\} · \{person\.country\}/);
  });
});

describe("pictures of tzaddikim", () => {
  it("ARE NOT A THING, AND THE SCHEMA IS WHERE THAT IS TRUE", () => {
    // Most of these men lived before photography, so a picture of one is
    // either not a picture of him or not a picture at all. A Photo belongs to
    // a destination, a beis hachaim, a listing or a holiday destination —
    // there is no relation to a Tzaddik and there should not be one.
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const photo = schema.slice(schema.indexOf("model Photo {"));
    const body = photo.slice(0, photo.indexOf("\n}"));
    assert.doesNotMatch(body, /tzaddik/i, "the Photo table grew a way to hang a picture on a tzadik");
  });
});
