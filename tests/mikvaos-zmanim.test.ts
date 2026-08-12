import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  mikvahListingFromDbRow,
  staticMikvahListings,
} from "../lib/mikvaos";
import {
  calculateZmanim,
  compactZmanim,
  isValidZmanimDate,
  parseCoordinates,
  todayInTimeZone,
} from "../lib/zmanim";
import { zmanimPlaces } from "../lib/zmanim-places";
import { publishedPracticalPlaceSearchDocument } from "../lib/site-search-index";
import { scoreDocument } from "../lib/site-search-rank";

describe("mikvaos listings", () => {
  test("static catalog is source-backed and non-empty", () => {
    const listings = staticMikvahListings();
    assert.ok(listings.length > 0, "expected seeded mikvah listings");
    for (const listing of listings) {
      assert.ok(listing.sourceUrl.startsWith("http"), `${listing.name} missing http source`);
      assert.ok(listing.city, `${listing.name} missing city`);
      assert.ok(listing.country, `${listing.name} missing country`);
    }
  });

  test("draft rows never become public listings", () => {
    const draft = mikvahListingFromDbRow({
      id: "draft-1",
      name: "Hidden mikvah",
      address: "Somewhere",
      phone: null,
      hours: null,
      notes: null,
      website: null,
      sourceUrl: "https://example.com/mikvah",
      coordinates: null,
      status: "DRAFT",
      destination: { slug: "rome", city: "Rome", country: "Italy" },
    });
    assert.equal(draft, null);
  });

  test("published rows without a source URL stay off the public list", () => {
    const missing = mikvahListingFromDbRow({
      id: "no-source",
      name: "Unsourced mikvah",
      address: "Somewhere",
      phone: null,
      hours: null,
      notes: null,
      website: null,
      sourceUrl: null,
      coordinates: null,
      status: "PUBLISHED",
      destination: { slug: "rome", city: "Rome", country: "Italy" },
    });
    assert.equal(missing, null);
  });

  test("published source-backed rows map cleanly", () => {
    const row = mikvahListingFromDbRow({
      id: "pub-1",
      name: "Community mikvah",
      address: "Via Roma 1",
      phone: "+39 06 0000",
      hours: "By appointment",
      notes: "Call ahead",
      website: null,
      sourceUrl: "https://example.com/community-mikvah",
      coordinates: "41.89, 12.48",
      status: "PUBLISHED",
      destination: { slug: "rome", city: "Rome", country: "Italy" },
    });
    assert.ok(row);
    assert.equal(row?.fromDatabase, true);
    assert.equal(row?.sourceUrl, "https://example.com/community-mikvah");
  });
});

describe("zmanim calculation", () => {
  test("parses coordinates and dates", () => {
    assert.deepEqual(parseCoordinates("41.8921, 12.4780"), { lat: 41.8921, lon: 12.478 });
    assert.equal(parseCoordinates("not-a-point"), null);
    assert.equal(isValidZmanimDate("2026-08-11"), true);
    assert.equal(isValidZmanimDate("11/08/2026"), false);
  });

  test("calculates a sensible day for Rome", () => {
    const result = calculateZmanim({
      locationName: "Rome",
      latitude: 41.8921,
      longitude: 12.478,
      timeZoneId: "Europe/Rome",
      date: "2026-08-11",
    });
    assert.equal(result.date, "2026-08-11");
    // The attribution stays and says what was computed, where, and with what.
    // The old "White Glove does not pasken" line does not: a sunrise is not an
    // opinion, and where opinions DO differ the entries name them — which is
    // what the Gra and Magen Avraham assertions below are checking.
    assert.match(result.attribution, /kosher-zmanim/i);
    assert.ok(!("disclaimer" in result), "no blanket disclaimer rides along with the times");

    const byId = Object.fromEntries(result.entries.map((entry) => [entry.id, entry]));
    assert.ok(byId.sunrise?.time);
    assert.ok(byId.sunset?.time);
    assert.ok(byId["sof-zman-shema-gra"]?.time);
    assert.ok(byId["sof-zman-shema-mga"]?.time);
    assert.ok(byId.chatzos?.time);
    assert.ok(byId.tzeit?.time);

    // Sunrise before sof zman Shema before chatzos before sunset.
    assert.ok(byId.sunrise!.time! < byId["sof-zman-shema-gra"]!.time!);
    assert.ok(byId["sof-zman-shema-gra"]!.time! < byId.chatzos!.time!);
    assert.ok(byId.chatzos!.time! < byId.sunset!.time!);

    const compact = compactZmanim(result);
    assert.ok(compact.length >= 5);
    assert.ok(compact.every((entry) => entry.time));
  });

  test("Jewish quarter places ship with coordinates and timezones", () => {
    const places = zmanimPlaces();
    assert.ok(places.length > 0);
    for (const place of places) {
      assert.ok(place.timeZoneId);
      assert.ok(Number.isFinite(place.latitude));
      assert.ok(Number.isFinite(place.longitude));
    }
    assert.ok(todayInTimeZone("Europe/Rome").match(/^\d{4}-\d{2}-\d{2}$/));
  });
});

describe("search indexing for mikvaos", () => {
  test("MIKVAH practical listings carry mikvah keywords", () => {
    const document = publishedPracticalPlaceSearchDocument({
      id: "mikvah-1",
      category: "MIKVAH",
      name: "Kazinczy Street Mikvah",
      address: "Kazinczy utca 16",
      notes: "Orthodox community mikvah",
      sourceUrl: "https://example.com",
      destination: { slug: "budapest", city: "Budapest", country: "Hungary" },
    });
    assert.ok(document.keywords.some((word) => /mikvah|mikvaos/i.test(word)));
    const scored = scoreDocument("mikvah budapest", document, false);
    assert.ok(scored);
  });

  test("draft practical places are not built by the public mapper", () => {
    // The public mapper only receives published rows from the DB query;
    // this documents that drafts are filtered before document construction.
    const draft = mikvahListingFromDbRow({
      id: "draft-search",
      name: "Draft mikvah",
      address: null,
      phone: null,
      hours: null,
      notes: null,
      website: null,
      sourceUrl: "https://example.com",
      coordinates: null,
      status: "NEEDS_REVIEW",
      destination: { slug: "rome", city: "Rome", country: "Italy" },
    });
    assert.equal(draft, null);
  });
});
