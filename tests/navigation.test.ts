import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isCurrent, MENU_GROUPS, PRIMARY_CTA, PRIMARY_HREFS, PRIMARY_NAV, SIGN_IN } from "@/lib/navigation";

/**
 * The bar is the positioning, so the rules about it are tests rather than a
 * comment somebody can read past.
 *
 * The bar used to read: Destinations · Cemeteries · Getaways · Directory ·
 * Services · Book. Three of those six were the heritage database, one was a
 * word that means something different to a vacation customer, and one led to a
 * page that can sit behind an access code. Each of the tests below names the
 * mistake it stops coming back.
 */

const ALL_ITEMS = [...PRIMARY_NAV, ...MENU_GROUPS.flatMap((group) => group.links)];
const NAVBAR = readFileSync("components/Navbar.tsx", "utf8");
const FOOTER = readFileSync("components/Footer.tsx", "utf8");

describe("what the bar leads with", () => {
  it("opens with planning a trip, not with browsing a database", () => {
    assert.equal(PRIMARY_NAV[0].label, "Plan a Trip");
    assert.equal(PRIMARY_NAV[0].href, "/plan");
  });

  it("is the five sections that were asked for, in order", () => {
    assert.deepEqual(
      PRIMARY_NAV.map((item) => item.label),
      ["Plan a Trip", "Vacation Ideas", "Kosher Travel", "Travel Services", "Heritage Travel"],
    );
  });

  it("puts vacation ideas ahead of heritage travel", () => {
    // Not a matter of taste: a visitor reads the bar left to right and stops
    // at the first thing that sounds like what they came for.
    const labels = PRIMARY_NAV.map((item) => item.label);
    assert.ok(labels.indexOf("Vacation Ideas") < labels.indexOf("Heritage Travel"));
  });

  it("has one primary action, and it starts a trip", () => {
    assert.equal(PRIMARY_CTA.href, "/plan");
    assert.equal(SIGN_IN.href, "/login");
  });
});

describe("what the bar may not do", () => {
  it("KEEPS CEMETERIES OFF THE TOP LEVEL", () => {
    // The single item that made a vacation planner look like a burial-records
    // database. It is one press away inside Heritage Travel.
    for (const item of PRIMARY_NAV) {
      assert.notEqual(item.href, "/cemeteries", `${item.label} is the cemetery directory at the top level`);
      assert.doesNotMatch(item.label, /cemeter/i, item.label);
    }
    // And it is still reachable, which is the other half of the rule.
    assert.ok(ALL_ITEMS.some((item) => item.href === "/cemeteries"), "the cemetery directory has no way in at all");
  });

  it("NEVER CALLS ANYTHING “DESTINATIONS”", () => {
    // The word is not wrong; it is ambiguous exactly here. To a vacation
    // customer it promises places to go on holiday, and on this site it opened
    // the kevarim directory.
    for (const item of ALL_ITEMS) {
      assert.doesNotMatch(item.label, /^destinations$/i, `${item.href} is labelled Destinations`);
    }
  });

  it("SENDS NO MAIN NAVIGATION ITEM TO THE BOOKING SEARCH", () => {
    // /book is not itself gated, but the site can be closed and single paths
    // can be locked from the admin — so a first-time visitor pressing a main
    // item can meet a password box. It stays reachable from the menu.
    for (const item of PRIMARY_NAV) assert.notEqual(item.href, "/book");
    assert.notEqual(PRIMARY_CTA.href, "/book");
    assert.ok(ALL_ITEMS.some((item) => item.href === "/book"), "the booking search has no way in at all");
  });

  it("goes nowhere that needs an access code by design", () => {
    for (const item of PRIMARY_NAV) {
      assert.ok(!/^\/(access|admin|login)/.test(item.href), item.href);
    }
  });
});

