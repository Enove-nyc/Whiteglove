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
