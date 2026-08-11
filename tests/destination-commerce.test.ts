import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { vacationDestinations } from "@/data/vacation-destinations";
import { citiesFor, staySearchHref } from "@/lib/stay-search";

/**
 * What a destination page asks somebody to do next.
 *
 * THE PAGE IS LONG, and that is correct: eleven sections, with the practical
 * ones — food, Shabbos, getting around — near the bottom, because that is the
 * order somebody decides in. The cost of it is that by the time a family has
 * read what Shabbos looks like in Rome and decided they can do it, every
 * button is two thousand pixels above them.
 *
 * So the action rides the bottom of the viewport. STICKY, not fixed: a fixed
 * bar is on top of the page for ever, and at 200% text it eats a third of a
 * phone screen and covers the line you are reading. This one is in the flow at
 * the end of the article, so it lets go before the footer.
 *
 * AND THE OFFER THAT CAME OFF THIS PAGE. "Have us plan Rome" sat beside the
 * first button in the hero and again at the foot. It is a real service and it
 * is offered inside Contact; on the most commercial page on the site it made
 * every section above it read as a funnel into a phone call.
 */

const PAGE = readFileSync("app/destinations/[destination]/page.tsx", "utf8");
const STICKY = readFileSync("components/DestinationStickyCta.tsx", "utf8");
const CARS = readFileSync("app/cars/page.tsx", "utf8");
/** The bar without its comments, which explain why it is not a fixed one. */
const STICKY_CODE = STICKY.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** The page without its comments — those record what changed, deliberately. */
const PROSE = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the action that follows the page", () => {
  it("LEADS THE HERO WITH PLACES TO STAY", () => {
    // The question a person holding dates is actually asking, and the one this
    // site answers better than a comparison site — which quarter, and what is
    // walkable for Shabbos.
    const hero = PAGE.slice(PAGE.indexOf("<h1"), PAGE.indexOf('aria-label="On this page"'));
    const stay = hero.indexOf("See places to stay in {destination.name}");
    const trip = hero.indexOf("Add {destination.name} to a trip");
    assert.ok(stay > 0, "the hero no longer offers places to stay");
    assert.ok(trip > 0 && stay < trip, "the planner comes before the commercial action");
    assert.match(hero.slice(stay - 400, stay), /bg-\[var\(--navy\)\]/, "the stay action is not the filled button");
  });

  it("CARRIES A STICKY ACTION, and it is sticky rather than fixed", () => {
    assert.match(PAGE, /<DestinationStickyCta destination=\{destination\.name\} \/>/);
    assert.match(STICKY, /sticky bottom-0/);
    assert.doesNotMatch(STICKY_CODE, /\bfixed\b/, "a fixed bar covers the page it is about");
  });

  it("puts the sticky bar inside the article, so the footer is never under it", () => {
    // If it sat after the closing </div> of the article column it would ride
    // the viewport past the last section and the small print.
    const bar = PAGE.indexOf("<DestinationStickyCta");
    const closingCta = PAGE.indexOf("Ready to book {destination.name}?");
    assert.ok(bar > 0 && closingCta > 0 && bar < closingCta);
  });

  it("HAS ONE PRIMARY ACTION IN THE BAR, not three equal ones", () => {
    // Three buttons is no primary action at all.
    const filled = STICKY.match(/bg-\[var\(--navy\)\]/g) ?? [];
    assert.equal(filled.length, 1, `${filled.length} filled buttons in the sticky bar`);
    assert.match(STICKY, /See places to stay/);
    assert.match(STICKY, />\s*Flights\s*</);
    assert.match(STICKY, /Car hire/);
  });

  it("gives every control a real touch target", () => {
    const targets = STICKY.match(/min-h-11/g) ?? [];
    assert.equal(targets.length, 3, "a control in the sticky bar is under 44px");
  });
});

describe("what the commercial links promise", () => {
  it("SENDS THE STAY SEARCH TO A PAGE THAT ANSWERS IT", () => {
    assert.match(PAGE, /staySearchHref\(\{ destination: destination\.name \}\)/);
    // And the destination names resolve there, or the search lands on an
    // empty page for a place the site has written a whole page about.
    for (const destination of vacationDestinations) {
      assert.ok(citiesFor(destination.name), `${destination.name} resolves to nothing on /hotels`);
      const href = staySearchHref({ destination: destination.name });
      assert.match(href, /^\/hotels\?destination=/, destination.name);
      // And it survives the trip back out of the query string, apostrophes,
      // accents and all — "Nice and the Côte d'Azur" is a real destination.
      const back = new URLSearchParams(href.split("?")[1]).get("destination");
      assert.equal(back, destination.name);
    }
  });

  it("CARRIES THE DESTINATION TO A CAR PAGE THAT READS IT", () => {
    // A link that says the site knows where you are going and then asks again
    // is worse than one that never claimed to.
    assert.match(PAGE, /\/cars\?destination=\$\{encodeURIComponent\(destination\.name\)\}/);
    assert.match(STICKY, /\/cars\?destination=\$\{encodeURIComponent\(destination\)\}/);
    assert.match(CARS, /searchParams: Promise<\{ destination\?: string \| string\[\] \}>/);
    assert.match(CARS, /destinationValue=\{pickUp\}/);
  });

  it("PREFILLS NO AIRPORT CODE IT DOES NOT HAVE", () => {
    // The flight form asks for a code; this site holds none for a vacation
    // destination, and several of them are regions with three airports.
    // Passing "The Dolomites" into a field labelled "e.g. FCO" opens the
    // partner on a search they may not understand.
    assert.doesNotMatch(PROSE, /\/flights\?/);
    assert.doesNotMatch(STICKY, /\/flights\?/);
    assert.match(STICKY, /href="\/flights"/);
  });

  it("clamps what arrives on the car page rather than printing it", () => {
    // It lands in a text field as though the visitor typed it, and a link is
    // not a trustworthy author.
    assert.match(CARS, /\.slice\(0, 80\)/);
    assert.match(CARS, /Array\.isArray\(raw\)/, "a repeated parameter would render as an array");
  });
});

describe("personal assistance is not on this page", () => {
  it("OFFERS IT NOWHERE, IN WORDS OR IN LINKS", () => {
    for (const pattern of [/Have us plan/i, /hand it over/i, /somebody else did the arranging/i, /\/contact\?trip=/]) {
      assert.doesNotMatch(PROSE, pattern, "the destination page offers to arrange the trip");
    }
  });

  it("closes on booking rather than on a choice between us and you", () => {
    assert.match(PROSE, /Ready to book \{destination\.name\}\?/);
    assert.match(PROSE, /come from our booking partners/);
  });
});
