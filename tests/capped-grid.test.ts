import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CAPS } from "@/components/CappedGrid";

/**
 * THE COMPONENT AND THE STYLESHEET HAVE TO AGREE, AND NOTHING ELSE MAKES THEM.
 *
 * CappedGrid hides the overflow of a long list in CSS rather than dropping it
 * from the markup, so every detail link stays in the HTML a crawler is served
 * and display:none keeps a screen reader off rows nobody can see. The cost of
 * that choice is that the cap lives in two places: the component decides which
 * class to put on, and globals.css decides which children that class hides.
 * CSS cannot read the number — there is no nth-child(n + var(--cap)) — so this
 * file is the thing that notices when the two drift.
 *
 * The drift is silent. A cap of 6 with no matching rule renders the whole list
 * with a "Show all" button under it that does nothing, on a page nobody looks
 * at twice.
 *
 * WHY ANY OF IT EXISTS. An outside scan measured the directories on a phone:
 * /tzaddikim 70,685 pixels, /destinations 53,418, /hechsherim 39,211. Nothing
 * overflowed sideways, so all three were technically responsive and none was
 * usable — the search that narrows the list ended up tens of thousands of
 * pixels above the records it narrows.
 */

const CSS = readFileSync("app/globals.css", "utf8");

describe("the capped-list sizes match the rule that hides them", () => {
  for (const cap of CAPS) {
    it(`.wg-capped-${cap} hides everything past ${cap}`, () => {
      const rule = new RegExp(`\\.wg-capped-${cap} > \\*:nth-child\\(n \\+ ${cap + 1}\\)`);
      assert.match(CSS, rule, `globals.css has no rule for a cap of ${cap}`);
    });
  }

  it("is not shut inside a phone media query", () => {
    /**
     * IT WAS, AND FOR LONG ENOUGH TO BE MEASURED AND REPORTED AS DONE. The
     * rule was written into the max-width:640px block, so it had never once
     * applied above 640px. Every mobile figure it was verified against was
     * real, and every desktop page was untouched: /tzaddikim still 28,702px at
     * 1280, /hechsherim 23,915, /destinations 18,256 — all within a couple of
     * percent of what an outside review measured before any of the work, which
     * is exactly what that review reported back.
     *
     * A directory is unmanageable at every width. Nothing about a cap is a
     * phone rule, and the review's own numbers were desktop ones. Moved out:
     * /tzaddikim 9,773, /hechsherim 4,505, /destinations 3,699 at 1280, with
     * every link still in the markup.
     *
     * Checked by brace depth rather than by looking for a media query, because
     * "not inside any block at all" is the property that matters and there are
     * several other kinds of block it could be moved into by accident.
     */
    const at = CSS.indexOf(".wg-capped-6 > *");
    assert.ok(at > 0, "the capping rule is gone");
    let depth = 0;
    for (let i = 0; i < at; i += 1) {
      if (CSS[i] === "{") depth += 1;
      else if (CSS[i] === "}") depth -= 1;
    }
    assert.equal(depth, 0, `the capping rule is nested ${depth} block(s) deep, so it applies only conditionally`);
  });

  it("has no rule for a size the component cannot ask for", () => {
    const inCss = [...CSS.matchAll(/\.wg-capped-(\d+)/g)].map((m) => Number(m[1]));
    const extra = [...new Set(inCss)].filter((size) => !CAPS.includes(size as never));
    assert.deepEqual(extra, [], `globals.css styles caps CappedGrid does not offer: ${extra.join(", ")}`);
  });
});

describe("the long directories are capped", () => {
  /**
   * Named one by one rather than by a scan, because these are the six pages
   * the measurements were taken on and the point is that each of them stays
   * capped — not that some page somewhere uses the component.
   *
   * /cemeteries is deliberately absent: it already pages against the server,
   * and a second "show all" beside its "Show more" would be two controls
   * doing the same job differently.
   */
  const capped = [
    ["components/TzaddikimDirectory.tsx", "/tzaddikim"],
    ["components/VacationIdeasHub.tsx", "/destinations"],
    ["components/HechsherimDirectory.tsx", "/hechsherim"],
    ["app/mikvaos/page.tsx", "/mikvaos"],
  ] as const;

  for (const [file, page] of capped) {
    it(`${page} does not render its whole list at once`, () => {
      assert.match(readFileSync(file, "utf8"), /<CappedGrid/, `${file} draws every record on one screen`);
    });
  }

  it("keeps the search box in reach on a list that long", () => {
    // The filters used to scroll away thousands of pixels above the records
    // they filter, which is half of why these pages were unusable rather than
    // merely long. top-16 is the header's own scrolled height.
    const TOOLBAR = readFileSync("components/ListToolbar.tsx", "utf8");
    assert.match(TOOLBAR, /sticky top-16 z-\[var\(--wg-z-list-toolbar\)\]/);
    assert.match(CSS, /--wg-z-list-toolbar: 35;/);
    // Under the site header, never over it.
    assert.match(CSS, /--wg-z-header: 40;/);
  });

  it("gives the mark directory a way to look a mark up", () => {
    // The page exists for somebody holding a package with an unfamiliar
    // hechsher on it, and answered that by printing 287 agencies under 81
    // region headings with no search box anywhere on it.
    const DIR = readFileSync("components/HechsherimDirectory.tsx", "utf8");
    assert.match(DIR, /<ListToolbar/);
    assert.match(DIR, /agency\.mark/, "searching only names misses somebody typing what is in the circle");
    assert.match(DIR, /agency\.aliases/);
  });
});

