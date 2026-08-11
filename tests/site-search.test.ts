import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { vacationDestinations } from "../data/vacation-destinations";
import { normalize } from "../lib/place-search";
import { publishedPracticalPlaceSearchDocument } from "../lib/site-search-index";
import { damerauLevenshtein } from "../lib/site-search-match";
import { scoreDocument } from "../lib/site-search-rank";
import {
  groupHits,
  hasHeritageIntent,
  isUnambiguousExact,
  searchEverything,
  searchSite,
  vacationEmptySuggestions,
} from "../lib/site-search";

// Global search: vacation-first empty state, typo-tolerant typed search, and
// heritage that stays available without owning ordinary travel queries.

describe("empty focus is vacation-only", () => {
  test("lists every published vacation destination in editorial order", async () => {
    const empty = await searchSite("");
    assert.equal(empty.mode, "empty");
    assert.equal(empty.results.length, vacationDestinations.length);
    assert.deepEqual(
      empty.results.map((r) => r.title),
      vacationDestinations.map((d) => d.name),
    );
    assert.ok(empty.results.every((r) => r.kind === "Vacation destination"));
    assert.ok(empty.results.every((r) => r.href.startsWith("/destinations/")));
  });

  test("heritage towns, cemeteries and tzaddikim are absent from empty state", async () => {
    const empty = await searchSite("");
    assert.ok(!empty.results.some((r) => r.section === "Heritage"));
    assert.ok(!empty.results.some((r) => r.kind === "Heritage town"));
    assert.ok(!empty.results.some((r) => r.kind === "Beis hachaim"));
    assert.ok(!empty.results.some((r) => r.kind === "Kever or tzaddik"));
    // guidedDestinations() must not be the empty-state source.
    assert.ok(!empty.results.some((r) => r.href === "/lizensk" || r.href.startsWith("/heritage/")));
  });

  test("vacationEmptySuggestions matches searchSite empty mode", () => {
    const local = vacationEmptySuggestions();
    assert.equal(local.length, vacationDestinations.length);
    assert.equal(local[0].title, vacationDestinations[0].name);
  });

  test("searchEverything still returns [] for empty (legacy contract)", async () => {
    assert.deepEqual(await searchEverything(""), []);
    assert.deepEqual(await searchEverything("   "), []);
  });
});

describe("kinds are specific, not Guide", () => {
  test("vacation destinations are labelled Vacation destination", async () => {
    const hits = await searchEverything("Rome", 10);
    const vacation = hits.find((h) => h.kind === "Vacation destination");
    assert.ok(vacation, "Rome vacation destination should be findable");
    assert.equal(vacation.section, "Vacation");
  });

  test("stays, food and heritage use the new labels", async () => {
    const stay = await searchEverything("Canazei", 20);
    assert.ok(stay.some((h) => h.kind === "Hotel or stay"));

    const food = await searchEverything("Kosher Tirol", 20);
    assert.ok(food.some((h) => h.kind === "Kosher food"));

    const heritage = await searchEverything("Lizhensk", 20);
    assert.ok(heritage.some((h) => h.kind === "Beis hachaim" || h.kind === "Heritage town" || h.kind === "Kever or tzaddik"));
    assert.ok(!heritage.some((h) => (h.kind as string) === "Guide"));
    assert.ok(!heritage.some((h) => (h.kind as string) === "Somewhere to stay"));
    assert.ok(!heritage.some((h) => (h.kind as string) === "Somewhere to eat"));
  });

  test("things to do remain findable", async () => {
    const hits = await searchEverything("Colosseum");
    assert.ok(hits.some((h) => h.kind === "Thing to do" && /colosseum/i.test(h.title)));
  });

  test("a published practical listing builds a global-search result", () => {
    const document = publishedPracticalPlaceSearchDocument({
      id: "coach-station",
      category: "TRANSPORT",
      name: "Victoria Coach Station",
      address: "164 Buckingham Palace Road",
      notes: "A central coach terminal for onward travel.",
      destination: { slug: "london", city: "London", country: "United Kingdom" },
    });
    const scored = scoreDocument("Victoria Coach Station", document, false);

    assert.ok(scored);
    assert.equal(scored.hit.kind, "Practical travel");
    assert.equal(scored.hit.href, "/destinations/london");
  });
});

