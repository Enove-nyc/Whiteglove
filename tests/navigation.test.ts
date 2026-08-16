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
    assert.match(NAVBAR, /NAV_CATEGORIES/);
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
    assert.match(NAVBAR, /label=\{signedIn \? "Account" : "Sign in"\}/);
  });

  it("opens dropdowns on hover, click and focus — and click cannot undo focus", () => {
    assert.match(NAVBAR, /onMouseEnter=\{\(\) => openOnHover/);
    assert.match(NAVBAR, /onFocus=\{\(\) => openOnFocus/);
    assert.match(NAVBAR, /onClick=\{\(\) => toggleOnClick/);
    // The pre-interaction state is recorded at pointer-down, before focus
    // fires — the fix for the menu that flashed open and shut on click.
    assert.match(NAVBAR, /onPointerDown=\{\(\) => \{ openBeforePress\.current = open; \}\}/);
    // Focus leaving a category closes its panel.
    assert.match(NAVBAR, /onBlur=/);
  });

  it("sign in points at the sign-in page", () => {
    assert.equal(SIGN_IN.href, "/login");
  });
});
