import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isCurrent, MENU_GROUPS, primaryCtaFor, PRIMARY_CTA, PRIMARY_HREFS, PRIMARY_NAV, SIGN_IN } from "@/lib/navigation";
import { bookingLink } from "@/lib/booking-access";

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
/** Without the comments: those quote the old wording in order to record it. */
const FOOTER_PROSE = FOOTER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("what the bar leads with", () => {
  it("OPENS WITH WHERE TO GO, not with a form", () => {
    // It opened with "Plan a Trip" while the business was personal planning.
    // The business is now helping somebody choose a holiday and earning when
    // they book it, so the bar opens with the choosing.
    assert.equal(PRIMARY_NAV[0].label, "Destinations");
    assert.equal(PRIMARY_NAV[0].href, "/destinations");
  });

  it("is the products a person books, in order", () => {
    assert.deepEqual(
      PRIMARY_NAV.map((item) => item.label),
      ["Destinations", "Hotels & Stays", "Flights", "Things to Do", "Kosher Travel", "Heritage Travel", "My Trips"],
    );
  });

  it("KEEPS PERSONAL PLANNING OUT OF THE BAR ENTIRELY", () => {
    // Not "Plan a Trip", not "Travel Services", not "Have us book it". The
    // service still exists and is offered inside Contact; promoting it here
    // would tell every visitor the business is a planning agency.
    for (const item of PRIMARY_NAV) {
      assert.notEqual(item.href, "/plan", `${item.label} is the planning wizard`);
      assert.notEqual(item.href, "/services", `${item.label} is the services page`);
      assert.notEqual(item.href, "/contact", `${item.label} is the contact form`);
      assert.doesNotMatch(item.label, /plan (a|your) trip|book it for|personal planning/i, item.label);
    }
    // …and both are still reachable, which is the other half of the rule.
    for (const href of ["/services", "/contact"]) {
      assert.ok(ALL_ITEMS.some((item) => item.href === href), `${href} has no way in at all`);
    }
  });

  it("puts the vacation products ahead of heritage travel", () => {
    // Not a matter of taste: a visitor reads the bar left to right and stops
    // at the first thing that sounds like what they came for.
    const labels = PRIMARY_NAV.map((item) => item.label);
    assert.ok(labels.indexOf("Destinations") < labels.indexOf("Heritage Travel"));
    assert.ok(labels.indexOf("Hotels & Stays") < labels.indexOf("Heritage Travel"));
  });

  it("has one primary action, and it is a search", () => {
    assert.equal(PRIMARY_CTA.label, "Search & Book");
    assert.equal(PRIMARY_CTA.href, "/book");
    assert.equal(SIGN_IN.href, "/login");
  });

  it("fits: seven items and one button", () => {
    // Nine was asked for; seven is what fits at 1280px beside the site search
    // and the sign-in link. Cars & Transfers is the one that moved into the
    // menu, and it keeps a page of its own.
    assert.equal(PRIMARY_NAV.length, 7);
    assert.ok(ALL_ITEMS.some((item) => item.href === "/cars"), "cars and transfers has no way in at all");
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

  it("MEANS HOLIDAYS BY “DESTINATIONS”, and nothing else", () => {
    // THIS RULE IS THE INVERSE OF THE ONE IT REPLACES, and the change is the
    // point. The bar used to be forbidden the word: it was ambiguous exactly
    // here, because to a vacation customer it promises places to go on holiday
    // and on this site it opened a directory of towns with kevarim in them.
    //
    // The ambiguity is gone because the heritage towns moved
    // (lib/route-migration.ts), so the word is now free to mean the thing a
    // visitor expects. What must hold is that it keeps meaning that: an item
    // labelled Destinations goes to the vacation hub, and nothing under
    // /destinations is the heritage directory.
    for (const item of ALL_ITEMS) {
      if (/^destinations$/i.test(item.label)) {
        assert.equal(item.href, "/destinations", `${item.label} does not go to the vacation hub`);
      }
    }
    assert.ok(
      PRIMARY_NAV.some((item) => item.href === "/destinations"),
      "the vacation hub is not in the bar",
    );
    // The heritage half of the same word keeps its own address and its own
    // label, so neither can drift back into the other.
    for (const item of ALL_ITEMS) {
      if (item.href.startsWith("/heritage")) assert.doesNotMatch(item.label, /^destinations$/i, item.href);
    }
  });

  it("RESOLVES THE BOOKING SEARCH RATHER THAN LEAVING IT OUT", () => {
    // The rule is unchanged — nothing in the bar may end at a password box —
    // but it can no longer be kept by omission, because the booking search is
    // the primary action now. It is kept by resolution instead: when the owner
    // has that path locked, the one filled button on the site offers the
    // public assistance page instead of a login screen.
    const locked = bookingLink(["/book"]);
    const cta = primaryCtaFor(locked);
    assert.notEqual(cta.href, "/book");
    assert.equal(cta.href, locked.href);
    assert.doesNotMatch(cta.label, /^search/i, "it still says Search while there is nothing to search");

    // Open, it is the search, and it says so.
    const open = primaryCtaFor(bookingLink([]));
    assert.equal(open.href, "/book");
    assert.equal(open.label, "Search & Book");

    // And no OTHER bar item points straight at it.
    for (const item of PRIMARY_NAV) assert.notEqual(item.href, "/book");
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
    assert.equal(isCurrent("/destinations", "/destinations"), true);
    assert.equal(isCurrent("/destinations", "/destinations/rome"), true);
  });

  it("does not let the front page be current everywhere", () => {
    // Every path starts with "/", so a prefix match would light Home up on
    // every page of the site.
    assert.equal(isCurrent("/", "/"), true);
    assert.equal(isCurrent("/", "/destinations"), false);
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
    // menuGroupsFor(), not MENU_GROUPS, since the booking entry's target
    // depends on whether the owner has that path locked. Still the shared
    // list — the header does not keep its own copy of it.
    assert.match(NAVBAR, /menuGroupsFor\(/);
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

  it("has exactly one filled button in the header, and resolves it", () => {
    // Two equal buttons means no primary action at all. And it is
    // primaryCtaFor rather than PRIMARY_CTA, because the one filled control on
    // the site must not be able to become a password box.
    assert.match(NAVBAR, /primaryCtaFor\(/);
    assert.match(NAVBAR, /primaryCta\.label/);
    assert.doesNotMatch(NAVBAR, /PRIMARY_CTA\.href/);
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
    assert.doesNotMatch(FOOTER_PROSE, /Share your kevarim/i);
  });

  it("puts heritage travel in one column rather than at the top of the list", () => {
    const heritage = FOOTER.indexOf('title: "Heritage travel"');
    const plan = FOOTER.indexOf('title: "Plan a trip"');
    assert.ok(plan >= 0 && heritage > plan, "heritage travel is listed before planning a trip");
  });

  it("still reaches everything the old footer did, bar one", () => {
    for (const href of ["/stops", "/cemeteries", "/directory", "/services", "/contact", "/submit", "/login", "/privacy", "/terms"]) {
      assert.ok(FOOTER.includes(`"${href}"`), `${href} lost its way out of the footer`);
    }
  });

  it("DOES NOT POINT AT THE ADMIN DOOR FROM THREE HUNDRED PAGES", () => {
    // "Owner login" protected nothing — /admin is gated by lib/admin-auth.ts
    // and robots.ts disallows it — but it advertised the door to every visitor
    // and every crawler. The owner types the address.
    assert.doesNotMatch(FOOTER_PROSE, /"\/admin"/);
    assert.doesNotMatch(FOOTER_PROSE, /Owner login/);
    // "Sign in" stays: that one is for travellers, whose account holds their
    // own trips.
    assert.ok(FOOTER.includes('"/login"'));
  });

  it("OFFERS ADVERTISING, at the reason on the contact page rather than as a page that is not built", () => {
    assert.ok(FOOTER.includes('"/contact?reason=advertise"'));
  });

  it("still offers flights and hotels, without typing the address in", () => {
    // It used to be `href: "/book"`, which sent people to an access-code box
    // whenever the owner had that section locked. The entry is still there and
    // its target is resolved per render. See lib/booking-access.ts.
    assert.match(FOOTER, /booking\.href/);
    assert.match(FOOTER, /readBookingLink/);
    assert.doesNotMatch(FOOTER, /"\/book"/);
  });
});
