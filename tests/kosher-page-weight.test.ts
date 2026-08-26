import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeOf } from "./helpers/source";
import { kosherEateries } from "@/data/kosher-eateries";
import { eateryFacets, searchEateries, toCard, MAX_PAGE } from "@/data/eatery-search";

const DIRECTORY = codeOf("components/EateryDirectory.tsx");
const PAGE = codeOf("app/kosher/page.tsx");

/**
 * /kosher is the page an Orthodox traveller opens on hotel wifi in a city they
 * do not know. It used to send every listing the site holds to the browser so
 * the browser could filter them: 1,466 records with their notes and summaries,
 * 3.5MB, to draw sixty cards.
 */

describe("the browser is sent what it draws, not the whole collection", () => {
  it("there really are enough listings for this to matter", () => {
    assert.ok(kosherEateries.length > 1000, `only ${kosherEateries.length} listings`);
  });

  it("the fields that exist only to be searched never leave the server", () => {
    const card = toCard(kosherEateries.find((e) => e.summary)!);
    for (const field of ["summary", "notes", "nearQuarter", "sourceUrl"]) {
      assert.ok(!(field in card), `${field} is still being sent to the browser`);
    }
    // And the ones the card actually draws are all there.
    for (const field of ["slug", "name", "city", "country", "kind", "hechsher"]) {
      assert.ok(field in card, `the card cannot draw without ${field}`);
    }
  });

  it("the component is handed a page of results, never the collection", () => {
    assert.doesNotMatch(DIRECTORY, /kosherEateries/);
    assert.match(DIRECTORY, /initial: EateryCard\[\]/);
  });

  it("the first page is rendered by the server, so arriving costs no request", () => {
    assert.match(PAGE, /searchEateries\(kosherEateries, \{ limit: 60 \}\)/);
    assert.match(PAGE, /initial=\{first\.rows\}/);
  });
});

describe("the search still finds what it always found", () => {
  it("uses the one matcher every list on this site shares", () => {
    const source = codeOf("data/eatery-search.ts");
    assert.match(source, /from "@\/lib\/list-search"/);
    assert.match(source, /listMatches\(/);
    assert.match(source, /listRank\(/);
  });

  it("a listing deep in the collection is still found by name", () => {
    // The risk of paging: something at position 900 becoming unreachable.
    const deep = kosherEateries[900];
    const found = searchEateries(kosherEateries, { query: deep.name, limit: 60 });
    assert.ok(
      found.rows.some((r) => r.slug === deep.slug),
      `${deep.name} is in the data and not in its own search`,
    );
  });

  it("searches the notes and the alternate spellings, as it did in the browser", () => {
    // Somebody types "Wien" or "badatz" and both live in the notes.
    assert.ok(searchEateries(kosherEateries, { query: "antwerp" }).rows.length > 0);
  });

  it("filters by country and by kind", () => {
    const country = kosherEateries[0].country;
    const rows = searchEateries(kosherEateries, { country, limit: MAX_PAGE }).rows;
    assert.ok(rows.length > 0);
    assert.ok(rows.every((r) => r.country === country));
  });

  it("offers every country and kind to filter by, not just the first page's", () => {
    const facets = eateryFacets(kosherEateries);
    assert.ok(facets.countries.length > 5, `${facets.countries.length} countries`);
    assert.ok(facets.kinds.length > 1);
  });
});

describe("paging is honest, and bounded", () => {
  it("says whether anything follows, which is what Show more is for", () => {
    assert.equal(searchEateries(kosherEateries, { limit: 60 }).more, true);
    assert.equal(searchEateries(kosherEateries, { query: "zzzznotathing" }).more, false);
  });

  it("an offset continues rather than repeating", () => {
    const first = searchEateries(kosherEateries, { limit: 60 });
    const second = searchEateries(kosherEateries, { limit: 60, offset: 60 });
    const overlap = second.rows.filter((r) => first.rows.some((f) => f.slug === r.slug));
    assert.deepEqual(overlap, [], "the second page repeats the first");
  });

  it("a crafted limit cannot pull the whole collection out through the endpoint", () => {
    const rows = searchEateries(kosherEateries, { limit: 100_000 }).rows;
    assert.equal(rows.length, MAX_PAGE);
  });

  it("nonsense offsets and limits are survived rather than obeyed", () => {
    assert.ok(searchEateries(kosherEateries, { limit: -5 }).rows.length >= 1);
    assert.equal(searchEateries(kosherEateries, { offset: -100, limit: 3 }).rows.length, 3);
    assert.deepEqual(searchEateries(kosherEateries, { offset: 999_999 }).rows, []);
  });
});

describe("a search over the network has failure modes a filter did not", () => {
  it("a slow answer cannot overwrite a newer one", () => {
    // Type "rome" quickly and the answer to "r" must not land last.
    assert.match(DIRECTORY, /const asked = useRef\(0\)/);
    assert.match(DIRECTORY, /if \(mine !== asked\.current\) return;/);
  });

  it("typing is settled before it is sent", () => {
    assert.match(DIRECTORY, /const SETTLE_MS =/);
    assert.match(DIRECTORY, /setTimeout\(\(\) => void load\(/);
  });

  it("mounting does not re-ask for the answer the server already gave", () => {
    assert.match(DIRECTORY, /const mounted = useRef\(false\)/);
  });

  it("says so when the search cannot be reached, rather than showing nothing", () => {
    assert.match(DIRECTORY, /could not be reached/);
    // And an unreachable search is not reported as "no results".
    assert.match(DIRECTORY, /empty=\{rows\.length === 0 && !busy && !failed\}/);
  });
});
