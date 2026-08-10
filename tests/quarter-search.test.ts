import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { offerableQuarters, quarterAddress, quarterRequest, type QuarterLike } from "@/lib/quarter-search";
import { goHref } from "@/lib/affiliate/request";
import { DEFAULT_STAY_SEARCH, type StaySearch } from "@/lib/stay-search";

/**
 * "Where should I stay?" — searching the quarter we recommended.
 *
 * WHAT GOES WRONG IF THIS IS WRONG is not an exception. A bad address opens a
 * working hotel search centred on the wrong place, the visitor books a room a
 * bus ride from the food and the shul, and the first anyone hears of it is a
 * complaint months later. So these tests are about the string, because the
 * string is the whole behaviour.
 */

const marais: QuarterLike = {
  slug: "le-marais",
  name: "Le Marais",
  city: "Paris",
  country: "France",
  note: "The old Jewish quarter. Kosher food on rue des Rosiers, several shuls, and the whole of it walkable.",
};

const search: StaySearch = {
  ...DEFAULT_STAY_SEARCH,
  destination: "Paris",
  checkIn: "2026-09-01",
  checkOut: "2026-09-05",
  adults: 2,
  children: 1,
  rooms: 1,
};

describe("the address a quarter searches on", () => {
  it("carries the city, because a quarter name alone names a hundred places", () => {
    assert.equal(quarterAddress(marais), "Le Marais, Paris");
  });

  it("does not repeat a city the quarter's own name already opens with", () => {
    const written: QuarterLike = { ...marais, name: "Rome, Monteverde", city: "Rome" };
    assert.equal(quarterAddress(written), "Rome, Monteverde");
  });

  it("says the city once when the quarter is the city", () => {
    assert.equal(quarterAddress({ ...marais, name: "Paris", city: "Paris" }), "Paris");
  });

  it("falls back to whichever half it has rather than emitting a stray comma", () => {
    assert.equal(quarterAddress({ ...marais, name: "", city: "Paris" }), "Paris");
    assert.equal(quarterAddress({ ...marais, name: "Le Marais", city: "" }), "Le Marais");
  });

  it("trims, so an admin's trailing space is not sent to a geocoder", () => {
    assert.equal(quarterAddress({ ...marais, name: "  Le Marais  ", city: " Paris " }), "Le Marais, Paris");
  });
});

describe("the booking request a quarter builds", () => {
  it("searches the quarter, not the city the visitor typed", () => {
    assert.equal(quarterRequest(marais, search).destination, "Le Marais, Paris");
    assert.notEqual(quarterRequest(marais, search).destination, search.destination);
  });

  it("carries the dates and the party, so nothing is asked for twice", () => {
    const request = quarterRequest(marais, search);
    assert.equal(request.checkIn, "2026-09-01");
    assert.equal(request.checkOut, "2026-09-05");
    assert.equal(request.adults, 2);
    assert.equal(request.children, 1);
    assert.equal(request.rooms, 1);
  });

  it("is a hotel search, and records where it was pressed", () => {
    const request = quarterRequest(marais, search);
    assert.equal(request.product, "hotel");
    assert.equal(request.page, "/hotels");
    assert.equal(request.placement, "quarter");
    assert.equal(request.destinationSlug, "le-marais");
  });

  it("still works with no dates set, because the quarter is the answer either way", () => {
    const request = quarterRequest(marais, { ...DEFAULT_STAY_SEARCH, destination: "Paris" });
    assert.equal(request.destination, "Le Marais, Paris");
    assert.equal(request.checkIn, "");
  });

  it("goes out through /go, so the partner address never reaches the markup", () => {
    const href = goHref(quarterRequest(marais, search));
    assert.ok(href.startsWith("/go?"), href);
    assert.ok(!href.includes("stay22"), href);
    assert.ok(!href.includes("booking.com"), href);
    const query = new URLSearchParams(href.slice("/go?".length));
    assert.equal(query.get("destination"), "Le Marais, Paris");
    assert.equal(query.get("placement"), "quarter");
    assert.equal(query.get("in"), "2026-09-01");
  });
});

describe("which quarters are offered as a choice", () => {
  it("keeps the ones somebody has actually written up", () => {
    assert.deepEqual(offerableQuarters([marais]).map((area) => area.slug), ["le-marais"]);
  });

  it("drops a quarter with no note, rather than a button that explains nothing", () => {
    const blank: QuarterLike = { ...marais, slug: "blank", note: "   " };
    assert.deepEqual(offerableQuarters([marais, blank]).map((area) => area.slug), ["le-marais"]);
  });

  it("drops a quarter with no name, which would search the bare city", () => {
    const unnamed: QuarterLike = { ...marais, slug: "unnamed", name: "" };
    assert.deepEqual(offerableQuarters([marais, unnamed]).map((area) => area.slug), ["le-marais"]);
  });

  it("returns nothing when nothing is written, so the section can hide itself", () => {
    assert.deepEqual(offerableQuarters([{ ...marais, note: "" }]), []);
  });
});
