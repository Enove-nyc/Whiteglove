import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BUILT_IN_WORDS } from "@/data/site-words";

/**
 * The booking page is the search, and little else.
 *
 * WHAT IT USED TO CARRY, and no longer does. Below the fields sat a long "cash
 * or points, side by side" comparison, a "rest of the trip" panel explaining
 * which products are not bookable here, a "planning a heritage journey?" aside,
 * and an "if a search is not what you came for" list of the other doors. All
 * four were cut at the owner's word: somebody who reached this page has decided
 * to search, and a booking page that explains what it does not book — or offers
 * to send them elsewhere — is a booking page getting in the way of its one job.
 *
 * WHAT IT USED TO SAY, and still must not. It once compared "airlines and
 * routes to the towns your trip is built around" and explained how a booking
 * sits "alongside the kevarim and destinations the journey is actually built
 * around". Those sentences were written when the site was a heritage database
 * with a travel page attached, and a family booking a week in Rome read them as
 * evidence the page was not for them.
 */

const PAGE = readFileSync("app/book/page.tsx", "utf8");
const PANEL = readFileSync("components/BookPartners.tsx", "utf8");

/** The page without its comments — those record the history deliberately. */
const PROSE = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const PANEL_PROSE = PANEL.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("what the page is about", () => {
  it("IS NOT ABOUT KEVARIM ANY MORE", () => {
    for (const word of ["kever", "kevarim", "shomer", "beis hachaim"]) {
      assert.doesNotMatch(PROSE, new RegExp(word, "i"), `the booking page still talks about ${word}`);
      assert.doesNotMatch(PANEL_PROSE, new RegExp(word, "i"), `the search panel still talks about ${word}`);
    }
  });

  it("DOES NOT SINGLE OUT HERITAGE", () => {
    // The "planning a heritage journey? these tools work for that too" aside was
    // removed: the booking tools obviously work regardless of why somebody is
    // travelling, and heritage does not need repeatedly elevating on a general
    // booking page.
    assert.doesNotMatch(PROSE, /Planning a heritage journey/);
    assert.doesNotMatch(PROSE, /These booking tools work for that too/);
    assert.doesNotMatch(PROSE, /heritage/i);
  });

  it("opens on the destination, the dates and the kosher needs", () => {
    assert.match(BUILT_IN_WORDS.bookingNotice, /destination/i);
    assert.match(BUILT_IN_WORDS.bookingNotice, /dates/i);
    assert.match(BUILT_IN_WORDS.bookingNotice, /kosher/i);
    // Still the owner's line, or the settings screen has a field nothing reads.
    assert.match(PAGE, /\{words\.bookingNotice\}/);
  });
});

describe("the search is the page", () => {
  it("PUTS THE SEARCH ABOVE THE PROSE", () => {
    // A headline and the owner's notice are all that surround the panel, and the
    // notice reads after the fields, not before them.
    const panel = PAGE.indexOf("<BookPartners");
    const notice = PAGE.indexOf("{words.bookingNotice}");
    assert.ok(panel > 0 && notice > 0);
    assert.ok(panel < notice, "the owner's notice is still above the search");
  });

  it("keeps one short line of heading over it", () => {
    const beforePanel = PAGE.slice(PAGE.indexOf("<h1"), PAGE.indexOf("<BookPartners"));
    const paragraphs = beforePanel.match(/<p[\s>]/g) ?? [];
    assert.equal(paragraphs.length, 0, `${paragraphs.length} paragraphs still sit between the heading and the fields`);
  });

  it("DROPS THE LONG EDITORIAL SECTIONS BELOW THE SEARCH", () => {
    // Cut at the owner's word so the page does one job. Each of these was a
    // block of reading under a working search.
    assert.doesNotMatch(PROSE, /Cash or points, side by side/, "the cash-or-points comparison is still here");
    assert.doesNotMatch(PROSE, /The rest of the trip/, "the not-bookable explanation panel is still here");
    assert.doesNotMatch(PROSE, /We do not sell tickets yet/, "still explaining what it cannot book");
    assert.doesNotMatch(PROSE, /Drivers on a heritage route/, "still explaining what it cannot book");
    assert.doesNotMatch(PROSE, /If a search is not what you came for/, "still offering the other doors");
    assert.doesNotMatch(PROSE, /StartingPoints/, "the other-doors list is still rendered");
  });
});

