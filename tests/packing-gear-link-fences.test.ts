import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * The gear links on the packing list are affiliate links on a signed-in page.
 * Two things about them are not style choices, so they are pinned here rather
 * than left to whoever edits the component next.
 */

const PAGE = readFileSync("app/packing/page.tsx", "utf8");
const PANEL = readFileSync("components/PackingListPanel.tsx", "utf8");

describe("Amazon's disclosure follows Amazon's links", () => {
  it("the packing page carries the disclosure, not just /travel-gear", () => {
    assert.match(PAGE, /AMAZON_DISCLOSURE/);
  });

  it("it is shown only when a link actually shown is Amazon's", () => {
    assert.match(PAGE, /const amazon = shelf\.some\(\(item\) => isAmazonLink\(item\.url\)\)/);
    assert.match(PAGE, /\{amazon && /);
  });

  it("the wording is Amazon's own constant, never retyped", () => {
    assert.doesNotMatch(PAGE, /As an Amazon Associate/);
  });
});

describe("the links themselves are declared for what they are", () => {
  it("an affiliate link is marked sponsored, and cannot reach back through the opener", () => {
    assert.match(PANEL, /rel="sponsored nofollow noopener noreferrer"/);
  });
});

describe("the shelf reaches the page without a detour", () => {
  it("only the three fields a link needs leave the server — never the price", () => {
    assert.match(PAGE, /\{ id: item\.id, name: item\.name, url: item\.url \}/);
  });

  it("only finished items go, the same set /travel-gear shows visitors", () => {
    assert.match(PAGE, /gearShownToVisitors\(await readGear\(\)\)/);
  });

  it("the panel is handed the shelf rather than fetching it again", () => {
    assert.match(PANEL, /gear = \[\] \}: \{ gear\?: GearLink\[\] \}/);
    assert.doesNotMatch(PANEL, /fetch\((["'`])[^"'`]*travel-gear/);
  });
});
