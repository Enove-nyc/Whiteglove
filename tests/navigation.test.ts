import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { categoryIsCurrent, isCurrent, NAV_CATEGORIES, SIGN_IN, travelCategoryFor } from "@/lib/navigation";
import { bookingLink } from "@/lib/booking-access";

/**
 * The bar is the positioning, so the rules about it are tests rather than a
 * comment somebody can read past.
 *
 * Rewritten for the four-dropdown header (Destinations, Kosher, Plan,
 * Travel — booking inside Travel) plus the icon row (Search, Route,
 * Itinerary, Account). The bar this
 * replaces read Destinations · Things to Do · Kosher Travel · Heritage Travel
 * · Itinerary planner with one filled Search & Book button; each test below
 * that concerns the OLD shape has been rewritten for the new one rather than
 * deleted outright, so the reasoning that survived stays attached to a test.
 */

const NAVBAR = readFileSync("components/Navbar.tsx", "utf8");
const ALL_LINKS = NAV_CATEGORIES.flatMap((category) => category.links);

describe("what the bar leads with", () => {
  it("OPENS WITH WHERE TO GO, not with a form", () => {
    assert.equal(NAV_CATEGORIES[0].label, "Destinations");
  });

  it("is the four categories, in order", () => {
    assert.deepEqual(
      NAV_CATEGORIES.map((category) => category.label),
      ["Destinations", "Kosher", "Plan", "Travel"],
    );
  });

  it("KEEPS PERSONAL PLANNING OUT OF THE SITE ENTIRELY", () => {
    // Not renamed, not demoted — removed, at the owner's word. /services does
    // not appear in any category, and the Plan category is self-service only.
    for (const link of ALL_LINKS) {
      assert.notEqual(link.href, "/services", `${link.label} still points at the services page`);
    }
  });

  it("HAS NO HERITAGE CATEGORY", () => {
    // Heritage merged into Destinations at the owner's word. It is not a
    // fourth top-level thing this site is about.
    for (const category of NAV_CATEGORIES) {
      assert.doesNotMatch(category.label, /heritage/i, category.label);
    }
  });

  it("puts kevarim and cemeteries under Kosher, reachable but not top level", () => {
    const kosher = NAV_CATEGORIES.find((category) => category.label === "Kosher");
    assert.ok(kosher);
    assert.ok(kosher.links.some((link) => link.href === "/tzaddikim"));
    assert.ok(kosher.links.some((link) => link.href === "/cemeteries"));
    for (const category of NAV_CATEGORIES) {
      assert.notEqual(category.label, "Cemeteries");
    }
  });
});

describe("booking lives inside Travel — resolved, never a dead end", () => {
  it("is not a category of its own", () => {
    for (const category of NAV_CATEGORIES) assert.notEqual(category.label, "Book");
    assert.equal(NAV_CATEGORIES.length, 4);
  });

  it("offers real links when the search is open", () => {
    const category = travelCategoryFor(bookingLink([]));
    assert.equal(category.label, "Travel");
    assert.ok(["Flights", "Hotels", "Cars"].every((label) => category.links.some((link) => link.label === label)));
  });

  it("never leads to an access code", () => {
    const category = travelCategoryFor(bookingLink(["/book"]));
    for (const link of category.links) assert.notEqual(link.href, "/book");
  });
});

