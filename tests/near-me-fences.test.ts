import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { kosherAreas } from "@/data/kosher-stays";
import { kosherEateries } from "@/data/kosher-eateries";
import { notableShuls } from "@/data/notable-shuls";
import { DRIVING_RANGES, nearest, parsePoint, RANGES, rangesFor } from "@/data/near-me";
import { codeOf } from "./helpers/source";

// Comments stripped: both files EXPLAIN why there is no mikvah section, and
// naming the thing they refuse is not the same as doing it. See the helper.
const ROUTE = codeOf("app/api/near/route.ts");
const PANEL = codeOf("components/NearbyExplorer.tsx");
const WHERE = codeOf("app/api/near/where/route.ts");

describe("what this page may claim is what the data can support", () => {
  it("every Jewish quarter has a position — the anchor the page leans on", () => {
    const without = kosherAreas.filter((area) => !parsePoint(area.coordinates));
    assert.deepEqual(without.map((a) => a.name), [], "a quarter with no coordinates breaks the main answer");
  });

  it("the notable shuls all have one too", () => {
    const without = notableShuls.filter((shul) => !parsePoint(shul.coordinates));
    assert.deepEqual(without.map((s) => s.name), []);
  });

  it("says nothing at all about mikvaos, because not one has coordinates", () => {
    // Returning an empty mikvah list would read as "there are none near you",
    // which is a different and untrue statement.
    assert.doesNotMatch(ROUTE, /mikva/i);
    assert.doesNotMatch(PANEL, /mikva/i);
  });

  it("the food listings really are too sparse to sort by distance", () => {
    // The reason the quarter leads instead of a restaurant. If this ever
    // stops being true, the page is worth rethinking — and this test says so
    // by failing.
    const withCoordinates = kosherEateries.filter((e) => parsePoint((e as { coordinates?: string }).coordinates));
    const share = withCoordinates.length / kosherEateries.length;
    assert.ok(share < 0.25, `${Math.round(share * 100)}% of food listings now have coordinates — reconsider the design`);
  });
});

describe("the expensive call is the hotel lookup, and only that", () => {
  it("measuring what is nearby touches no external service", () => {
    assert.doesNotMatch(ROUTE, /fetch\(|googleapis|apiKey/);
  });

  it("but it is still rate limited — it walks four datasets per call", () => {
    assert.match(ROUTE, /rateLimit\(`near:\$\{requesterKey\(request\.headers\)\}`, LIMIT\)/);
  });

  it("searching for somewhere to measure from touches no metered key either", () => {
    // The site's own anchors are files in the bundle and OpenStreetMap is
    // free. That is why this one may run while somebody types.
    assert.doesNotMatch(WHERE, /googleapis|apiKey|GOOGLE_/);
    assert.match(WHERE, /rateLimit\(`near-where:/);
  });

  it("the typing search is debounced rather than fired per keystroke", () => {
    // useDebouncedSearch owns the timer now, and keeps the question with the
    // answer so the box never shows the previous query's rows.
    assert.match(PANEL, /useDebouncedSearch<NearAnchor>/);
    assert.match(PANEL, /delayMs: 300/);
  });

  it("the metered hotel lookup is only reachable by a press", () => {
    // It used to run on every keystroke because it was the only way in. Now
    // it sits under the free results as a button, and nothing calls it until
    // somebody presses it.
    assert.match(PANEL, /onClick=\{\(\) => void findHotel\(typed\)\}/);
    // The debounced search — the one that runs while somebody types — asks
    // the free endpoint, and the metered one is named exactly once, inside
    // the handler.
    const whileTyping = PANEL.slice(PANEL.indexOf("async function searchAnchors"), PANEL.indexOf("function Card"));
    assert.match(whileTyping, /\/api\/near\/where/);
    assert.doesNotMatch(whileTyping, /places-search/);
    const mentions = [...PANEL.matchAll(/places-search/g)];
    assert.equal(mentions.length, 1);
    assert.ok((mentions[0].index ?? 0) > PANEL.indexOf("async function findHotel"));
  });

  it("only a hotel with a position is offered, since the rest cannot be measured from", () => {
    assert.match(PANEL, /\.filter\(\(r\) => r\.coordinates\)/);
  });

  it("never asks the browser for a location on its own", () => {
    // Somebody plans this from home days ahead; their current position is the
    // answer to a different question. So it is offered as one door of three,
    // asked for only inside the handler of the button that says so, and the
    // page answers perfectly well when the permission is refused.
    const asks = [...PANEL.matchAll(/geolocation/g)];
    assert.ok(asks.length > 0, "the option is gone rather than optional");
    assert.doesNotMatch(PANEL, /useEffect\([\s\S]*?geolocation/);
    assert.match(PANEL, /function useMyLocation\(\)/);
    assert.match(PANEL, /type a city, an airport or a landmark instead/);
  });
});

describe("an airport is the same question with a different ruler", () => {
  it("measures further from one, because nobody walks out of an airport", () => {
    assert.ok(DRIVING_RANGES.shul > RANGES.shul);
    assert.ok(DRIVING_RANGES.food > RANGES.food);
    assert.ok(DRIVING_RANGES.thingToDo > RANGES.thingToDo);
    assert.ok(DRIVING_RANGES.quarter > RANGES.quarter);
  });

  it("reaches what is actually near JFK, which the walking ruler did not", () => {
    // The nearest listed shul is 23km from the terminal and Manhattan is 21.
    // On the walking ranges this page told somebody standing in arrivals that
    // nothing on the site was close enough, which is the wrong ruler rather
    // than a true answer.
    const jfk = parsePoint("40.6413, -73.7781");
    assert.ok(jfk);
    const onFoot = nearest(jfk, notableShuls, { coordinatesOf: (s) => s.coordinates, within: RANGES.shul, limit: 5 });
    const driving = nearest(jfk, notableShuls, { coordinatesOf: (s) => s.coordinates, within: DRIVING_RANGES.shul, limit: 5 });
    assert.equal(onFoot.length, 0);
    assert.ok(driving.length > 0, "widening the ranges still finds nothing near JFK");
  });

  it("falls back to walking for anything else, including a parameter nobody recognises", () => {
    assert.equal(rangesFor("drive"), DRIVING_RANGES);
    assert.equal(rangesFor("walk"), RANGES);
    assert.equal(rangesFor("teleport"), RANGES);
    assert.equal(rangesFor(null), RANGES);
  });

  it("the page asks for the wider ruler only from an airport", () => {
    assert.match(PANEL, /from\.kind === "airport" \? "drive" : "walk"/);
  });
});

describe("a distance is offered as a guide, not as a route", () => {
  it("the caution is on the page, once", () => {
    assert.match(PANEL, /Treat them as a guide, not/);
    assert.match(PANEL, /more time than this before Shabbos/);
  });

  it("an empty section is hidden rather than shown empty", () => {
    assert.match(PANEL, /if \(items\.length === 0\) return null/);
  });
});

describe("it can be found", () => {
  it("is in the kosher nav and the sitemap", () => {
    assert.match(readFileSync("lib/navigation.ts", "utf8"), /href: "\/near"/);
    assert.match(readFileSync("lib/site-map.ts", "utf8"), /path: "\/near"/);
  });

  it("is public, and indexable", () => {
    const page = readFileSync("app/near/page.tsx", "utf8");
    assert.doesNotMatch(page, /requireSignedIn|noIndex/);
  });
});
