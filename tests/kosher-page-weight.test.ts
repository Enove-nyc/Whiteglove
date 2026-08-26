import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeOf } from "./helpers/source";
import { kosherEateries } from "@/data/kosher-eateries";

const DIRECTORY = codeOf("components/EateryDirectory.tsx");

/**
 * /kosher is the page an Orthodox traveller opens on hotel wifi in a city they
 * do not know. It used to paint every listing the site holds — 1,466 cards,
 * each with two interactive components — for 3.5MB of HTML, twenty times the
 * weight of any other page on the site.
 */

describe("the kosher page draws a screenful, not the whole directory", () => {
  it("there really are enough listings for this to matter", () => {
    assert.ok(kosherEateries.length > 1000, `only ${kosherEateries.length} listings`);
  });

  it("only the first slice of the result is drawn", () => {
    assert.match(DIRECTORY, /shown\.slice\(0, drawn\)/);
    assert.doesNotMatch(DIRECTORY, /\{shown\.map\(/);
  });

  it("the rest are one button away", () => {
    assert.match(DIRECTORY, /shown\.length > drawn/);
    assert.match(DIRECTORY, /Show more/);
  });

  it("and it prints no total, like every other public list here", () => {
    // The shared toolbar has no count props and five directories are held to
    // it — tests/list-toolbar.test.ts. "Showing 60 of 1,466" is the obvious
    // thing to write under that button and it is not this site's rule.
    assert.doesNotMatch(DIRECTORY, /Showing \{/);
    assert.doesNotMatch(DIRECTORY, /\{shown\.length\}/);
  });

  it("the SEARCH still looks through every listing — that is the point of the page", () => {
    // The slice happens after filtering and sorting, never before: a place at
    // position 900 must still be findable by name.
    const filterAt = DIRECTORY.indexOf("const shown = eateries");
    const sliceAt = DIRECTORY.indexOf("shown.slice(0, drawn)");
    assert.ok(filterAt !== -1 && sliceAt > filterAt, "the list is sliced before it is searched");
    assert.match(DIRECTORY, /listMatches\(/);
  });

  it("a new search starts the count again", () => {
    // Otherwise one press of "Show more" leaves every later search drawing a
    // long list, which is the cost this exists to avoid.
    assert.match(DIRECTORY, /const narrow =/);
    assert.match(DIRECTORY, /onQuery=\{narrow\(setQuery\)\}/);
    assert.match(DIRECTORY, /onChange: narrow\(setCountry\)/);
    assert.match(DIRECTORY, /onChange: narrow\(setKind\)/);
  });
});
