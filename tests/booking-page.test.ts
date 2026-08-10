import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BUILT_IN_WORDS } from "@/data/site-words";

/**
 * The booking page is about a holiday now.
 *
 * WHAT IT USED TO SAY. It compared "airlines and routes to the towns your trip
 * is built around", offered "kosher-friendly stays near the kever or in the
 * city", suggested "a rental for getting between towns and kevarim at your own
 * pace", and explained that a booking sits "alongside the kevarim and
 * destinations the journey is actually built around".
 *
 * Every one of those sentences was written when the site was a heritage
 * database with a travel page attached, and they are all true of a heritage
 * journey. Shown to a family booking a week in Rome — on the page where the
 * business now earns its money — they read as evidence that the page is not
 * for them.
 *
 * The heritage side is not diminished by this. It has its own section, and one
 * line here says these tools serve it too. What changed is that the general
 * booking page is now general.
 */

const PAGE = readFileSync("app/book/page.tsx", "utf8");
const PANEL = readFileSync("components/BookPartners.tsx", "utf8");

/** The page without its comments — those record the history deliberately. */
const PROSE = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const PANEL_PROSE = PANEL.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("what the page is about", () => {
  it("IS NOT ABOUT KEVARIM ANY MORE", () => {
    for (const word of ["kever", "kevarim", "shomer", "beis hachaim"]) {
      assert.doesNotMatch(PROSE, new RegExp(word, "i"), `the booking page still talks about ${word}`);
      assert.doesNotMatch(PANEL_PROSE, new RegExp(word, "i"), `the search panel still talks about ${word}`);
    }
  });

  it("SAYS SO ONCE, AND POINTS AT THE SECTION", () => {
    // Removing it entirely would be the opposite mistake: somebody planning a
    // heritage journey needs to know these tools work for them.
    assert.match(PROSE, /Planning a heritage journey\?/);
    assert.match(PROSE, /These booking tools work for that too/);
    assert.match(PROSE, /href="\/heritage"/);
    // ONCE, as a sentence and its link. A theme rather than a line is how it
    // got here the first time, so this counts rather than trusting the eye.
    const mentions = (PROSE.match(/heritage/gi) ?? []).length;
    assert.ok(mentions <= 3, `heritage is mentioned ${mentions} times on the general booking page`);
    assert.ok(mentions >= 1, "the heritage line has gone entirely");
  });

  it("opens on the destination, the dates and the kosher needs", () => {
    assert.match(BUILT_IN_WORDS.bookingNotice, /destination/i);
    assert.match(BUILT_IN_WORDS.bookingNotice, /dates/i);
    assert.match(BUILT_IN_WORDS.bookingNotice, /kosher/i);
    // Still the owner's line, or the settings screen has a field nothing reads.
    assert.match(PAGE, /\{words\.bookingNotice\}/);
  });
});

describe("getting to the fields", () => {
  it("PUTS THE SEARCH ABOVE THE PROSE", () => {
    // A headline, the owner's notice and a heritage aside used to sit above
    // the panel: three blocks of reading before anybody could type a city.
    const panel = PAGE.indexOf("<BookPartners");
    const notice = PAGE.indexOf("{words.bookingNotice}");
    const heritage = PAGE.indexOf("Planning a heritage journey?");
    assert.ok(panel > 0 && notice > 0 && heritage > 0);
    assert.ok(panel < notice, "the owner's notice is still above the search");
    assert.ok(panel < heritage, "the heritage line is still above the search");
  });

  it("keeps one short line of heading over it", () => {
    const beforePanel = PAGE.slice(PAGE.indexOf("<h1"), PAGE.indexOf("<BookPartners"));
    const paragraphs = beforePanel.match(/<p[\s>]/g) ?? [];
    assert.equal(paragraphs.length, 0, `${paragraphs.length} paragraphs still sit between the heading and the fields`);
  });
});

describe("hotels first", () => {
  it("OPENS ON HOTELS, not on flights", () => {
    // Accommodation is the one product this site knows something a comparison
    // site does not — which quarter makes Shabbos walkable — so it is the tab
    // that earns the visit.
    assert.match(PANEL, /useState<Kind>\("hotels"\)/);
    const tabs = PANEL.slice(PANEL.indexOf("What are you booking?"));
    const order = ["hotels", "flights", "cars"].map((kind) => tabs.indexOf(`setKind("${kind}")`));
    assert.ok(order[0] >= 0 && order[0] < order[1] && order[1] < order[2], "the tab order is not hotels, flights, cars");
  });

  it("puts hotels first in the cash-and-points comparison too", () => {
    const comparison = PAGE.slice(PAGE.indexOf("const COMPARISON"), PAGE.indexOf("const STEPS"));
    assert.ok(comparison.indexOf('"Hotels"') < comparison.indexOf('"Flights"'));
    assert.ok(comparison.indexOf('"Flights"') < comparison.indexOf('"Cars"'));
  });
});

describe("the commission disclosure", () => {
  it("HAS MOVED TO THE TERMS, on the owner's decision", () => {
    // It used to sit inside the search panel, under the tabs. The owner asked
    // for it off the booking page; see components/BookPartners.tsx, where the
    // ground being given up is written down rather than quietly dropped.
    assert.doesNotMatch(PANEL, /\{disclosure\}/);
    assert.match(readFileSync("app/terms/page.tsx", "utf8"), /<AffiliateDisclosure/);
  });

  it("says what it has to say", () => {
    assert.match(BUILT_IN_WORDS.affiliateDisclosure, /commission/i);
    assert.match(BUILT_IN_WORDS.affiliateDisclosure, /no additional cost/i);
  });

  it("is one editable line rather than a sentence typed into a component", () => {
    assert.doesNotMatch(PANEL_PROSE, /may earn a commission/i);
    assert.doesNotMatch(PROSE, /may earn a commission/i);
  });
});

describe("what is not bookable is named", () => {
  it("SAYS SO RATHER THAN OFFERING A TAB THAT CANNOT WORK", () => {
    // The brief names transfers and activities alongside hotels, flights and
    // cars. No programme is joined for either, and the registry refuses to
    // build a link without one — so they are a sentence each, with what to do
    // instead, rather than a form that takes somebody's dates and gives them
    // nothing.
    assert.match(PROSE, /Airport transfers/);
    assert.match(PROSE, /Things to do/);
    assert.match(PROSE, /We do not book transfers yet/);
    assert.match(PROSE, /We do not sell tickets yet/);
    // And each points somewhere that does help.
    assert.match(PROSE, /href="\/cars"/);
    assert.match(PROSE, /href="\/things-to-do"/);
  });
});
