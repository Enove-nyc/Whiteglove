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