describe("every item says what is behind it", () => {
  it("carries a real description, because a bare noun gets pressed once", () => {
    for (const item of ALL_ITEMS) {
      assert.ok(item.description.trim().length > 20, `${item.label} does not say what it is`);
      assert.ok(item.label.trim().length > 2, item.href);
      assert.match(item.href, /^\//, item.href);
    }
  });

  it("leaves no menu group empty and repeats no link inside one", () => {
    for (const group of MENU_GROUPS) {
      assert.ok(group.links.length > 0, `${group.title} would render as an empty heading`);
      const hrefs = group.links.map((link) => link.href);
      assert.equal(new Set(hrefs).size, hrefs.length, `${group.title} lists the same link twice`);
    }
  });

  it("knows which hrefs the bar already shows, so the panel can drop them", () => {
    assert.equal(PRIMARY_HREFS.size, PRIMARY_NAV.length);
    for (const item of PRIMARY_NAV) assert.ok(PRIMARY_HREFS.has(item.href));
  });
});

describe("which section is current", () => {
  it("marks a section from any page inside it", () => {
    assert.equal(isCurrent("/vacation-ideas", "/vacation-ideas"), true);
    assert.equal(isCurrent("/vacation-ideas", "/vacation-ideas/rome"), true);
  });

  it("does not let the front page be current everywhere", () => {
    // Every path starts with "/", so a prefix match would light Home up on
    // every page of the site.
    assert.equal(isCurrent("/", "/"), true);
    assert.equal(isCurrent("/", "/vacation-ideas"), false);
  });

  it("matches a whole segment rather than a prefix of a word", () => {
    assert.equal(isCurrent("/plan", "/planning"), false);
  });
});

describe("the header renders the list rather than its own copy", () => {
  it("reads the shared navigation", () => {
    // Hand-written copies are how the bar and the menu came to disagree about
    // what the site contains.
    assert.match(NAVBAR, /PRIMARY_NAV\.map/);
    assert.match(NAVBAR, /MENU_GROUPS\.map/);
    assert.match(NAVBAR, /from "@\/lib\/navigation"/);
  });

  it("still shows the planner and My Route to everybody", () => {
    // The rule from tests/members-only.ts, restated here because the header
    // was rewritten: a feature nobody can see is a feature nobody asks for.
    assert.match(NAVBAR, /GATED_FEATURES\.map/);
  });

  it("keeps the site search and the promotions strip", () => {
    assert.match(NAVBAR, /DestinationSearch/);
    assert.match(NAVBAR, /SitePromotions/);
  });

  it("has exactly one filled button in the header", () => {
    // Two equal buttons means no primary action at all.
    assert.match(NAVBAR, /PRIMARY_CTA\.label/);
  });
});

describe("the footer says the vacation-neutral thing", () => {
  it("ASKS WHERE YOU WANT TO GO, OR OFFERS TO HELP YOU CHOOSE", () => {
    // The exact sentence that was asked for, because the old one — "Share your
    // kevarim, dates, and kosher needs" — appeared on every page of the site
    // including the ones about beach holidays.
    assert.match(FOOTER, /Tell us where you want to go—or let us help you choose\./);
  });

  it("no longer asks every visitor for their kevarim", () => {
    assert.doesNotMatch(FOOTER, /Share your kevarim/i);
  });

  it("puts heritage travel in one column rather than at the top of the list", () => {
    const heritage = FOOTER.indexOf('title: "Heritage travel"');
    const plan = FOOTER.indexOf('title: "Plan a trip"');
    assert.ok(plan >= 0 && heritage > plan, "heritage travel is listed before planning a trip");
  });

  it("still reaches everything the old footer did", () => {
    for (const href of ["/stops", "/cemeteries", "/directory", "/book", "/services", "/contact", "/submit", "/login", "/privacy", "/terms", "/admin"]) {
      assert.ok(FOOTER.includes(`"${href}"`), `${href} lost its way out of the footer`);
    }
  });
});