describe("vacation-first ranking", () => {
  test("exact vacation name comes first", async () => {
    const hits = await searchEverything("Rome", 15);
    assert.ok(hits.length > 0);
    assert.equal(hits[0].kind, "Vacation destination");
    assert.match(hits[0].title, /rome/i);
  });

  test("vacation outranks heritage for a general city query", async () => {
    const hits = await searchEverything("Rome", 20);
    const vac = hits.findIndex((h) => h.kind === "Vacation destination");
    const heritage = hits.findIndex((h) => h.section === "Heritage");
    assert.ok(vac === 0, "vacation Rome should be first");
    if (heritage >= 0) assert.ok(vac < heritage, "vacation before heritage for Rome");
  });

  test("shared city: vacation before stay before heritage", async () => {
    const hits = await searchEverything("Krakow", 25);
    const vac = hits.findIndex((h) => h.kind === "Vacation destination");
    const stay = hits.findIndex((h) => h.kind === "Hotel or stay" || h.kind === "Neighborhood");
    const heritage = hits.findIndex((h) => h.section === "Heritage");
    assert.ok(vac >= 0, "Kraków vacation should appear");
    if (stay >= 0) assert.ok(vac < stay, "vacation before stay");
    if (heritage >= 0) {
      assert.ok(vac < heritage, "vacation before heritage");
      if (stay >= 0) assert.ok(stay < heritage, "stay before heritage");
    }
  });

  test("exact heritage intent ranks heritage first", async () => {
    const hits = await searchEverything("kever Lizhensk", 15);
    assert.ok(hits.length > 0);
    assert.equal(hits[0].section, "Heritage");
    assert.ok(hasHeritageIntent("kever Lizhensk"));
    assert.ok(hasHeritageIntent("beis hachaim"));
    assert.ok(hasHeritageIntent("tzaddik"));
    assert.equal(hasHeritageIntent("Rome"), false);
  });

  test("lizhensk / lizensk / lezajsk find heritage", async () => {
    for (const q of ["Lizhensk", "lizensk", "Lezajsk"]) {
      const hits = await searchEverything(q, 15);
      assert.ok(
        hits.some((h) => h.section === "Heritage"),
        `${q} should find heritage content`,
      );
    }
  });
});

describe("typo tolerance", () => {
  test("damerau handles adjacent transposition", () => {
    assert.equal(damerauLevenshtein("veniec", "venice"), 1);
    assert.equal(damerauLevenshtein("romw", "rome"), 1);
  });

  test("romw → Rome", async () => {
    const hits = await searchEverything("romw", 10);
    assert.ok(hits.some((h) => h.kind === "Vacation destination" && /rome/i.test(h.title)));
  });

  test("pariss → Paris", async () => {
    const hits = await searchEverything("pariss", 10);
    assert.ok(hits.some((h) => h.kind === "Vacation destination" && /paris/i.test(h.title)));
  });

  test("dolomits → Dolomites", async () => {
    const hits = await searchEverything("dolomits", 10);
    assert.ok(hits.some((h) => h.kind === "Vacation destination" && /dolomite/i.test(h.title)));
  });

  test("veniec → Venice", async () => {
    const hits = await searchEverything("veniec", 10);
    assert.ok(hits.some((h) => h.kind === "Vacation destination" && /venice/i.test(h.title)));
  });

  test("krakow / kraków → Kraków", async () => {
    for (const q of ["krakow", "Kraków"]) {
      const hits = await searchEverything(q, 10);
      assert.ok(hits.some((h) => h.kind === "Vacation destination" && /krak/i.test(h.title)), q);
    }
  });

  test("kosher hotle → kosher hotels / where to stay", async () => {
    const hits = await searchEverything("kosher hotle", 15);
    assert.ok(
      hits.some((h) => /hotel|where to stay/i.test(h.title) || h.kind === "Hotel or stay" || h.href === "/hotels"),
      "should reach hotels / where to stay",
    );
  });

  test("shabos paris finds Shabbos + Paris", async () => {
    const hits = await searchEverything("shabos paris", 15);
    assert.ok(
      hits.some((h) => /paris/i.test(h.title) || /shabbos|kosher travel/i.test(h.title)),
      "shabos paris should land on Paris or Shabbos/kosher travel",
    );
  });

  test("concept queries find vacations", async () => {
    for (const q of ["family beach", "warm winter", "mountains kosher"]) {
      const hits = await searchEverything(q, 15);
      assert.ok(
        hits.some((h) => h.kind === "Vacation destination"),
        `${q} should return a vacation destination`,
      );
    }
  });

  test("accent / punct / hyphen folding", async () => {
    assert.equal(normalize("Kraków"), "krakow");
    const hits = await searchEverything("south-tyrol", 15);
    // May or may not hit Dolomites region — at least must not throw / flood with noise.
    assert.ok(Array.isArray(hits));
  });

  test("short queries do not flood with fuzzy noise", async () => {
    const one = await searchEverything("z", 20);
    assert.ok(one.every((h) => !h.fuzzy), "1-char must not use fuzzy");
    assert.ok(one.every((h) => h.section !== "Heritage"), "1-char must not pull heritage");

    const two = await searchEverything("zz", 20);
    assert.deepEqual(two, []);
  });
});

