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

  it("a press opens the menu; hover and focus never do", () => {
    // THE RULE THAT REPLACED "opens on hover, click and focus". Opening on
    // hover meant the click that followed the hover read the menu as already
    // open and shut it again, so the buttons looked dead — reported from the
    // live site as all four dropdowns failing to open. Hover now only slides
    // between menus once one is open, and nothing opens the first one but a
    // press.
    assert.match(NAVBAR, /onMouseEnter=\{\(\) => switchOnHover\(key\)\}/);
    assert.match(NAVBAR, /setOpenKey\(\(current\) => \(current === null \? null : key\)\)/);
    assert.match(NAVBAR, /onClick=\{\(\) => toggleOnClick\(key\)\}/);
    // The toggle reads live state, never a value captured during render —
    // that staleness is what let hover and click disagree.
    assert.match(NAVBAR, /setOpenKey\(\(current\) => \(current === key \? null : key\)\)/);
    // Neither opening on focus nor the pointer-down bookkeeping it needed.
    assert.doesNotMatch(NAVBAR, /onFocus=\{\(\) => openOnFocus/);
    assert.doesNotMatch(NAVBAR, /openBeforePress/);
    // Focus leaving a category closes its panel.
    assert.match(NAVBAR, /onBlur=/);
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
