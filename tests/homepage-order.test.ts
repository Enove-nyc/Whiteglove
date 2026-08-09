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

  it("carries the three hero actions, in order of importance", () => {
    const primary = at("Start planning my trip");
    const secondary = at("Explore vacation ideas");
    const tertiary = at("Planning a heritage journey? Start here");
    assert.ok(primary < secondary, "the secondary button comes first");
    assert.ok(secondary < tertiary, "the heritage link comes before the vacation one");
  });

  it("MAKES THE MOST PROMINENT ACTION A TRIP-PLANNING ONE", () => {
    // The first CTA on the page, and it starts the flow rather than opening a
    // booking search or a contact form.
    const firstLink = HOME.slice(at('<section className="relative border-b')).match(/href="([^"]+)"/);
    assert.equal(firstLink?.[1], "/plan");
  });
});

describe("the order of the page", () => {
  it("puts vacation content before heritage content", () => {
    // ACCEPTANCE CRITERION, restated as a test. The heritage section is a
    // section; it is not the page.
    const selector = at("What kind of trip are you planning?");
    const categories = at("Browse by the kind of holiday.");
    const destinations = at('id="destinations"');
    const heritage = at("Travelling to kevarim?");
    assert.ok(selector < heritage, "the heritage section comes before the trip-type selector");
    assert.ok(categories < heritage, "the heritage section comes before the vacation categories");
    assert.ok(destinations < heritage, "the heritage section comes before the vacation destinations");
  });

  it("runs in the order somebody decides in", () => {
    const order = [
      "What kind of trip are you planning?",
      "Three steps, and you can stop after any of them.",
      "Browse by the kind of holiday.",
      'id="destinations"',
      "As much or as little of it as you want.",
      "The half of a trip nobody else plans for you.",
      "Travelling to kevarim?",
      "VERIFICATION_LINE}",
      "Where do you want to go?",
    ].map(at);
    for (let i = 1; i < order.length; i += 1) {
      assert.ok(order[i] > order[i - 1], `section ${i + 1} of the front page has moved above section ${i}`);
    }
  });

  it("SHOWS THREE DESTINATIONS, ON THE SHORT CARD", () => {
    // Six full cards were most of the scroll between the categories and the
    // two ways to plan, and each repeated the kosher and Shabbos answers that
    // its own page gives properly.
    assert.match(HOME, /\.slice\(0, 3\)/);
    assert.match(HOME, /<VacationCard key=\{card\.destination\.slug\} card=\{card\} compact \/>/);
    assert.match(HOME, /Browse all \{cards\.length\} destinations/);
  });

  it("STATES THE FOUR LABELS AND LINKS TO THE PAGE THAT EXPLAINS THEM", () => {
    // Exactly the sentence that was asked for. The four-bullet promise and the
    // two-paragraph panel that were here belong on /verification, which is
    // read at the moment somebody is deciding whether to rely on something.
    assert.match(
      HOME,
      /Every practical detail is labeled Verified, Reported, Being Checked, or Reconfirm Before Travel\./,
    );
    assert.match(HOME, /href="\/verification"/);
    assert.doesNotMatch(PROSE, /straight-line distance|road routing/);
    assert.doesNotMatch(PROSE, /Somebody drives four hours/);
  });

  it("HIDES THE CATEGORY COUNTS", () => {
    // "1" beside Beach and resort says something about how far this section
    // has got rather than about the holiday. The counts stay on
    // /vacation-ideas, where somebody is choosing between filters.
    const categories = HOME.slice(at("Browse by the kind of holiday."), at('id="destinations"'));
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

  it("offers both paths, and says which is free", () => {
    assert.ok(HOME.includes("Plan it yourself"));
    assert.ok(HOME.includes("Have us plan it"));
    assert.match(HOME, /Free, and yours/);
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