describe("every category and link says what it is", () => {
  it("names every dropdown link, and no dropdown is empty", () => {
    for (const category of NAV_CATEGORIES) {
      assert.ok(category.links.length > 0, `${category.label} would open empty`);
      for (const link of category.links) {
        assert.ok(link.label.trim().length > 0, `${category.label} has a link with no label`);
        assert.match(link.href, /^\//, link.href);
      }
    }
  });

  it("repeats no link inside one dropdown", () => {
    for (const category of NAV_CATEGORIES) {
      const hrefs = category.links.map((link) => link.href);
      assert.equal(new Set(hrefs).size, hrefs.length, `${category.label} lists the same link twice`);
    }
  });
});

describe("which section is current", () => {
  it("marks a section from any page inside it", () => {
    assert.equal(isCurrent("/destinations", "/destinations"), true);
    assert.equal(isCurrent("/destinations", "/destinations/rome"), true);
  });

  it("does not let the front page be current everywhere", () => {
    assert.equal(isCurrent("/", "/"), true);
    assert.equal(isCurrent("/", "/destinations"), false);
  });

  it("matches a whole segment rather than a prefix of a word", () => {
    assert.equal(isCurrent("/plan", "/planning"), false);
  });

  it("ignores a link's own query string when matching the current path", () => {
    assert.equal(isCurrent("/destinations?view=seasonal", "/destinations"), true);
  });

  it("lights up a category when any of its links is current", () => {
    const kosher = NAV_CATEGORIES.find((category) => category.label === "Kosher")!;
    assert.equal(categoryIsCurrent(kosher, "/mikvaos"), true);
    assert.equal(categoryIsCurrent(kosher, "/destinations"), false);
  });
});

describe("the header renders the list rather than its own copy", () => {
  it("reads the shared navigation", () => {
    // The header picks the brand's bar from the shared module rather than
    // hard-coding a copy — kosher gets NAV_CATEGORIES, itineraries its own set,
    // both through categoriesForBrand.
    assert.match(NAVBAR, /categoriesForBrand\(/);
    assert.match(NAVBAR, /travelCategoryFor\(/);
    assert.match(NAVBAR, /from "@\/lib\/navigation"/);
  });

  it("keeps the promotions strip", () => {
    assert.match(NAVBAR, /SitePromotions/);
  });

  it("has the four utility icons, each with an accessible label", () => {
    for (const label of ["Search", "Route", "Itinerary"]) {
      assert.match(NAVBAR, new RegExp(`label="${label}"`), `${label} icon missing`);
    }
    // THE FOURTH ICON IS NOW TWO THINGS. Signed in it is a menu of the four
    // places an account has — /account used to be one link to a page holding
    // all four, so somebody who wanted their trips landed on their own name
    // and scrolled. Signed out it is a door: it opens the sign-in dialog
    // rather than leaving whatever page somebody is reading.
    assert.match(NAVBAR, /<AccountMenu plan=\{plan\} \/>/);
    assert.match(NAVBAR, /label="Sign in"/);
    // Both carry a label, which is what this test is actually protecting.
    const menu = readFileSync("components/AccountMenu.tsx", "utf8");
    assert.match(menu, /aria-label="Account"/);
  });

  it("hover opens the menu, and the click that follows cannot close it", () => {
    // Hover-open is back at the owner's request. It broke the buttons once —
    // hover opened, then the click read the menu as open and shut it, so the
    // panel flickered and looked dead. It is safe now because hover sets only
    // `open` and click toggles on `pressed`: after hover opens a menu, pressed
    // is still null, so the first click commits the press and leaves it open.
    assert.match(NAVBAR, /onMouseEnter=\{\(\) => openOnHover\(key\)\}/);
    assert.match(NAVBAR, /onClick=\{\(\) => toggleOnClick\(key\)\}/);
    // Hover opens (or slides to) a menu and never touches `pressed`.
    assert.match(NAVBAR, /function openOnHover/);
    assert.match(NAVBAR, /current\.open === key \? current : \{ \.\.\.current, open: key \}/);
    // Every decision is made from live state through the functional updater —
    // that staleness is what let hover and click disagree in the first place.
    assert.match(NAVBAR, /setMenu\(\(current\) =>/);
    // Focus still does not open, and none of the old pointer-down bookkeeping
    // came back with hover.
    assert.doesNotMatch(NAVBAR, /onFocus=\{\(\) => openOnFocus/);
    assert.doesNotMatch(NAVBAR, /openBeforePress/);
    // Focus leaving a category closes its panel.
    assert.match(NAVBAR, /onBlur=/);
  });

  it("clicking a second menu switches to it instead of closing everything", () => {
    // THE HOVER-SWITCH BUG. With one menu open, moving the pointer onto
    // another opened it (correct) — and then the click on it read "already
    // open" and shut it, so pressing a second menu closed the whole bar. A
    // toggle has to know WHY a menu is open, so `pressed` records only what a
    // press opened; hover moves `open` and never touches it.
    assert.match(NAVBAR, /open: string \| null; pressed: string \| null/);
    assert.match(NAVBAR, /current\.pressed === key \? \{ open: null, pressed: null \} : \{ open: key, pressed: key \}/);
    // Hover leaves `pressed` alone — it only ever writes `open`.
    assert.match(NAVBAR, /current\.open === key \? current : \{ \.\.\.current, open: key \}/);
    // One piece of state, so the two halves cannot go stale against each other.
    assert.doesNotMatch(NAVBAR, /setOpenKey\(/);
  });

  it("Escape closes and gives the trigger its focus back, and a press outside closes", () => {
    assert.match(NAVBAR, /event\.key !== "Escape"/);
    assert.match(NAVBAR, /triggerRefs\.current\[key\]\?\.focus\(\)/);
    assert.match(NAVBAR, /addEventListener\("mousedown", closeOutside\)/);
    // A real button, so Enter and Space are clicks and need no separate path.
    assert.match(NAVBAR, /type="button"/);
    assert.match(NAVBAR, /aria-expanded=\{open\}/);
  });

  it("sign in points at the sign-in page", () => {
    assert.equal(SIGN_IN.href, "/login");
  });
});

describe("search opens across the page, not on a page of its own", () => {
  const NAV = readFileSync("components/Navbar.tsx", "utf8");

  it("TOGGLES A BAR INSTEAD OF NAVIGATING AWAY", () => {
    // Searching used to mean leaving whatever somebody was reading, and coming
    // back meant Back.
    assert.match(NAV, /onClick=\{\(\) => setSearchOpen\(\(v\) => !v\)\}/);
    assert.match(NAV, /\{searchOpen && \(/);
    assert.match(NAV, /<DestinationSearch compact autoFocus id="header-search" \/>/);
  });

  it("KEEPS /search AS A REAL PAGE BEHIND IT", () => {
    // A typed URL, a bookmark, and Enter on a query worth its own screen.
    assert.match(NAV, /href="\/search"/);
  });

  it("closes on Escape, on the X, and when a result is followed", () => {
    assert.match(NAV, /if \(event\.key === "Escape"\) setSearchOpen\(false\)/);
    assert.match(NAV, /aria-label="Close search"/);
    // Following a result is the end of that search; leaving the bar open would
    // cover the top of the page somebody just arrived at.
    assert.match(NAV, /setSearchOpen\(false\);\s*\n\s*\}/);
  });

  it("uses the site's own search box rather than a second one", () => {
    // DestinationSearch is the box with the typeahead, the keyboard handling
    // and the sections. A plain input here would be a worse search wearing the
    // same icon.
    assert.match(NAV, /import DestinationSearch from "@\/components\/DestinationSearch"/);
  });
});
