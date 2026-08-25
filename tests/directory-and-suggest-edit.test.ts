import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Two small findings from the audit, both about a customer reading a page
 * rather than about what is on it.
 */

const NAV = readFileSync("lib/navigation.ts", "utf8");
const HOME = readFileSync("app/page.tsx", "utf8");
const PAGES = readFileSync("data/pages.ts", "utf8");
const DIRECTORY = readFileSync("app/directory/page.tsx", "utf8");
const PANEL = readFileSync("components/SuggestEditPanel.tsx", "utf8");

describe('"Directory" is now called what it holds', () => {
  it("the nav, the front page and the CMS seed all say Local help", () => {
    assert.match(NAV, /label: "Local help", href: "\/directory"/);
    assert.match(HOME, /label: "Local help"/);
    assert.match(PAGES, /label: "Local help"/);
  });

  it("nothing customer-facing still calls it Directory", () => {
    for (const [name, src] of [["nav", NAV], ["home", HOME], ["directory page", DIRECTORY]] as const) {
      assert.doesNotMatch(src, /label: "Directory"/, `${name} still labels it Directory`);
    }
    assert.doesNotMatch(DIRECTORY, /White Glove directory<\/p>/);
  });

  it("the URL is unchanged — a rename must not break a link or an index", () => {
    // Every one of these still points at /directory; only the words moved.
    assert.match(NAV, /href: "\/directory"/);
    assert.match(HOME, /href: "\/directory"/);
    assert.match(PAGES, /href: "\/directory"/);
    assert.match(DIRECTORY, /path: "\/directory"/);
  });

  it("it says outright that these are other people's businesses", () => {
    // AGENTS.md: third-party planners may be listed, but the distinction from
    // White Glove itself has to be obvious — this page lists planners.
    assert.match(PAGES, /independent businesses, not White Glove/);
    assert.match(DIRECTORY, /independent businesses, not White Glove/);
    assert.match(HOME, /their businesses, not ours/);
  });
});

describe("Suggest edit is a pencil where it repeats, words where it does not", () => {
  it("compact renders the icon alone, with no visible words", () => {
    assert.match(PANEL, /\{compact \? null : "Suggest edit"\}/);
  });

  it("and no hidden duplicate of the label an aria-label already carries", () => {
    // aria-label replaces the button's contents for assistive technology, so
    // an sr-only span alongside it is a string nothing can reach — rendered
    // once per listing, on a page of well over a thousand.
    assert.doesNotMatch(PANEL, /sr-only">Suggest an edit/);
  });

  it("the accessible name survives, and names the listing", () => {
    // A page of a thousand identical "Suggest edit" buttons is unusable with a
    // screen reader; the label now says which listing it belongs to.
    assert.match(PANEL, /aria-label=\{compact \? `Suggest an edit to \$\{title\}` : undefined\}/);
    assert.match(PANEL, /title="Suggest an edit"/);
  });

  it("the compact target is still big enough to tap", () => {
    // An icon-only control has to keep the 44px touch target the words used
    // to give it, in both directions.
    const compactClass = PANEL.slice(PANEL.indexOf("const trigger = compact"), PANEL.indexOf(": \"inline-flex min-h-11 items-center gap-2"));
    assert.match(compactClass, /min-h-11/);
    assert.match(compactClass, /min-w-11/);
  });

  it("the full button keeps its words — one per page shouts at nobody", () => {
    assert.match(PANEL, /: "inline-flex min-h-11 items-center gap-2 rounded-md/);
    assert.ok(PANEL.includes('"Suggest edit"'), "the non-compact trigger lost its label");
  });

  it("the list views are the ones using compact", () => {
    for (const path of [
      "components/EateryDirectory.tsx",
      "components/KosherStayDirectory.tsx",
      "components/AttractionDirectory.tsx",
    ]) {
      assert.match(readFileSync(path, "utf8"), /<SuggestEditPanel[^/]*compact \/>/, `${path} should use the quiet trigger`);
    }
  });
});