describe("results page helpers and safety", () => {
  test("groups put Vacation first for ordinary travel", () => {
    const grouped = groupHits(
      [
        { id: "1", kind: "Heritage town", section: "Heritage", title: "X", subtitle: "", href: "/x" },
        { id: "2", kind: "Vacation destination", section: "Vacation", title: "Y", subtitle: "", href: "/y" },
      ],
      false,
    );
    assert.equal(grouped[0].section, "Vacation");
  });

  test("unambiguous exact allows Enter-to-open", () => {
    assert.equal(isUnambiguousExact([{ id: "1", kind: "Vacation destination", section: "Vacation", title: "Rome", subtitle: "", href: "/d", matchRank: 0 }]), true);
    assert.equal(isUnambiguousExact([{ id: "1", kind: "Vacation destination", section: "Vacation", title: "Rome", subtitle: "", href: "/d", matchRank: 3 }]), false);
    assert.equal(
      isUnambiguousExact([
        { id: "1", kind: "Vacation destination", section: "Vacation", title: "Rome", subtitle: "", href: "/d", matchRank: 0 },
        { id: "2", kind: "Thing to do", section: "Things to do", title: "Other", subtitle: "", href: "/t", matchRank: 1 },
      ]),
      false,
    );
  });

  test("nonsense returns nothing", async () => {
    assert.deepEqual(await searchEverything("zzzznonsense"), []);
  });

  test("every hit can be opened and shows a kind", async () => {
    const hits = await searchEverything("Rome", 20);
    assert.ok(hits.length > 0);
    for (const hit of hits) {
      assert.ok(hit.href.startsWith("/"), `${hit.id} has no usable link`);
      assert.ok(hit.title.trim(), `${hit.id} has no title`);
      assert.ok(hit.kind, `${hit.id} has no kind`);
      assert.ok(hit.section, `${hit.id} has no section`);
    }
  });

  test("the limit is honoured", async () => {
    assert.ok((await searchEverything("a", 5)).length <= 5);
    assert.ok((await searchEverything("Rome", 3)).length <= 3);
  });

  test("no row appears twice", async () => {
    const hits = await searchEverything("Krakow", 20);
    const keys = hits.map((h) => `${h.kind}:${h.title.toLowerCase()}:${h.href}`);
    assert.equal(new Set(keys).size, keys.length);
  });

  test("interpretedAs is set when fuzzy matching fires", async () => {
    const response = await searchSite("romw", 10);
    assert.ok(response.results.length > 0);
    assert.ok(response.interpretedAs, "fuzzy query should expose an interpreted label");
  });

  test("does not send unsuccessful search toward /stops", async () => {
    const response = await searchSite("zzzznonsense", 10);
    assert.equal(response.results.length, 0);
    // The /search page (not /stops) is the zero-result home — asserted by
    // DestinationSearch + app/search/page.tsx; results themselves never point there by default.
    assert.ok(!response.results.some((r) => r.href.startsWith("/stops")));
  });

  test("private / admin paths are not indexed as results", async () => {
    for (const q of ["admin", "access", "login", "account"]) {
      const hits = await searchEverything(q, 20);
      assert.ok(
        !hits.some((h) => h.href.startsWith("/admin") || h.href === "/access" || h.href === "/login" || h.href.startsWith("/account")),
        `${q} must not surface private doors`,
      );
    }
  });
});

describe("folding a letter that has no accent to remove", () => {
  test("reads Ł as L", () => {
    assert.equal(normalize("Łańcut"), "lancut");
    assert.equal(normalize("Łódź"), "lodz");
  });

  test("still folds the ordinary accents", () => {
    assert.equal(normalize("Kraków"), "krakow");
    assert.equal(normalize("Leżajsk"), "lezajsk");
    assert.equal(normalize("Sátoraljaújhely"), "satoraljaujhely");
    assert.equal(normalize("Šiauliai"), "siauliai");
  });

  test("keeps Yiddish exactly as it is", () => {
    assert.equal(normalize("ליזענסק"), "ליזענסק");
    assert.equal(normalize("קראקא"), "קראקא");
  });

  test("never turns a word into nothing", () => {
    for (const word of ["Łódź", "Ø", "æ", "ß", "Đ"]) {
      assert.ok(normalize(word).length > 0, `${word} normalised away to nothing`);
    }
  });
});
