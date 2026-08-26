import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeOf } from "./helpers/source";
import { attractions } from "@/data/attractions";
import {
  attractionBySlug,
  attractionFacets,
  MAX_PAGE,
  PAGE,
  searchAttractionList,
  toAttractionCard,
} from "@/data/attraction-list";

const DIRECTORY = codeOf("components/AttractionDirectory.tsx");
const PAGE_SOURCE = codeOf("app/things-to-do/page.tsx");

/**
 * Two faults with one cause: the page held every attraction in the browser to
 * filter them there, and drew 24. It was the heaviest page on the site for
 * three per cent of what it carried — and a link to any of the rest landed on
 * a page that did not contain it.
 */

describe("a link to an entry reaches that entry", () => {
  it("/stops and the planner really do link to this page's anchors", () => {
    // If they stop doing that, the anchor machinery below is dead weight.
    const stops = codeOf("app/stops/page.tsx");
    assert.match(stops + DIRECTORY, /things-to-do#/);
  });

  it("an entry deep in the list can be fetched by its slug", () => {
    const deep = attractions[attractions.length - 1];
    const found = attractionBySlug(attractions, deep.slug);
    assert.equal(found?.slug, deep.slug);
    // And it is NOT on the first page, which is the whole reason this exists.
    const first = searchAttractionList(attractions, { limit: PAGE });
    assert.ok(!first.rows.some((r) => r.slug === deep.slug), "pick a deeper entry for this test");
  });

  it("a slug nobody has is null rather than a guess", () => {
    assert.equal(attractionBySlug(attractions, "not-a-place"), null);
    assert.equal(attractionBySlug(attractions, ""), null);
  });

  it("the page asks for the anchor it arrived with", () => {
    // A fragment never reaches the server, so this can only happen in the
    // browser, once.
    assert.match(DIRECTORY, /window\.location\.hash/);
    assert.match(DIRECTORY, /slug=\$\{encodeURIComponent\(slug\)\}/);
    assert.match(DIRECTORY, /scrollIntoView/);
  });

  it("it does not ask for an anchor that is already on the page", () => {
    assert.match(DIRECTORY, /initial\.some\(\(a\) => a\.slug === slug\)/);
  });

  it("and it never shows the same entry twice", () => {
    assert.match(DIRECTORY, /rows\.filter\(\(a\) => a\.slug !== anchored\.slug\)/);
  });
});

describe("the browser is sent what it draws", () => {
  it("the component is handed a page, not the collection", () => {
    assert.doesNotMatch(DIRECTORY, /getAttractionList|heritageAsAttractions/);
    assert.match(DIRECTORY, /initial: AttractionCard\[\]/);
  });

  it("the first page is rendered by the server, so arriving costs no request", () => {
    assert.match(PAGE_SOURCE, /searchAttractionList\(attractions, \{ limit: PAGE \}\)/);
    assert.match(PAGE_SOURCE, /initial=\{first\.rows\}/);
  });

  it("the source link stays on the server — the card never draws it", () => {
    const card = toAttractionCard(attractions[0]);
    assert.ok(!("sourceUrl" in card));
    assert.equal(card.summary, attractions[0].summary, "the card still carries what it draws");
  });
});

describe("the search finds what it always found", () => {
  it("uses the one matcher every list here shares", () => {
    const source = codeOf("data/attraction-list.ts");
    assert.match(source, /from "@\/lib\/list-search"/);
  });

  it("searches the notes and the alternate spellings", () => {
    assert.ok(searchAttractionList(attractions, { query: "colosseum" }).rows.length > 0);
  });

  it("filters by country, city and kind together", () => {
    const sample = attractions[0];
    const rows = searchAttractionList(attractions, { country: sample.country, city: sample.city, limit: MAX_PAGE }).rows;
    assert.ok(rows.length > 0);
    assert.ok(rows.every((r) => r.country === sample.country && r.city === sample.city));
  });

  it("offers each country's own cities, not every city on the site", () => {
    const facets = attractionFacets(attractions);
    const country = facets.countries[0];
    const its = facets.citiesByCountry[country];
    assert.ok(its.length > 0);
    assert.ok(its.length < facets.cities.length, "the narrowing is doing nothing");
    for (const city of its) {
      assert.ok(attractions.some((a) => a.country === country && a.city === city));
    }
  });
});

describe("paging is honest, and bounded", () => {
  it("says whether anything follows", () => {
    assert.equal(searchAttractionList(attractions, { limit: PAGE }).more, true);
    assert.equal(searchAttractionList(attractions, { query: "zzzznotathing" }).more, false);
  });

  it("an offset continues rather than repeating", () => {
    const one = searchAttractionList(attractions, { limit: PAGE });
    const two = searchAttractionList(attractions, { limit: PAGE, offset: PAGE });
    assert.deepEqual(two.rows.filter((r) => one.rows.some((f) => f.slug === r.slug)), []);
  });

  it("a crafted limit cannot pull the whole collection out through the endpoint", () => {
    assert.equal(searchAttractionList(attractions, { limit: 100_000 }).rows.length, MAX_PAGE);
  });

  it("an absent parameter is absent, not zero", () => {
    // Number(null) is 0, which reads as a valid limit and collapses the page
    // to a single row. It shipped once on the kosher endpoint.
    const ROUTE = codeOf("app/api/things-to-do/list/route.ts");
    assert.match(ROUTE, /if \(raw === null \|\| raw\.trim\(\) === ""\) return undefined;/);
  });
});

describe("a search over the network has failure modes a filter did not", () => {
  it("a slow answer cannot overwrite a newer one", () => {
    assert.match(DIRECTORY, /const asked = useRef\(0\)/);
    assert.match(DIRECTORY, /if \(mine !== asked\.current\) return;/);
  });

  it("typing is settled before it is sent, and mounting re-asks nothing", () => {
    assert.match(DIRECTORY, /const SETTLE_MS =/);
    assert.match(DIRECTORY, /const mounted = useRef\(false\)/);
  });

  it("an unreachable search says so, rather than leaving the old list sitting there", () => {
    // Tracked but never rendered on the first pass: a failed search left the
    // previous results on screen with nothing to explain them.
    assert.match(DIRECTORY, /could not be reached/);
    assert.match(DIRECTORY, /empty=\{visible\.length === 0 && !busy && !failed\}/);
  });
});