describe("nothing on the root element stops a sticky thing sticking", () => {
  /**
   * THE STICKY TOOLBAR ABOVE SHIPPED BROKEN, AND SO HAS THE HEADER ALL ALONG.
   *
   * `html` carried `overflow-x: hidden`, which makes the root element a scroll
   * container — and a scroll container between a `position: sticky` element
   * and the viewport is the thing that element sticks to. Every sticky rule on
   * this site therefore resolved against a box that never scrolls. Navbar's
   * `sticky top-0` has been decorative since it was written, and the search
   * bar the test above pins was landing in exactly the same state.
   *
   * Measured in a browser on /tzaddikim, scrolled to 6,000px: with any
   * non-visible overflow-x on html the header sat at -3,729 and the search bar
   * at -3,292; with html left alone, 0 and 64. `clip` behaves the same as
   * `hidden` here — the trap is the root element, not the keyword, which is
   * why swapping the keyword was tried first and changed nothing.
   */
  it("leaves html's overflow alone", () => {
    const html = CSS.match(/^html \{[^}]*\}/m)?.[0] ?? "";
    assert.ok(html, "the html rule went missing");
    assert.doesNotMatch(
      html,
      /overflow/,
      `html must not set overflow — it makes the root a scroll container and every sticky element on the site stops sticking: ${html}`,
    );
  });

  it("still guards against sideways scroll, on body", () => {
    // body is not the scrollport, so the guard costs no sticky behaviour
    // there. Twenty pages were swept at 390 and 768 after the change and none
    // scrolls sideways; the one element that did — the contact address on
    // /about, set in uppercase at 0.12em tracking and 403px wide on a 390px
    // phone — was fixed rather than hidden again.
    const body = CSS.slice(CSS.indexOf("html { scroll-behavior"));
    assert.match(body.slice(0, body.indexOf("}", body.indexOf("body {"))), /overflow-x: clip/);
    assert.doesNotMatch(
      readFileSync("app/about/page.tsx", "utf8"),
      /uppercase tracking-\[0\.12em\] text-white/,
      "the contact address is set as a label again, and is wider than a phone",
    );
  });
});

describe("the disclosure says whether there is more, not how much more", () => {
  const GRID = readFileSync("components/CappedGrid.tsx", "utf8");

  it("prints no item count", () => {
    // The site refuses "showing 12 of 149" everywhere else
    // (tests/list-toolbar.test.ts), and "Show all 154" is the same number in a
    // different coat. What a reader needs to know is whether there is more,
    // and the button being there says so.
    assert.match(GRID, /"Show more"/);
    assert.doesNotMatch(GRID, /: showAllLabel/);
    for (const file of [
      "components/TzaddikimDirectory.tsx",
      "components/VacationIdeasHub.tsx",
      "components/HechsherimDirectory.tsx",
      "app/mikvaos/page.tsx",
    ]) {
      const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      assert.doesNotMatch(source, /of=\{`[^`]*\$\{[^}]*\.(length|size)/, `${file} puts a count in the button's name`);
    }
  });

  it("names each one, because a page has eleven of them", () => {
    // Eleven buttons all reading "Show more" are eleven identical rows in the
    // list of controls a screen reader offers.
    assert.match(GRID, /sr-only"> \{of\}/);
  });
});

describe("the quarters list is shortened without hiding it", () => {
  const QUARTERS = readFileSync("components/StayQuarters.tsx", "utf8");

  /**
   * IT WAS OVER HALF OF /hotels. Thirty-two quarters in one column came to
   * 7,512 pixels, above the directory somebody came for — and the stay cards,
   * which is where the work had gone, were only 2,627 of the page. The first
   * diagnosis was wrong and halving the card page size fixed almost nothing;
   * the rows themselves are lean and it was running them down the middle of a
   * 1280px page that cost the height. Two columns on a desktop: 15,412 to
   * 11,919, with every card still drawn.
   */
  it("is laid out in two columns rather than one on a desktop", () => {
    assert.match(QUARTERS, /md:grid md:grid-cols-2/);
  });

  it("is NOT capped, and must not be", () => {
    /**
     * Every one of these rows is an anchor that /stops, the map, the search
     * index and the admin link straight to — /hotels#rome-ghetto. CappedGrid
     * hides its overflow with display:none, and an anchor inside display:none
     * is a link that lands nowhere: the browser has nothing to scroll to.
     *
     * So this is the one long list on the site that stays whole. If it is ever
     * capped, the cap has to open itself on a matching hash first.
     */
    assert.doesNotMatch(QUARTERS, /<CappedGrid|wg-capped-/, "the quarter anchors are hidden, so the links to them land nowhere");
    assert.match(QUARTERS, /id=\{area\.slug\}/);
    const linkers = ["app/stops/page.tsx", "components/MapExplorer.tsx", "lib/attraction-search.ts"];
    for (const file of linkers) {
      assert.match(readFileSync(file, "utf8"), /\/hotels#/, `${file} no longer links into the quarters`);
    }
  });

  it("says how distances are measured once, not on every card", () => {
    // The same small-print sentence was at the foot of all twenty-four stay
    // cards. It is a fact about how the list measures, so it belongs to the
    // list.
    // Comments out: the note explaining this rule quotes the sentence it
    // removed, and matching prose rather than code has caught the explanation
    // instead of the thing three times in this session.
    const stays = readFileSync("components/KosherStayDirectory.tsx", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    assert.equal(stays.match(/not from the building itself/g)?.length, 1);
    assert.doesNotMatch(stays.slice(stays.indexOf("{visible.map")), /not from the building itself/);
  });
});
