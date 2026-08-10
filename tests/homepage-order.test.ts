import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BUILT_IN_WORDS } from "@/data/site-words";
import { services } from "@/data/services";

/**
 * What the front page says, and in what order.
 *
 * THE FAILURE THIS GUARDS is not a broken page — it is a page that works
 * perfectly and tells a first-time visitor the wrong thing about the business.
 * The front page used to open "Two kinds of journeys", put the heritage card
 * before the vacation one, and show six kevarim before a single holiday. Every
 * one of those was right for a kevarim database and wrong for a company that
 * plans kosher vacations.
 *
 * An order is not something a type system can hold, so it is held here: the
 * source is read and the position of each section is compared. Crude, and it
 * catches the exact regression that matters.
 */

const HOME = readFileSync("app/page.tsx", "utf8");
const NOTICE = readFileSync("components/NewSiteNotice.tsx", "utf8");
const LAYOUT = readFileSync("app/layout.tsx", "utf8");
const FORM = readFileSync("components/StaySearchForm.tsx", "utf8");

/**
 * The page with the comments and the Tailwind stripped out.
 *
 * Both would give false positives on the content rules below: this file's own
 * comment explains why there are no testimonials, and `w-2/5` is a width
 * rather than a two-out-of-five star rating.
 */
const PROSE = HOME.replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "")
  .replace(/className=(\{`[\s\S]*?`\}|"[^"]*")/g, "");

/** Where a marker appears in the source, and a readable failure if it does not. */
function at(marker: string): number {
  const index = HOME.indexOf(marker);
  assert.ok(index >= 0, `the front page no longer contains ${JSON.stringify(marker)}`);
  return index;
}

describe("the first five seconds", () => {
  it("LEADS WITH THE VACATION PROPOSITION", () => {
    assert.match(BUILT_IN_WORDS.heroEyebrow, /kosher vacations/i);
    assert.match(BUILT_IN_WORDS.heroTitle, /vacation/i);
    assert.match(BUILT_IN_WORDS.heroSubtitle, /where to go|itinerary/i);
  });

  it("does not open with “two kinds of journeys”", () => {
    // The old eyebrow. It asked the visitor to classify themselves before
    // they had been told what the site does.
    assert.doesNotMatch(BUILT_IN_WORDS.heroEyebrow, /two kinds of journeys/i);
    assert.doesNotMatch(PROSE, /two kinds of journeys/i);
  });

  it("OPENS ON A SEARCH BOX, not on two invitations to read", () => {
    // Somebody arriving with a month in mind and a family to house had
    // nowhere to type it: the page led with "Start planning my trip" and
    // "Explore vacation ideas", and the question they came with went
    // unanswered until they had found their own way three pages in.
    const hero = HOME.slice(at('<section className="relative border-b'), at("What kind of trip are you planning?"));
    assert.match(hero, /<StaySearchForm id="hero" \/>/);
    assert.doesNotMatch(hero, /Start planning my trip/);
  });

  it("SENDS THE SEARCH TO OUR OWN PAGE, NOT STRAIGHT TO A PARTNER", () => {
    // The one decision on this page worth defending. Handing off a press
    // sooner earns the commission sooner and throws away the only reason to
    // search here: the quarter, the walk, and which alpine hotels are a
    // fortnight rather than a hotel.
    assert.match(FORM, /action="\/hotels"/);
    assert.doesNotMatch(FORM, /action="\/go"/);
  });

  it("carries the two hero links after it, in order", () => {
    const search = at("<StaySearchForm id=\"hero\" />");
    const secondary = at("Browse every destination");
    const tertiary = at("Planning a heritage journey? Start here");
    assert.ok(search < secondary, "a link comes before the search box");
    assert.ok(secondary < tertiary, "the heritage link comes before the vacation one");
  });
});

describe("the order of the page", () => {
  it("OFFERS ONE WAY TO PICK A KIND OF TRIP, not two", () => {
    // "What kind of trip are you planning?" sent you to /plan?kind= and
    // "Browse by the kind of holiday" sent you to /destinations?kind=, one
    // above the other, each a grid of the same sort of card. Two ways to say
    // "what sort of trip" on one page is a page that has not decided. The
    // destination categories stayed — they are the ones with places behind
    // them — and the planner is still one press from the hero.
    assert.doesNotMatch(PROSE, /What kind of trip are you planning\?/);
    assert.doesNotMatch(HOME, /TRIP_KINDS/, "the second trip-type grid is back");
    // `/plan?kind=heritage` stays: that is the heritage section's own button,
    // not a grid of trip types competing with the categories.
    assert.match(HOME, /Browse by holiday type/);
    // The hero's search carries the way out for somebody who has not chosen
    // a destination, which is what the trip-type grid was really for.
    assert.match(FORM, /helpHref = "\/plan"/);
    assert.match(FORM, /Not sure where/);
  });

  it("puts vacation content before heritage content", () => {
    // ACCEPTANCE CRITERION, restated as a test. The heritage section is a
    // section; it is not the page.
    const categories = at("Browse by holiday type");
    const destinations = at('id="destinations"');
    const heritage = at("Kevarim and the towns around them");
    assert.ok(categories < heritage, "the heritage section comes before the vacation categories");
    assert.ok(destinations < heritage, "the heritage section comes before the vacation destinations");
  });

  it("runs in the order somebody decides in", () => {
    const order = [
      "How it works",
      "Browse by holiday type",
      'id="destinations"',
      "Kosher hotels and programmes",
      "When to go",
      "Food, Shabbos and the rest of it",
      "Kevarim and the towns around them",
      "VERIFICATION_LINE}",
      "Start with a destination and a date",
    ].map(at);
    for (let i = 1; i < order.length; i += 1) {
      assert.ok(order[i] > order[i - 1], `section ${i + 1} of the front page has moved above section ${i}`);
    }
  });

  it("MAKES SEEING THE HOTELS THE DOMINANT ACTION ON A DESTINATION CARD", () => {
    // "Explore Rome" was the navy button, and it is the right first press for
    // somebody reading. A person looking at a row of destinations with dates
    // in mind is asking where they would sleep, and that question was two
    // pages away.
    const card = readFileSync("components/VacationCard.tsx", "utf8");
    const hotels = card.indexOf("See hotels in {destination.name}");
    const explore = card.indexOf("Explore {destination.name}");
    assert.ok(hotels > 0 && explore > 0);
    assert.ok(hotels < explore, "the hotels action is no longer first on the card");
    // First means the navy one, not merely the one written first.
    assert.match(card.slice(hotels - 400, hotels), /bg-\[var\(--navy\)\]/);
    // And it lands on our own page, which answers the quarter before it
    // offers a partner anything.
    assert.match(card, /staySearchHref\(\{ destination: destination\.name \}\)/);
  });

  it("BUILDS THE FEATURED STAYS FROM THE KASHRUS CLAIM, NOT BY HAND", () => {
    // An ordinary hotel chosen for the street it is on carries "none" and
    // cannot reach a section headed "places that make a kosher vacation
    // easier", however well placed it is.
    assert.match(HOME, /stay\.kosherClaim !== "none"/);
    assert.match(HOME, /featuredStays\.length > 0 &&/, "the section renders even with nothing in it");
  });

  it("OFFERS NO SEASON WITH NOTHING BEHIND IT", () => {
    const seasons = HOME.slice(at("When to go"), at("Food, Shabbos and the rest of it"));
    assert.match(seasons, /if \(count === 0\) return null/);
    assert.match(seasons, /href=\{`\/destinations\?season=\$\{season\.value\}`\}/);
  });

  it("SHOWS THREE DESTINATIONS, ON THE SHORT CARD", () => {
    // Six full cards were most of the scroll between the categories and the
    // two ways to plan, and each repeated the kosher and Shabbos answers that
    // its own page gives properly.
    assert.match(HOME, /\.slice\(0, 3\)/);
    assert.match(HOME, /<VacationCard key=\{card\.destination\.slug\} card=\{card\} compact \/>/);
    assert.match(HOME, /Browse all \{cards\.length\} destinations/);
  });

  it("SHOWS NO ROW OF EDITORIAL STATUS LABELS", () => {
    // The four badges — Verified, Reported, Being checked, Reconfirm before
    // travel — sat here as a row: the site's own grading, shown to a stranger
    // who had not asked whether there was any. AGENTS.md: do not expose
    // internal workflows or content status to customers. The grading itself is
    // unchanged underneath.
    assert.doesNotMatch(PROSE, /TRUST_ORDER/);
    assert.doesNotMatch(PROSE, /Being Checked|Reconfirm Before Travel/i);
    assert.doesNotMatch(HOME, /<VerificationBadge/);
  });

  it("STILL MAKES THE CLAIM, AND STILL LINKS TO WHAT TO CONFIRM", () => {
    // Dropping the labels must not drop the reason to trust the page. The
    // sentence says what has been checked and that each detail names a source;
    // the link goes to the five things a traveler should confirm themselves.
    assert.match(HOME, /checked against the place itself/);
    assert.match(HOME, /names where it came from/);
    assert.match(HOME, /href="\/verification"/);
    assert.doesNotMatch(PROSE, /straight-line distance|road routing/);
    assert.doesNotMatch(PROSE, /Somebody drives four hours/);
  });

  it("HIDES THE CATEGORY COUNTS", () => {
    // "1" beside Beach and resort says something about how far this section
    // has got rather than about the holiday. The counts stay on
    // /vacation-ideas, where somebody is choosing between filters.
    const categories = HOME.slice(at("Browse by holiday type"), at('id="destinations"'));
    assert.doesNotMatch(categories, /\{count\}/);
    // …but a category with nothing behind it is still not offered at all.
    assert.match(categories, /if \(count === 0\) return null/);
  });

  it("does not explain kosher food and Shabbos twice on one page", () => {
    // The long-form answers live on the destination pages. The front page
    // names the two questions; it does not answer them per destination.
    assert.doesNotMatch(PROSE, /never a guess to fill a gap/);
    assert.doesNotMatch(PROSE, /opening hours/i);
  });

  it("KEEPS PERSONAL BOOKING ASSISTANCE OFF THE FRONT PAGE", () => {
    // It exists, and it is offered inside Contact. A front page that offers to
    // arrange the trip for you is a page about an agency, and every commercial
    // section below it reads as a funnel into a phone call rather than as
    // something usable on its own.
    assert.doesNotMatch(PROSE, /Have us plan it/);
    assert.doesNotMatch(PROSE, /Tell us about the trip/);
    assert.doesNotMatch(PROSE, /href="\/contact"/);
    assert.doesNotMatch(PROSE, /href="\/services"/);
  });

  it("still offers the planner, which is a free tool rather than an offer to help", () => {
    assert.match(PROSE, /href="\/itinerary"/);
    assert.match(PROSE, /It is free/);
  });

  it("INVENTS NO TESTIMONIAL", () => {
    // The brief asked for testimonials "if real data is available". There is
    // none on this site and nowhere to read one from, so the section is absent
    // rather than filled with something plausible.
    assert.doesNotMatch(PROSE, /testimonial/i);
    assert.doesNotMatch(PROSE, /“[^”]{20,}”\s*—\s*[A-Z]/, "something on the front page reads like an attributed quote");
  });

  it("quotes no price and no star rating", () => {
    assert.doesNotMatch(PROSE, /[€$£]\s?\d/);
    assert.doesNotMatch(PROSE, /\b\d(\.\d)?\s*(stars?|\/\s*5)\b/i);
  });
});

describe("the new-site notice", () => {
  it("IS NOT A MODAL ANY MORE", () => {
    // It was the first thing every visitor met: a dialog over the front page,
    // before a word about what the site does.
    assert.doesNotMatch(NOTICE, /aria-modal/);
    assert.doesNotMatch(NOTICE, /role="dialog"/);
    // And it does not pretend to be one — a strip that traps focus or locks
    // the scroll is worse than a modal, not better.
    assert.doesNotMatch(NOTICE, /body\.style\.overflow/);
    assert.match(NOTICE, /<aside/);
  });

  it("is dismissible, once per wording", () => {
    assert.match(NOTICE, /DISMISS_KEY/);
    assert.match(NOTICE, /notice\.version/);
  });

  it("OFFERS THE THREE ACTIONS THE NOTICE HAS TO CARRY", () => {
    // How verification works, report an update, hide this notice. The third
    // used to read "I understand", which is not an action.
    assert.match(NOTICE, /How verification works/);
    assert.match(NOTICE, /href="\/verification"/);
    assert.match(NOTICE, /notice\.feedbackLabel/);
    assert.match(NOTICE, /onClick=\{close\}/);
  });

  it("SHOWS EVERY LINE THE OWNER CAN EDIT", () => {
    // The failure data/site-words.ts exists to end: a settings screen with a
    // field on it that no page reads.
    for (const field of ["heading", "body", "caution", "feedback", "feedbackHref", "feedbackLabel", "dismissLabel"]) {
      assert.ok(NOTICE.includes(`notice.${field}`), `notice.${field} is editable and shown nowhere`);
    }
  });

  it("is wired into the layout in place of the modal", () => {
    assert.match(LAYOUT, /NewSiteNotice/);
    assert.doesNotMatch(LAYOUT, /BetaNoticeModal/);
  });
});

describe("the services", () => {
  it("is the six that were asked for, in order", () => {
    assert.deepEqual(services.map((service) => service.id), [
      "vacation-planning",
      "itinerary-design",
      "flights-hotels-transport",
      "kosher-and-shabbos",
      "travel-essentials",
      "heritage-journeys",
    ]);
  });

  it("ANSWERS THE SAME SIX QUESTIONS FOR EVERY ONE", () => {
    // The old page was twelve cards with a line each: a visitor could read all
    // of them without learning who any was for or what it cost.
    for (const service of services) {
      assert.ok(service.who.length > 40, `${service.id}: who it is for`);
      assert.ok(service.included.length >= 3, `${service.id}: what is included`);
      assert.ok(service.process.length >= 2, `${service.id}: how it works`);
      assert.ok(service.receive.length >= 1, `${service.id}: what you end up with`);
      assert.ok(service.action.label && service.action.href.startsWith("/"), `${service.id}: next action`);
      assert.ok(service.pricing.length > 40, `${service.id}: what it costs`);
    }
  });

  it("says something real about price rather than “contact us”", () => {
    for (const service of services) {
      assert.doesNotMatch(service.pricing.trim(), /^contact us\.?$/i, service.id);
      // And never a figure, because there is no price list on this site to
      // stand behind one.
      assert.doesNotMatch(service.pricing, /[€$£]\s?\d/, `${service.id} quotes a price`);
    }
  });

  it("puts personal vacation planning first and heritage last", () => {
    assert.equal(services[0].id, "vacation-planning");
    assert.equal(services[services.length - 1].id, "heritage-journeys");
  });

  it("gives every next action somewhere real to go", () => {
    const known = new Set([
      "/plan",
      "/plan?kind=heritage",
      "/contact",
      "/itinerary",
      "/book",
      "/flight-booking-assistance",
      "/travel-guide",
      "/phone-rentals",
      "/kosher-travel",
      "/heritage",
    ]);
    for (const service of services) {
      assert.ok(known.has(service.action.href), `${service.id}: ${service.action.href}`);
      if (service.secondary) assert.ok(known.has(service.secondary.href), `${service.id}: ${service.secondary.href}`);
    }
  });
});
