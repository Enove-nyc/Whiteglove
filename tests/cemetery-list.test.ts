import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeOf } from "./helpers/source";
import {
  cemeteryCountries,
  isOrder,
  MAX_PAGE,
  PAGE,
  searchCemeteryList,
  townKey,
  type HeritageEntry,
} from "@/data/cemetery-list";
import type { CemeteryListItem } from "@/lib/cemeteries-view";

const DIRECTORY = codeOf("components/CemeteryDirectory.tsx");
const PAGE_SOURCE = codeOf("app/cemeteries/page.tsx");

/**
 * The page shipped both sets to the browser to search and merge them there —
 * 242 guides carrying every name buried in each, and 1,952 located grounds,
 * 576KB of JSON — to draw cards showing a town and a country.
 *
 * The rules did not change, they moved. These pin the ones that would be
 * quietly lost in the move.
 */

const guide = (over: Partial<CemeteryListItem> = {}): CemeteryListItem =>
  ({
    slug: "lizhensk",
    city: "Leżajsk",
    yiddishCity: "ליזשענסק",
    name: "Leżajsk Jewish cemetery",
    yiddishName: "ליזשענסק",
    country: "Poland",
    burialCount: 3,
    burials: ["Rebbe Elimelech of Lizhensk"],
    ownerAdded: false,
    ...over,
  }) as CemeteryListItem;

const located = (over: Partial<HeritageEntry> = {}): HeritageEntry => ({
  slug: "kalisz-nowy-swiat",
  city: "Kalisz",
  country: "Poland",
  address: "Nowy Świat",
  ...over,
});

describe("the located set joins only once the list is narrowed", () => {
  const sets = { guides: [guide()], heritage: [located()] };

  it("stays out of the default view — two thousand of them would bury the guides", () => {
    const out = searchCemeteryList(sets, {});
    assert.equal(out.narrowed, false);
    assert.ok(out.rows.every((r) => r.kind === "guide"));
  });

  it("joins when a town is searched", () => {
    const out = searchCemeteryList(sets, { query: "Kalisz" });
    assert.equal(out.narrowed, true);
    assert.ok(out.rows.some((r) => r.kind === "located"));
  });

  it("joins when a country is chosen", () => {
    assert.equal(searchCemeteryList(sets, { country: "Poland" }).narrowed, true);
  });
});

describe("a town is not listed twice", () => {
  it("a located ground in a town that has its own guide is dropped", () => {
    // The guide is the same place said properly. Listing the town again
    // underneath it as a bare "Location" was the doubling this page showed.
    const sets = {
      guides: [guide({ city: "Aleksandrów Łódzki (Aleksander)" })],
      heritage: [located({ slug: "aleksandrow", city: "Aleksandrów Łódzki", address: undefined })],
    };
    const rows = searchCemeteryList(sets, { country: "Poland" }).rows;
    assert.equal(rows.filter((r) => r.kind === "located").length, 0);
  });

  it("and the town matching survives the alias and the diacritics", () => {
    assert.equal(townKey("Aleksandrów Łódzki (Aleksander)", "Poland"), townKey("Aleksandrów Łódzki", "Poland"));
    assert.equal(townKey("Kraków", "Poland"), "krakow|poland");
    assert.notEqual(townKey("Kalisz", "Poland"), townKey("Kalisz", "Ukraine"));
  });
});

describe("the search and the orders came across intact", () => {
  it("finds a town by a spelling nobody agrees on", () => {
    // "Lezajsk" and "Leżajsk" have to find what "Lizhensk" finds.
    for (const spelling of ["Lezajsk", "Leżajsk", "Lizhensk"]) {
      const rows = searchCemeteryList({ guides: [guide()], heritage: [] }, { query: spelling }).rows;
      assert.equal(rows.length, 1, `${spelling} found nothing`);
    }
  });

  it("finds a ground by who is buried there — which the browser is no longer sent", () => {
    const rows = searchCemeteryList({ guides: [guide()], heritage: [] }, { query: "Elimelech" }).rows;
    assert.equal(rows.length, 1);
    assert.ok(!("burials" in rows[0]), "the burial list is being sent to the browser again");
  });

  it("orders by most kevarim, which needs a count the browser is no longer sent", () => {
    const sets = {
      guides: [guide({ slug: "a", city: "Aville", burialCount: 1 }), guide({ slug: "b", city: "Bville", burialCount: 9 })],
      heritage: [],
    };
    const rows = searchCemeteryList(sets, { order: "kevarim" }).rows;
    assert.deepEqual(rows.map((r) => r.slug), ["b", "a"]);
    assert.ok(!("burialCount" in rows[0]));
  });

  it("a ground with nobody named yet sorts last under 'by tzaddik', not first", () => {
    const sets = {
      guides: [guide({ slug: "empty", burials: [] }), guide({ slug: "named", burials: ["Aaron"] })],
      heritage: [],
    };
    assert.deepEqual(searchCemeteryList(sets, { order: "tzaddik" }).rows.map((r) => r.slug), ["named", "empty"]);
  });

  it("an order nobody offers falls back to town rather than throwing", () => {
    assert.equal(isOrder("kevarim"), true);
    assert.equal(isOrder("whatever"), false);
    assert.ok(searchCemeteryList({ guides: [guide()], heritage: [] }, { order: "whatever" as never }).rows.length === 1);
  });

  it("the dropdown reaches every country either set knows", () => {
    const countries = cemeteryCountries({
      guides: [guide({ country: "Poland" })],
      heritage: [located({ country: "Ukraine" })],
    });
    assert.deepEqual(countries, ["Poland", "Ukraine"]);
  });
});

describe("the browser is sent what it draws", () => {
  it("the component is handed a page, not the collections", () => {
    assert.doesNotMatch(DIRECTORY, /getPublicCemeteryList|listAllHeritageCemeteries/);
    assert.match(DIRECTORY, /initial: CemeteryRow\[\]/);
  });

  it("the first page is chosen by the server", () => {
    assert.match(PAGE_SOURCE, /searchCemeteryList\(\{ guides: cemeteries, heritage \}/);
    assert.match(PAGE_SOURCE, /initial=\{first\.rows\}/);
  });

  it("the list is paged, and reachable past the first page", () => {
    // It used to draw every guide it had, so nothing needed a button.
    assert.match(DIRECTORY, /\{more && \(/);
    assert.match(DIRECTORY, /Show more/);
  });

  it("a crafted limit cannot pull the whole collection out through the endpoint", () => {
    const sets = { guides: Array.from({ length: 300 }, (_, i) => guide({ slug: `g${i}` })), heritage: [] };
    assert.equal(searchCemeteryList(sets, { limit: 100_000 }).rows.length, MAX_PAGE);
    assert.equal(searchCemeteryList(sets, {}).rows.length, PAGE);
  });

  it("an absent parameter is absent, not zero", () => {
    const ROUTE = codeOf("app/api/cemeteries/list/route.ts");
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

  it("an unreachable search says so rather than reading as an empty directory", () => {
    assert.match(DIRECTORY, /could not be reached/);
    assert.match(DIRECTORY, /empty=\{rows\.length === 0 && !busy && !failed\}/);
  });
});
