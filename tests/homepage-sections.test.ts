import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { codeOf } from "./helpers/source";

/**
 * The front page listed its six sections twice: once as the Featured picture
 * cards, and again a screen further down as an underlined "Explore" list of
 * the same six names in the same order. Neither was wrong on its own — the
 * list was added when Featured showed DESTINATIONS, and became a copy of the
 * cards the day Featured became the sections themselves. Nobody re-read the
 * page afterwards.
 */

const PAGE = readFileSync("app/page.tsx", "utf8");
// The page's own comments RECORD these decisions in prose — "No 'trending',
// no counts" — so a naive read finds the note, not a breach of it.
const RENDERED = codeOf("app/page.tsx");
const FOOTER = readFileSync("components/Footer.tsx", "utf8");

/** Every href the front page links to, in order. */
function hrefs(source: string): string[] {
  return [...source.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
}

describe("the front page names each section once", () => {
  it("no href appears twice", () => {
    const all = hrefs(PAGE);
    const twice = all.filter((href, i) => all.indexOf(href) !== i);
    assert.deepEqual(twice, [], `the front page links to these more than once: ${twice.join(", ")}`);
  });

  it("the six Featured sections are still all there", () => {
    for (const href of ["/things-to-do", "/hotels", "/kosher", "/heritage", "/map", "/directory"]) {
      assert.ok(hrefs(PAGE).includes(href), `Featured lost ${href}`);
    }
  });

  it("the three ways in are untouched", () => {
    // lib/starting-points.ts names these; the front page carries all three.
    for (const href of ["/plan", "/itinerary"]) assert.ok(hrefs(PAGE).includes(href), `missing ${href}`);
  });

  it("there is no second list of the same sections", () => {
    assert.doesNotMatch(PAGE, /<h2[^>]*>Explore<\/h2>/);
    assert.doesNotMatch(PAGE, /label: "Jewish heritage"/);
  });
});

describe("nothing left the site, only the duplicate", () => {
  it("About and Verification moved to the footer rather than being dropped", () => {
    assert.match(FOOTER, /label: "About", href: "\/about"/);
    assert.match(FOOTER, /label: "Verification", href: "\/verification"/);
  });

  it("they are on the kosher footer — /verification is a kosher-guide page", () => {
    const kosher = FOOTER.slice(FOOTER.indexOf("const KOSHER_LINKS"), FOOTER.indexOf("const ITINERARIES_LINKS"));
    assert.match(kosher, /\/verification/);
    const itineraries = FOOTER.slice(FOOTER.indexOf("const ITINERARIES_LINKS"));
    assert.doesNotMatch(itineraries.slice(0, itineraries.indexOf("]")), /\/verification/);
  });
});

describe("what the owner settled about this page still holds", () => {
  it("the hero is still search only — no headline, eyebrow or pitch above it", () => {
    // Recorded in app/page.tsx: "The whole opening is the search, at the
    // owner's word". The <h1> is deliberately sr-only.
    assert.match(PAGE, /<h1 className="sr-only">/);
    assert.match(PAGE, /DestinationSearch id="home-hero-search"/);
  });

  it("Featured is the six SECTIONS, not ranked destinations", () => {
    // It used to be six destinations by what people opened; the owner asked
    // for the shape of the site instead. Re-ranking them would undo that.
    assert.match(PAGE, /FEATURED IS THE SITE'S SIX MAIN SECTIONS/);
    assert.doesNotMatch(RENDERED, /Popular now|Trending|trending/);
  });

  it("still no counts, prices or star ratings on the front page", () => {
    assert.doesNotMatch(RENDERED, /\d+\s+(?:listings|places|destinations|attractions|things to do)/i);
  });
});

describe("the six section cards are told apart above their labels", () => {
  const PAGE = readFileSync("app/page.tsx", "utf8");

  /**
   * EVERY ONE OF THEM DREW THE SAME AEROPLANE. The card's picture was
   * lib/default-photo.ts — the branded stand-in used wherever a section has no
   * image of its own — so the page whose whole job is to show a first-time
   * visitor the six shapes of the site showed them one picture six times.
   * Nothing separated Kosher food from Heritage above the label, which is the
   * only place a picture could have been doing any work.
   *
   * NOT SOLVED WITH PHOTOGRAPHS. Six licensed images is a purchase the owner
   * has not made, and a stock stand-in is worse than the default it replaces —
   * it claims to be somewhere. A mark on the site's own navy is what the
   * design system already owns.
   */
  it("each carries its own icon", () => {
    const block = PAGE.slice(PAGE.indexOf("const HOME_CATEGORIES"), PAGE.indexOf("export default async function Home"));
    const icons = [...block.matchAll(/icon: "([a-z-]+)"/g)].map((match) => match[1]);
    assert.equal(icons.length, 6, "not every section card has a mark");
    assert.equal(new Set(icons).size, 6, `two sections share a mark: ${icons.join(", ")}`);
  });

  it("every icon it names is one the set actually draws", () => {
    // A name with no drawing behind it renders an empty box, which is exactly
    // the blank the default photo existed to prevent.
    const block = PAGE.slice(PAGE.indexOf("const HOME_CATEGORIES"), PAGE.indexOf("export default async function Home"));
    const icons = [...block.matchAll(/icon: "([a-z-]+)"/g)].map((match) => match[1]);
    const set = readFileSync("components/icons/Icon.tsx", "utf8");
    for (const icon of icons) {
      assert.match(set, new RegExp(`^\\s*"?${icon}"?: \\(`, "m"), `Icon.tsx does not draw "${icon}"`);
      assert.match(set, new RegExp(`\\| "${icon}"`), `"${icon}" is not in IconName`);
    }
  });

  it("no longer paints the same photograph behind all six", () => {
    assert.doesNotMatch(PAGE, /backgroundImage: `url\(\$\{DEFAULT_PHOTO\}\)`/);
  });
});
