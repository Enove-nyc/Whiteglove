import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * The one toolbar every long public list shares, and the redesign rules it
 * carries for all of them at once: one search bar, the selects behind a
 * single Filter control, each set filter as a small removable tag, and no
 * result totals anywhere — "how many" is not something a public page says.
 */

const TOOLBAR = readFileSync("components/ListToolbar.tsx", "utf8");
const TOOLBAR_CODE = TOOLBAR.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const CONSUMERS = [
  "components/CemeteryDirectory.tsx",
  "components/EateryDirectory.tsx",
  "components/KosherStayDirectory.tsx",
  "components/AttractionDirectory.tsx",
  // The kevarim directory: search by the name a person is known by, through
  // the same toolbar and matcher, with the same no-counts rule.
  "components/TzaddikimDirectory.tsx",
];

describe("the shared list toolbar", () => {
  it("PRINTS NO COUNTS — no totals, no showing-x-of-y", () => {
    assert.doesNotMatch(TOOLBAR_CODE, /showing|total|\bnoun\b/i, "count-shaped props are back");
    assert.doesNotMatch(TOOLBAR_CODE, /\{\s*\w+\.length\s*\}/, "a length is rendered");
  });

  it("keeps the selects behind one Filter control", () => {
    assert.match(TOOLBAR, /<details/);
    assert.match(TOOLBAR, /Filter\b/);
  });

  it("shows each set filter as a removable tag, cleared with one press", () => {
    assert.match(TOOLBAR, /setFilters\.map/);
    assert.match(TOOLBAR, /aria-label=\{`Remove filter: /);
    assert.match(TOOLBAR, /filter\.onChange\(""\)/);
  });

  it("says \"No results\" in words, with a way back", () => {
    assert.match(TOOLBAR, /No results\./);
    assert.match(TOOLBAR, /role="status"/);
  });
});

describe("every directory consumer", () => {
  it("passes the empty flag, not counts", () => {
    for (const file of CONSUMERS) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /empty=\{/, `${file} does not pass empty`);
      /**
       * SCOPED TO THE TOOLBAR ELEMENT, not the whole file. This read the
       * source for `total={` anywhere and started failing when the same
       * directories grew a CappedGrid, which takes a `total` because it has to
       * know whether there is anything past the cap to offer. That count never
       * reaches the toolbar and is never printed — it decides whether a button
       * exists. The rule being kept is the one that was always meant: the
       * toolbar says whether a list is narrowed and whether it is empty, and
       * never "Showing 12 of 149".
       */
      const toolbar = source.slice(source.indexOf("<ListToolbar"));
      const props = toolbar.slice(0, toolbar.indexOf("/>") + 2);
      assert.doesNotMatch(props, /showing=\{|total=\{/, `${file} still passes counts to the toolbar`);
    }
  });

  it("prints no showing-x-of-y of its own", () => {
    for (const file of CONSUMERS) {
      const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      assert.doesNotMatch(source, /Showing \{/, `${file} prints a result count`);
    }
  });
});
