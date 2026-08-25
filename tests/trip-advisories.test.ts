import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Advisory } from "@/lib/travel-advisories";
import type { StopFacts } from "@/lib/command-center";
import { summarise, toneFor, tripAdvisories, worthLeadingWith } from "@/lib/trip-advisories";

/**
 * What is being said about the countries a trip actually goes to.
 *
 * The advisory already showed on a beis hachaim's own page, one country at a
 * time — which answers "what about Ukraine" for somebody who happens to open
 * the Ukraine page, and never answered the question a person with a trip has.
 *
 * These tests are mostly about the same thing: that the screen says what it
 * does NOT know. Three countries listed as fine while a fourth was never
 * checked reads as a clean bill of health, and here that is a sentence about
 * somebody's safety rather than about a phone number.
 */

const stop = (over: Partial<StopFacts> = {}): StopFacts =>
  ({ id: "s1", name: "Lizhensk", contacts: [], isKever: true, ...over }) as StopFacts;

const advisory = (country: string, level: number | null): Advisory => ({
  country,
  level,
  levelLabel: level ? `Level ${level}` : "",
  summary: `About ${country}.`,
  updated: "2026-05-01T00:00:00.000Z",
});

const FEED = [advisory("Poland", 1), advisory("Ukraine", 4), advisory("France", 2)];

describe("the countries a trip touches", () => {
  it("counts each country once, with how many stops are in it", () => {
    const roll = tripAdvisories(
      [stop({ id: "a", country: "Poland" }), stop({ id: "b", country: "Poland" }), stop({ id: "c", country: "Ukraine" })],
      FEED,
    );
    assert.deepEqual(
      roll.countries.map((entry) => [entry.country, entry.stops]),
      [["Ukraine", 1], ["Poland", 2]],
    );
  });

  it("treats one country spelled two ways as one country", () => {
    const roll = tripAdvisories([stop({ id: "a", country: "poland" }), stop({ id: "b", country: "Poland" })], FEED);
    assert.equal(roll.countries.length, 1);
    assert.equal(roll.countries[0].stops, 2);
    // Shown with the spelling the trip used, not lowercased back at them.
    assert.equal(roll.countries[0].country, "poland");
  });

  it("puts the worst first, so the thing worth reading is not buried", () => {
    const roll = tripAdvisories(
      [stop({ id: "a", country: "Poland" }), stop({ id: "b", country: "France" }), stop({ id: "c", country: "Ukraine" })],
      FEED,
    );
    assert.deepEqual(roll.countries.map((entry) => entry.country), ["Ukraine", "France", "Poland"]);
    assert.equal(roll.highest, 4);
  });

  it("sorts a country nobody could look up BELOW a known level, not above", () => {
    // It is neither a reassurance nor a warning. At the top it would make
    // every trip with an unusual country look alarming, and people stop
    // reading a screen that cries wolf.
    const roll = tripAdvisories([stop({ id: "a", country: "Poland" }), stop({ id: "b", country: "Narnia" })], FEED);
    assert.deepEqual(roll.countries.map((entry) => entry.country), ["Poland", "Narnia"]);
  });
});

describe("what it does not know, it says", () => {
  it("counts stops carrying no country rather than dropping them", () => {
    // THE FAILURE THIS PREVENTS. A stop with no country silently ignored means
    // a trip shows three countries as fine while a fourth place was never
    // looked at, and the list reads as "all clear".
    const roll = tripAdvisories([stop({ id: "a", country: "Poland" }), stop({ id: "b" }), stop({ id: "c", country: "  " })], FEED);
    assert.equal(roll.stopsWithNoCountry, 2);
    assert.match(summarise(roll), /2 stops have no country on them/);
    assert.match(summarise(roll), /not the whole trip/);
  });

  it("says it as what the SOURCE published, never as what we hold", () => {
    // "No advisory on record" describes our filing cabinet rather than the
    // place, which is not the traveller's question — and is the internal-status
    // wording tests/customer-copy.test.ts exists to keep off the site. That
    // guard caught this copy before it shipped.
    const roll = tripAdvisories([stop({ id: "a", country: "Poland" }), stop({ id: "b", country: "Narnia" })], FEED);
    assert.doesNotMatch(summarise(roll), /on record/i);
    assert.doesNotMatch(readFileSync("components/TripAdvisories.tsx", "utf8"), /on record/i);
  });

  it("names a country the feed does not carry", () => {
    const roll = tripAdvisories([stop({ id: "a", country: "Narnia" })], FEED);
    assert.equal(roll.countries[0].advisory, null);
    assert.equal(roll.anyUnknown, true);
    assert.match(summarise(roll), /could not be looked up|no published advisory/);
  });

  it("does not claim a clean trip when half of it was never checked", () => {
    const roll = tripAdvisories([stop({ id: "a", country: "Poland" }), stop({ id: "b", country: "Narnia" })], FEED);
    const said = summarise(roll);
    assert.match(said, /1 country has no published advisory/);
    assert.match(said, /not the whole trip/);
  });

  it("says nothing at all rather than something reassuring when there are no stops", () => {
    assert.equal(summarise(tripAdvisories([], FEED)), "No stops on this trip yet.");
  });

  it("reports no level when nothing on the trip could be looked up", () => {
    const roll = tripAdvisories([stop({ id: "a", country: "Narnia" })], FEED);
    assert.equal(roll.highest, null);
  });
});

describe("how it is drawn", () => {
  it("leads with a level worth leading with, and not with an ordinary one", () => {
    assert.equal(worthLeadingWith(4), true);
    assert.equal(worthLeadingWith(3), true);
    assert.equal(worthLeadingWith(2), false);
    assert.equal(worthLeadingWith(null), false);
  });

  it("has a tone for every level and a neutral one for an unknown", () => {
    assert.equal(toneFor(1), "ok");
    assert.equal(toneFor(4), "danger");
    assert.equal(toneFor(null), "unknown");
  });
});

describe("the screen", () => {
  const PANEL = readFileSync("components/TripAdvisories.tsx", "utf8");
  const PAGE = readFileSync("app/command-center/page.tsx", "utf8");

  it("says so when the feed could not be read, rather than showing an empty list", () => {
    // An empty list reads as "nothing to report" when it means "nobody could
    // check", which on this subject is the worst way to be wrong.
    assert.match(PANEL, /could not be read just now/);
    assert.match(PAGE, /unavailable=\{feed\.available \? undefined : feed\.reason\}/);
  });

  it("credits the State Department and does not reword them", () => {
    assert.match(PANEL, /ADVISORY_SOURCE_URL/);
    assert.match(PANEL, /does not add to them or take anything away/);
    // The level label and summary come from the advisory itself.
    assert.match(PANEL, /entry\.advisory\.summary/);
  });

  it("draws nothing when the trip has no stops at all", () => {
    assert.match(PANEL, /if \(!roll\.countries\.length && !roll\.stopsWithNoCountry\) return null;/);
  });

  it("fetches once, on the server, and the page is what fetches", () => {
    assert.match(PAGE, /const feed = await fetchAdvisories\(\)/);
    assert.doesNotMatch(PANEL, /fetch\(/, "the panel is a server component and must not fetch");
  });
});

describe("a stop knows which country it is in", () => {
  const DATA = readFileSync("lib/command-center-data.ts", "utf8");

  it("takes the itinerary's country first, and the record's second", () => {
    // Somebody who typed a country onto their own stop meant it. A built-in
    // record is the fallback, not the override.
    assert.match(DATA, /activity\.country\?\.trim\(\) \|\| record\.country/);
  });
});
