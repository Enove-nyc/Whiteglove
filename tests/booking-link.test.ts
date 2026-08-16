import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  BOOKING_HELP_PATH,
  BOOKING_SEARCH_PATH,
  bookingCallToAction,
  bookingHref,
  bookingLink,
  pathIsLocked,
} from "@/lib/booking-access";
import { bookCategoryFor } from "@/lib/navigation";
import { services } from "@/data/services";

/**
 * No public call to action may end at a password box.
 *
 * THE BUG THIS IS ABOUT. The footer, the services page and every destination
 * page offered "Flights, hotels & cars" and sent people to `/book` — a path the
 * owner has locked from the admin, so the link opened an access-code screen.
 * `/book` is not gated in the code, which is exactly why nothing caught it: the
 * link was correct on the day it was written and became a dead end because of a
 * setting somewhere else.
 *
 * So the rule is enforced against the RESOLVER rather than against a list of
 * hrefs, and separately against the source files, so that typing `/book` back
 * into a public page fails here.
 */

const LOCKED = ["/book"];

describe("where a public booking link may go", () => {
  it("goes to the search when the search is open", () => {
    const link = bookingLink([]);
    assert.equal(link.href, BOOKING_SEARCH_PATH);
    assert.equal(link.searchIsPublic, true);
  });

  it("GOES TO THE PUBLIC ASSISTANCE PAGE WHEN THE SEARCH IS LOCKED", () => {
    const link = bookingLink(LOCKED);
    assert.equal(link.href, BOOKING_HELP_PATH);
    assert.equal(link.searchIsPublic, false);
    assert.notEqual(link.href, BOOKING_SEARCH_PATH);
  });

  it("stops promising a self-service search once there is not one", () => {
    assert.match(bookingCallToAction(bookingLink([])).blurb, /book it yourself/i);
    const closed = bookingCallToAction(bookingLink(LOCKED));
    assert.doesNotMatch(closed.blurb, /book it yourself/i);
    assert.doesNotMatch(closed.label, /^search /i);
  });

  it("never labels a locked link as a search", () => {
    // "Flights, hotels & cars" reads as a search you can use. When it is not,
    // the words have to change with the destination.
    assert.doesNotMatch(bookingLink(LOCKED).description, /search and book your own/i);
  });

  it("drops search parameters that the assistance page cannot use", () => {
    const open = bookingLink([]);
    assert.equal(bookingHref(open, { type: "flights", to: "FCO" }), "/book?type=flights&to=FCO");
    assert.equal(bookingHref(open, { to: undefined }), "/book");
    // A URL carrying ?type=flights to a page with no search on it reads broken.
    assert.equal(bookingHref(bookingLink(LOCKED), { type: "flights", to: "FCO" }), BOOKING_HELP_PATH);
  });

  it("matches the middleware's prefix rule exactly", () => {
    // A lock on /book covers /book/review…
    assert.ok(pathIsLocked("/book/review", ["/book"]));
    // …and a lock on /books does not cover /book.
    assert.equal(pathIsLocked("/book", ["/books"]), false);
    // The admin stores what was typed, trailing slash and all.
    assert.ok(pathIsLocked("/book", ["/book/"]));
    assert.equal(pathIsLocked("/book", []), false);
    assert.equal(pathIsLocked("/book", ["", "  "]), false);
  });
});

describe("the Book dropdown", () => {
  it("still offers booking when it is open", () => {
    const category = bookCategoryFor(bookingLink([]));
    assert.ok(category.links.some((link) => link.href.startsWith(BOOKING_SEARCH_PATH)));
  });

  it("HAS NO ROUTE TO THE LOCKED SEARCH", () => {
    const category = bookCategoryFor(bookingLink(LOCKED));
    for (const link of category.links) {
      assert.notEqual(link.href, BOOKING_SEARCH_PATH, `${link.label} still points at the locked search`);
    }
    // And it is replaced rather than removed — the entry is still there.
    assert.ok(category.links.some((link) => link.href === BOOKING_HELP_PATH));
  });
});

describe("the words on the public pages", () => {
  const FILES = [
    "components/Footer.tsx",
    "app/destinations/[destination]/page.tsx",
    "app/travel-guide/page.tsx",
    "components/PracticalInformation.tsx",
    "components/ServiceCatalog.tsx",
    "data/services.ts",
  ];

  it("TYPES /book INTO NO PUBLIC PAGE", () => {
    for (const file of FILES) {
      const source = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      assert.doesNotMatch(source, /href=\{?["'`]\/book/, `${file} links straight at the booking search`);
      assert.doesNotMatch(source, /["']\/book["']/, `${file} names the booking search directly`);
    }
  });

  it("no longer claims the booking page is yours to use now", () => {
    for (const file of FILES) {
      // Comments stripped: data/services.ts quotes the old sentence in order to
      // record why it went, which is worth keeping and is not shown to anybody.
      const source = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      assert.doesNotMatch(source, /booking page is yours to use/i, file);
      assert.doesNotMatch(source, /Search here and book it yourself/i, file);
    }
  });

  it("leaves the flights service without a hardcoded search button", () => {
    const flights = services.find((service) => service.id === "flights-hotels-transport");
    assert.ok(flights);
    assert.equal(flights.usesBookingSearch, true);
    // The fallback must not be the search itself, or a closed search resolves
    // to a closed search.
    assert.notEqual(flights.action.href, BOOKING_SEARCH_PATH);
  });
});
