import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BUILT_IN_WORDS } from "@/data/site-words";

/**
 * What the front page says, and in what order.
 *
 * THE FAILURE THIS GUARDS is not a broken page — it is a page that works
 * perfectly and tells a first-time visitor the wrong thing about the business.
 * The front page has been, in turn, a kevarim database with a travel page
 * bolted on, and then an eleven-section brochure that explained holiday
 * types, seasons, stays and resources that all have their own pages. Both
 * were pages about the site standing between the visitor and the site.
 *
 * THE PAGE IS NOW A DOOR: one place-picture hero with the site-wide search in
 * it, a Featured row chosen by what people actually open, and the three free
 * ways in. An order is not something a type system can hold, so it is held
 * here: the source is read and the position of each piece is compared. Crude,
 * and it catches the exact regression that matters.
 */

const HOME = readFileSync("app/page.tsx", "utf8");
const NOTICE = readFileSync("components/NewSiteNotice.tsx", "utf8");
const LAYOUT = readFileSync("app/layout.tsx", "utf8");
const FORM = readFileSync("components/StaySearchForm.tsx", "utf8");
const FEATURED_LIB = readFileSync("lib/featured-destinations.ts", "utf8");

/**
 * The page with the comments and the Tailwind stripped out.
 *
 * Both would give false positives on the content rules below: this file's own
 * comments explain why the row never says "trending", and `w-2/5` is a width
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

  it("IS A PLACE AND A SEARCH: brand words, then the search, nothing between", () => {
    // The hero used to carry three labelled tools behind tabs. Three
    // intentions is a menu; a first visit is a question. One search, at hero
    // size, that finds destinations, stays, kosher food and the heritage side
    // alike — and every result lands on one of our own pages.
    const eyebrow = at("{words.heroEyebrow}");
    const title = at("{words.heroTitle}");
    const subtitle = at("{words.heroSubtitle}");
    const search = at("<DestinationSearch");
    assert.ok(eyebrow < title, "the eyebrow has moved below the headline");
    assert.ok(title < subtitle, "the supporting hero copy has moved above the title");
    assert.ok(subtitle < search, "the search has moved above the words that explain it");
  });

  it("LETS THE OWNER'S WORDS REACH THE SEARCH BOX", () => {
    // words.searchPlaceholder is editable at /admin/settings/words. Before
    // this, the homepage box read the built-in default and the owner's edit
    // showed everywhere except the one page he would check.
    assert.match(HOME, /placeholder=\{words\.searchPlaceholder\}/);
  });

  it("SENDS THE SEARCH TO OUR OWN PAGES, NOT STRAIGHT TO A PARTNER", () => {
    // The one decision worth defending, wherever the search lives. Handing
    // off a press sooner earns the commission sooner and throws away the only
    // reason to search here: the quarter, the walk, and which alpine hotels
    // are a fortnight rather than a hotel. The hero search asks our own
    // index; the stay search, one press away on /hotels, still lands on
    // /hotels rather than on /go.
    const search = readFileSync("components/DestinationSearch.tsx", "utf8");
    assert.match(search, /\/api\/search/);
    assert.match(FORM, /action="\/hotels"/);
    assert.doesNotMatch(FORM, /action="\/go"/);
  });

  it("carries the two hero links after the search, in order", () => {
    // "Planning a heritage journey? Start here" stays by the owner's word —
    // tests/no-questions.test.ts names it as one of the visitor's own
    // questions. A quiet link, not a section: heritage is part of the
    // destination directory now, not a second site.
    const search = at("<DestinationSearch");
    const secondary = at("Browse every destination");
    const tertiary = at("Planning a heritage journey? Start here");
    assert.ok(search < secondary, "a link comes before the search");
    assert.ok(secondary < tertiary, "the heritage link comes before the destinations one");
  });
});

describe("the featured row", () => {
  it("IS CHOSEN BY USE, from the trailing week, with a written fallback", () => {
    // Six destinations somebody picked once is a row that goes stale the day
    // it ships. The row reads the last seven day-buckets of opened
    // destinations and tops up from FEATURED_FALLBACK while the data is thin
    // — the merge itself is tested in tests/featured-destinations.test.ts.
    assert.match(HOME, /featuredDestinations\(6\)/);
    assert.match(FEATURED_LIB, /topSearchedDestinations/);
    assert.match(FEATURED_LIB, /FEATURED_FALLBACK/);
  });

  it("NEVER SAYS WHY A CARD IS THERE", () => {
    // "Trending" and "most searched" are traffic figures in disguise, and on
    // a young site they announce the traffic. The heading is one word; the
    // selection mechanism is the site's business.
    assert.ok(/Featured\s*<\/h2>/.test(HOME), "the Featured heading is gone or carries extra words");
    assert.doesNotMatch(PROSE, /trending|most[- ]searched|most popular|people are (searching|booking)/i);
  });

  it("PUTS PHOTOGRAPH-POSITION, NAME AND COUNTRY ON THE CARD, AND NOTHING ELSE", () => {
    // The destination's own page carries the why-go, the kosher and Shabbos
    // answers and the two ways in. A front-page card that repeats them is the
    // brochure creeping back one field at a time.
    const cards = HOME.slice(at("featured.map"), at("<StartingPoints"));
    assert.match(cards, /destination\.name/);
    assert.match(cards, /destination\.country/);
    assert.doesNotMatch(cards, /whyGo|SignalChip|bestFor|suggestedLength/, "editorial fields are back on the featured card");
    assert.doesNotMatch(cards, /Explore |See hotels|Learn more|View details|Discover/, "a CTA label is back on the featured card");
  });

  it("MAKES THE WHOLE CARD ONE LINK", () => {
    // One action, so a screen reader lists "Rome" rather than "Open" six
    // times — and there is no second button for a swallowed click to find.
    const cards = HOME.slice(at("featured.map"), at("<StartingPoints"));
    assert.equal(cards.match(/<Link/g)?.length, 1, "a featured card carries more than one link");
  });

  it("PUBLISHES NO COUNT AND NO TOTAL", () => {
    // "Browse all 21 destinations" was a sentence about how far the site has
    // got, not about the holiday. The rule is site-wide now: no public counts
    // of anything, here or on the hub cards.
    assert.doesNotMatch(HOME, /cards\.length|kevarim\.length|guides\.length/);
    assert.doesNotMatch(PROSE, /\b\d+ (destinations|kevarim|guides|hotels|stays)\b/i);
    const hub = readFileSync("app/destinations/(hub)/page.tsx", "utf8");
    const hubCards = hub.slice(hub.indexOf("Browse by holiday type"), hub.indexOf('id="browse"'));
    assert.doesNotMatch(hubCards, /\{count\} destination/);
  });
});

describe("the order of the page", () => {
  it("runs hero, Featured, then the three ways in", () => {
    const search = at("<DestinationSearch");
    const featured = HOME.search(/Featured\s*<\/h2>/);
    const doors = at("<StartingPoints");
    assert.ok(featured > search, "the Featured row has moved above the hero");
    assert.ok(doors > featured, "the three ways in have moved above the Featured row");
  });

  it("CARRIES NONE OF THE BROCHURE SECTIONS", () => {
    // Each of these was a real section and each has a real home: holiday
    // types and seasons on /destinations, the kosher stays on /hotels, the
    // resources on /kosher-travel, and the heritage side inside the
    // destination directory and Kosher — no longer a separate front-page
    // section. A front page that repeats its own site is a brochure; the
    // sections went there, not away.
    for (const heading of [
      "How it works",
      "Browse by holiday type",
      "When to go",
      "Kosher hotels and programmes",
      "Food, Shabbos and the rest of it",
      "Kevarim and the towns around them",
    ]) {
      assert.doesNotMatch(PROSE, new RegExp(heading), `"${heading}" is back on the front page`);
    }
  });

  it("OFFERS ONE SEARCH, NOT THREE COMPETING FORMS", () => {
    // Search / Ask / Plan lived here as tabs. Ask lives on /itinerary and the
    // stay search on /hotels — both one press away, neither lost. What the
    // front page must not do is put three forms in front of somebody who has
    // typed nothing yet.
    assert.doesNotMatch(HOME, /<HomeDiscoveryTools|<StaySearchForm|<TravelAssistantBox/);
    assert.equal(HOME.match(/<DestinationSearch/g)?.length, 1);
  });

  it("does not explain kosher food and Shabbos twice on one page", () => {
    // The long-form answers live on the destination pages. The front page
    // does not answer them per destination — or at all: the search finds the
    // page that does.
    assert.doesNotMatch(PROSE, /never a guess to fill a gap/);
    assert.doesNotMatch(PROSE, /opening hours/i);
  });

  it("KEEPS PERSONAL BOOKING ASSISTANCE OFF THE FRONT PAGE", () => {
    // The service was removed outright at the owner's word — not demoted, not
    // moved behind Contact. A front page that offers to arrange the trip for
    // you is a page about an agency, and every commercial link on it would
    // read as a funnel into a phone call rather than as something usable on
    // its own.
    assert.doesNotMatch(PROSE, /Have us plan it/);
    assert.doesNotMatch(PROSE, /Tell us about the trip/);
    assert.doesNotMatch(PROSE, /href="\/contact"/);
    assert.doesNotMatch(PROSE, /href="\/services"/);
  });

  it("FINISHES ON THE THREE FREE WAYS IN, and names them from one place", () => {
    // /plan, /itinerary and /book, described once in lib/starting-points.ts so
    // the same three doors are not called six different things across the
    // site. Personal planning is not a fourth door — it does not exist.
    assert.match(HOME, /<StartingPoints/);
    assert.doesNotMatch(HOME, /\/services/, "the front page still names the removed service");
    const points = readFileSync("lib/starting-points.ts", "utf8");
    for (const href of ["/plan", "/itinerary", "/book"]) {
      assert.ok(points.includes(`href: "${href}"`), `${href} is not one of the starting points`);
    }
    assert.doesNotMatch(points, /\/services/, "a fourth, removed door is still named here");
  });

  it("still offers the planner, which is a free tool rather than an offer to help", () => {
    const points = readFileSync("lib/starting-points.ts", "utf8");
    assert.match(points, /href: "\/itinerary"/);
    assert.doesNotMatch(points, /"Paid"/, "a starting point still claims to be paid work");
  });

  it("LEAVES THE VERIFICATION CLAIM TO THE NOTICE", () => {
    // The one-sentence verification paragraph sat here as section eleven. The
    // site-wide notice already carries the door to /verification on every
    // page — the assertion lives in the notice block below — and a second
    // copy on the front page was the site explaining itself to somebody who
    // had not asked. The claim moved, it did not soften: what a page has
    // checked, it still sources and dates where the detail is printed.
    assert.doesNotMatch(PROSE, /Where a practical detail has been checked/);
    assert.doesNotMatch(PROSE, /straight-line distance|road routing/);
  });

  it("INVENTS NO TESTIMONIAL", () => {
    // Real case studies may appear when approved in admin — the homepage only
    // mounts CaseStudiesSection, which returns null with an empty list. No
    // seeded quote lives in the page source.
    assert.doesNotMatch(PROSE, /testimonial/i);
    assert.match(HOME, /CaseStudiesSection/);
    assert.doesNotMatch(PROSE, /“[^”]{20,}”\s*—\s*[A-Z]/, "something on the front page reads like an attributed quote");
  });

  it("quotes no price and no star rating", () => {
    assert.doesNotMatch(PROSE, /[€$£]\s?\d/);
    assert.doesNotMatch(PROSE, /\b\d(\.\d)?\s*(stars?|\/\s*5)\b/i);
  });
});

describe("the new-site notice", () => {
  it("IS A DISMISSIBLE POPUP, not a page strip", () => {
    // A strip under the top of every page pushed the brand down and read as
    // chrome. The caution is a dialog: labelled, modal, escapable, and gone
    // once per wording.
    assert.match(NOTICE, /role="dialog"/);
    assert.match(NOTICE, /aria-modal="true"/);
    assert.match(NOTICE, /useFocusTrap/);
    assert.match(NOTICE, /body\.style\.overflow/);
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

  it("is wired into the layout", () => {
    assert.match(LAYOUT, /NewSiteNotice/);
  });
});
