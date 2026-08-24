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
/**
 * The car search, which is a tab on the booking page rather than a page.
 *
 * /cars was deleted: it ran the same partner search as that tab, and the one
 * thing it did that the tab did not — opening on the destination the visitor
 * came from — moved across with it. So the assertions that used to be made
 * against app/cars/page.tsx are made against these two instead.
 */
const BOOK = readFileSync("app/book/page.tsx", "utf8");
const PARTNERS = readFileSync("components/BookPartners.tsx", "utf8");
/** The bar without its comments, which explain why it is not a fixed one. */
const STICKY_CODE = STICKY.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** The page without its comments — those record what changed, deliberately. */
const PROSE = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the action that follows the page", () => {
  it("puts the planner's own actions in the hero, before any commercial one", () => {
    // The question a person holding dates is actually asking, and the one this
    // site answers better than a comparison site — which quarter, and what is
    // walkable for Shabbos. The planner action is the icon row now
    // (components/DetailActionRow.tsx) — favorite, route, itinerary — and it
    // comes before anything that hands off to a partner.
    const hero = PAGE.slice(PAGE.indexOf("<h1"), PAGE.indexOf('aria-label="On this page"'));
    assert.match(hero, /<DetailActionRow/, "the hero lost the planner's icon action row");
    const row = hero.indexOf("<DetailActionRow");
    const booking = hero.indexOf("DestinationBookingOptions");
    if (booking > 0) assert.ok(row < booking, "the commercial hand-off comes before the planner's actions");
  });

  it("CARRIES A STICKY ACTION, and it is sticky rather than fixed", () => {
    assert.match(PAGE, /<DestinationStickyCta\s+destination=\{destination\.name\}/);
    assert.match(STICKY, /className="sticky bottom-/);
    // Clears the mobile bottom bar (Search/Route/Itinerary/Account) below sm,
    // rather than sitting under it — see components/MobileBottomBar.tsx.
    assert.match(STICKY, /sm:bottom-0/);
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
    // Three buttons is no primary action at all. The filled look now comes
    // from the shared ACTION_BUTTON_CLASS.primary (lib/action-button.ts)
    // rather than a literal bg-[var(--navy)] in this file, so the count is
    // "how many places call it", not a substring match against this source.
    assert.match(STICKY, /import \{ ACTION_BUTTON_CLASS \} from "@\/lib\/action-button"/);
    const filled = STICKY.match(/ACTION_BUTTON_CLASS\.primary/g) ?? [];
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

  it("CARRIES THE DESTINATION TO A CAR SEARCH THAT READS IT", () => {
    // A link that says the site knows where you are going and then asks again
    // is worse than one that never claimed to. Both links go through
    // bookingHref rather than naming /book — see tests/booking-link.test.ts —
    // and both open the Cars tab with the place already in it.
    assert.match(PROSE, /bookingHref\(booking, \{ type: "cars", destination: destination\.name \}\)/);
    assert.match(PROSE, /carsHref=\{bookingHref\(booking, \{ type: "cars", destination: destination\.name \}\)\}/);
    assert.match(STICKY_CODE, /href=\{carsHref\}/);
    // And the booking page reads both halves of that link.
    assert.match(BOOK, /destination\?: string \| string\[\]/);
    assert.match(BOOK, /initialKind=\{initialKind\}/);
    assert.match(BOOK, /q\.type === "cars"/);
    // …and the Cars tab opens with that place already in its own field. It
    // used to be handed to an embedded partner panel instead; that panel has
    // gone, because White Glove now has live car prices of its own and the
    // panel's inventory was both thinner and duplicated underneath them.
    assert.doesNotMatch(PARTNERS, /carsEmbedPath/);
    assert.match(PARTNERS, /useState\(prefill\?\.destination \?\? ""\)/);
    assert.match(PARTNERS, /prefill\?\.destination/);
  });

  it("PREFILLS NO AIRPORT CODE IT DOES NOT HAVE", () => {
    // The flight form asks for a code; this site holds none for a vacation
    // destination, and several of them are regions with three airports.
    // Passing "The Dolomites" into a field labelled "e.g. FCO" opens the
    // partner on a search they may not understand.
    // /flights is gone — the flight search is a tab on the booking page — so
    // the link is bare there too, for the same reason. And the bar does not
    // type the booking path either: it is locked from the admin, so the page
    // resolves it and hands it down. See tests/booking-link.test.ts.
    assert.doesNotMatch(PROSE, /\/flights/);
    assert.doesNotMatch(STICKY_CODE, /\/flights/);
    assert.doesNotMatch(STICKY_CODE, /["'`]\/book/);
    assert.match(STICKY_CODE, /href=\{flightsHref\}/);
    assert.match(PROSE, /flightsHref=\{bookingHref\(booking, \{ type: "flights" \}\)\}/);
    // The flight prefill the booking page does accept is dates and airport
    // codes from the planner, which has both. The destination name is not one
    // of them, and must not quietly become one.
    assert.doesNotMatch(PARTNERS, /prefill\?\.destination[^\n]*legs/);
  });

  it("clamps what arrives on the car search rather than printing it", () => {
    // It lands in a text field as though the visitor typed it, and a link is
    // not a trustworthy author.
    assert.match(BOOK, /\.slice\(0, 80\)/);
    assert.match(BOOK, /Array\.isArray\(q\.destination\)/, "a repeated parameter would render as an array");
  });
});

describe("one affiliate disclosure, beside the booking actions", () => {
  /**
   * Legally required, so it is deduplicated rather than removed. The page's
   * commerce lives in DestinationBookingOptions, and the disclosure sits
   * there, adjacent to the actions it applies to — once. Travel Essentials is
   * a shared section that renders nothing until the owner configures a
   * hand-off, and carries its own disclosure for its own cards when it does.
   */
  const OPTIONS = readFileSync("components/DestinationBookingOptions.tsx", "utf8");

  it("RENDERS THE DISCLOSURE EXACTLY ONCE in the destination's own commerce", () => {
    assert.equal(OPTIONS.match(/<AffiliateDisclosure/g)?.length, 1, "the booking options repeat the disclosure");
    assert.doesNotMatch(PROSE, /AffiliateDisclosure/, "the page mounts a second disclosure of its own");
    assert.doesNotMatch(PROSE, /commission/i, "the page writes its own commission sentence beside the shared one");
  });

  it("keeps the per-card copies off — the section says it once above them", () => {
    const cards = OPTIONS.match(/showDisclosure=\{false\}/g) ?? [];
    const links = OPTIONS.match(/<BookingLink/g) ?? [];
    assert.equal(cards.length, links.length, "a BookingLink in the grid repeats the disclosure under its button");
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
