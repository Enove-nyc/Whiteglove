import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { attractions } from "../data/attractions";
import { kosherAreas, kosherStays } from "../data/kosher-stays";
import { searchAreas, searchAttractions, searchStays } from "../lib/attraction-search";
import { searchLodging } from "../lib/lodging-search";
import { buildSeedRows } from "../lib/seed-data";

// An entry is only useful if it can be FOUND. Until these paths existed, a
// person searching the site for "Colosseum" was told there was no match — the
// entry was on the things-to-do page and nowhere else. These tests hold the
// three doors open: the directory search, the planner's picker, and the seed
// that puts every entry in the database in the first place.
//
// With no DATABASE_URL set, the view layer returns the built-in content only,
// which is what runs here.

describe("finding something to do", () => {
  test("by its own name", async () => {
    const hits = await searchAttractions("Colosseum");
    assert.ok(hits.some((h) => h.slug === "rome-colosseum"), "the Colosseum should be findable by name");
  });

  test("by the city it is in, with that city's own entries first", async () => {
    // The matcher is deliberately loose — it has to be, for spellings — so a
    // long tail of weaker hits is expected and fine. What matters is that the
    // city you typed comes first: searching Rome must not open with Nice.
    const hits = await searchAttractions("Rome", 50);
    const romans = hits.filter((h) => h.city === "Rome");
    assert.ok(romans.length > 1);
    assert.ok(hits.slice(0, romans.length).every((h) => h.city === "Rome"), "Rome's own entries should rank above the rest");
  });

  test("a misspelling still lands", async () => {
    // People type what they hear. The kever search has tolerated this from the
    // start; the attraction search goes through the same matcher.
    const hits = await searchAttractions("Colosseom");
    assert.ok(hits.some((h) => h.slug === "rome-colosseum"));
  });

  test("no query returns a browsable list rather than nothing", async () => {
    const hits = await searchAttractions("");
    assert.ok(hits.length > 0);
  });

  test("nonsense returns nothing rather than everything", async () => {
    assert.equal((await searchAttractions("qqzzxx")).length, 0);
  });

  test("every result carries a link the planner can store", async () => {
    for (const hit of await searchAttractions("", 200)) {
      assert.ok(hit.href.startsWith("/attractions#"), `${hit.slug} needs a linkable anchor`);
    }
  });
});

describe("finding somewhere to stay", () => {
  test("a stay is findable by its city", async () => {
    const hits = await searchStays("Milan");
    assert.ok(hits.some((h) => h.slug === "milan-chezromyk"));
  });

  test("a Jewish quarter is findable by its own name", async () => {
    const hits = await searchAreas("Wiedikon");
    assert.ok(hits.some((h) => h.slug === "zurich-wiedikon"));
  });

  test("a stay's anchor is reported as the anchor, not as the hotel", async () => {
    const [stay] = await searchStays("Chezromyk");
    assert.ok(stay);
    // The anchor is a shul or a quarter. It must never be handed over as if it
    // were the hotel's own position — a pin on the shul is a wrong address.
    assert.ok(stay.anchorName.length > 0);
    assert.ok(/^-?\d+(\.\d+)?, ?-?\d+(\.\d+)?$/.test(stay.anchorCoords));
    assert.ok(!("coordinates" in stay), "a stay must not expose a hotel coordinate it does not have");
  });
});

describe("the planner's hotel picker", () => {
  test("offers the researched stays, not only the old accommodation places", async () => {
    const hits = await searchLodging("Chezromyk");
    assert.ok(hits.some((h) => h.name.includes("Chezromyk")));
  });

  test("offers the Jewish quarters, which is the earlier question", async () => {
    const hits = await searchLodging("Wiedikon");
    assert.ok(hits.length > 0);
  });

  test("carries no coordinates across from a stay", async () => {
    // Nothing in a stay record is the hotel's own position, so the picker has
    // no coordinate to give and must not invent one from the anchor.
    for (const hit of await searchLodging("Wiedikon")) {
      assert.ok(!("coordinates" in hit));
    }
  });
});

describe("what does not go in the list", () => {
  // The rule is written at the top of data/attractions.ts. This is the part of
  // it a test can hold: a batch added in a hurry should fail here rather than
  // ship. It cannot judge whether something belongs — only catch the obvious.
  //
  // "bar" needs the exception. In this corpus the word is far more often a
  // patronymic than a drinking establishment — bar Yochai, Bar Kochba, Bar
  // Ilan — and the first version of this test failed the Herodium entry for
  // saying the tunnels under the hill were cut by the fighters of the Bar
  // Kochba revolt. A guard that fails on correct content gets edited around
  // until it stops meaning anything, so the exception is written in.
  const BARRED =
    /\b(bars?(?!\s+(?:Kochba|Kokhba|Yochai|Yohai|Ilan|Kappara|Mitzvah|mitzvah))|pubs?|nightclub|nightlife|casino|gambling|striptease|burlesque)\b/i;

  test("no bars, nightlife or gambling anywhere in an entry", () => {
    for (const a of attractions) {
      const text = [a.name, a.summary, (a.notes ?? []).join(" "), a.shabbos ?? ""].join(" ");
      const hit = BARRED.exec(text);
      assert.equal(hit, null, `${a.slug} mentions "${hit?.[0]}"`);
    }
  });

  test("mixed bathing is never the reason an entry is here", () => {
    // Naming it to warn somebody off is fine — selling it is not. So the test
    // is on the summary, which is what the entry is for, not on the notes.
    for (const a of attractions) {
      assert.ok(!/\b(thermal bath|spa|beach resort|water ?park)\b/i.test(a.summary), `${a.slug}`);
    }
  });
});

describe("what the seed puts in the database", () => {
  const rows = buildSeedRows();

  test("every attraction, stay and quarter becomes a row", () => {
    assert.equal(rows.attractions.length, attractions.length);
    assert.equal(rows.stays.length, kosherStays.length);
    assert.equal(rows.areas.length, kosherAreas.length);
  });

  test("slugs are unique, so a re-import replaces rather than duplicates", () => {
    for (const list of [rows.attractions, rows.stays, rows.areas]) {
      const slugs = list.map((r) => r.slug);
      assert.equal(new Set(slugs).size, slugs.length);
    }
  });

  test("every row carries the source it came from", () => {
    for (const row of [...rows.attractions, ...rows.stays, ...rows.areas]) {
      assert.ok(row.sourceUrl && row.sourceUrl.startsWith("http"), `${row.slug} needs a source`);
    }
  });

  test("a stay's anchor coordinates survive the trip into the row", () => {
    for (const stay of rows.stays) {
      assert.ok(/^-?\d+(\.\d+)?, ?-?\d+(\.\d+)?$/.test(stay.anchorCoords), `${stay.slug} anchor`);
    }
  });

  test("no attraction claims a coordinate that is not a coordinate", () => {
    for (const a of rows.attractions) {
      if (a.coordinates) assert.ok(/^-?\d+(\.\d+)?, ?-?\d+(\.\d+)?$/.test(a.coordinates), `${a.slug}`);
    }
  });
});
