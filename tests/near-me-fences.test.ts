import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { kosherAreas } from "@/data/kosher-stays";
import { kosherEateries } from "@/data/kosher-eateries";
import { notableShuls } from "@/data/notable-shuls";
import { parsePoint } from "@/data/near-me";
import { codeOf } from "./helpers/source";

// Comments stripped: both files EXPLAIN why there is no mikvah section, and
// naming the thing they refuse is not the same as doing it. See the helper.
const ROUTE = codeOf("app/api/near/route.ts");
const PANEL = codeOf("components/NearMyHotel.tsx");

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

  it("the hotel search is debounced rather than fired per keystroke", () => {
    assert.match(PANEL, /setTimeout\(async \(\) => \{/);
    assert.match(PANEL, /\}, 350\)/);
  });

  it("only a hotel with a position is offered, since the rest cannot be measured from", () => {
    assert.match(PANEL, /\.filter\(\(r: Hotel\) => r\.coordinates\)/);
  });

  it("it does not ask the browser for the visitor's location", () => {
    // Somebody plans this from home days ahead; their current position is the
    // answer to a different question, and the permission is not this page's
    // business.
    assert.doesNotMatch(PANEL, /geolocation/i);
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