describe("saving to the trip", () => {
  it("does not offer Add to my trip before a partner search", () => {
    // At search time the traveller has not chosen a hotel, flight or car yet.
    // The itinerary save belongs on the after-partner BookedPrompt, not on the
    // cash search action row.
    assert.doesNotMatch(PANEL_PROSE, /\+ Add to my trip/);
    assert.match(PANEL, /function BookedPrompt/);
    assert.match(PANEL_PROSE, /I booked it — add it to my trip/);
  });
});

describe("hotels first", () => {
  it("OPENS ON HOTELS, not on flights", () => {
    // Accommodation is the one product this site knows something a comparison
    // site does not — which quarter makes Shabbos walkable — so it is the tab
    // that earns the visit.
    // The default is the prop's default now, because a link may ask for a
    // particular tab: /cars folded into this page and redirects to
    // ?type=cars, which the page resolves and hands in. Absent that, hotels.
    assert.match(PANEL, /initialKind = "hotels"/);
    assert.match(PANEL, /useState<Kind>\(initialKind\)/);
    const tabs = PANEL.slice(PANEL.indexOf("What are you booking?"));
    // chooseKind, not setKind: the tab is written to the address bar as well
    // as to state, so a reload comes back to the search somebody was in the
    // middle of. See tests/travel-provider-layer.test.ts.
    const order = ["hotels", "flights", "cars"].map((kind) => tabs.indexOf(`chooseKind("${kind}")`));
    assert.ok(order[0] >= 0 && order[0] < order[1] && order[1] < order[2], "the tab order is not hotels, flights, cars");
  });
});

describe("the commission disclosure", () => {
  it("LIVES IN THE TERMS, not under the book search", () => {
    // The book panel used to repeat it under every search; it belongs with the
    // booking terms instead. Partner search forms still disclose beside their
    // own actions — see PartnerSearchForm and BookingLink.
    assert.doesNotMatch(PANEL, /\{disclosure\}/);
    assert.doesNotMatch(PAGE, /disclosure=\{words\.affiliateDisclosure\}/);
    const terms = readFileSync("app/terms/page.tsx", "utf8");
    assert.match(terms, /affiliateDisclosure/);
    assert.match(terms, /How this site is paid/);
  });

  it("says what it has to say", () => {
    assert.match(BUILT_IN_WORDS.affiliateDisclosure, /commission/i);
    assert.match(BUILT_IN_WORDS.affiliateDisclosure, /no additional cost/i);
  });

  it("is one editable line rather than a sentence typed into a component", () => {
    assert.doesNotMatch(PANEL_PROSE, /may earn a commission/i);
    assert.doesNotMatch(PROSE, /may earn a commission/i);
  });
});

describe("a date is called what that product calls it", () => {
  const FORM = readFileSync("components/PartnerSearchForm.tsx", "utf8");

  it("DOES NOT CHECK A CAR IN AND OUT", () => {
    // The labels used to be keyed off the field set rather than the product,
    // and cars share the "stay" fields because they also ask where and when —
    // so /cars asked a visitor to "check in" a hire car and "check out" of it.
    // A room is checked into; a car is picked up and dropped off.
    //
    // The car search has since moved into the booking panel, which names those
    // dates correctly on its own — so the row below guards the component
    // rather than a page today. It is kept because the component still accepts
    // a car product, and the failure it prevents is silent: a car search
    // rendered through here again would read as a hotel stay and nothing would
    // look broken.
    assert.match(FORM, /car:\s*\["Pick-up",\s*"Drop-off"\]/);
    assert.match(FORM, /hotel:\s*\["Check in",\s*"Check out"\]/);
    assert.match(FORM, /flight:\s*\["Leaving",\s*"Coming back"\]/);
    // And the wording is no longer decided by the field set anywhere.
    assert.doesNotMatch(FORM, /fields === "stay" \? "Check in"/);
    assert.doesNotMatch(FORM, /fields === "stay" \? "Check out"/);
  });

  it("GIVES A TRANSFER NO TWO-DATE FORM AT ALL", () => {
    // A transfer is one journey on one date, not a period with two ends.
    // There is no transfer row in the table, and there must not be one: the
    // hand-off is a landing link and the partner asks for the date. A row here
    // would build a form nothing renders and assert that a transfer spans two
    // dates while doing it.
    assert.doesNotMatch(FORM, /transfer:\s*\[/);
    const TRANSFERS = readFileSync("app/transfers/page.tsx", "utf8");
    assert.doesNotMatch(TRANSFERS, /PartnerSearchForm/);
    assert.doesNotMatch(TRANSFERS, /Check in|Check out/);
  });
});
