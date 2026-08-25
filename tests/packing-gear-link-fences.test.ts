import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * The gear links on the packing list are affiliate links, and the page is now
 * open to everybody. Two things about them are not style choices, so they are
 * pinned here rather than left to whoever edits the component next.
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
    assert.match(PANEL, /gear = \[\], signedIn = false \}/);
    assert.doesNotMatch(PANEL, /fetch\((["'`])[^"'`]*travel-gear/);
  });
});

describe("the page answers a visitor who is not signed in", () => {
  it("nobody is sent to the login door for a packing list", () => {
    // It was signed-in only, so the one page whose whole subject is a list of
    // things to go and buy was reachable only by people who already had an
    // account.
    assert.doesNotMatch(PAGE, /requireSignedIn/);
  });

  it("the starter list is what an empty screen shows, rather than a dead end", () => {
    assert.match(PANEL, /PACKING_BASICS/);
    // "Open a trip in the planner first." was the whole of the old page for a
    // visitor with no trip.
    assert.doesNotMatch(PANEL, /Open a trip in the planner first/);
  });

  it("a signed-out visitor is never asked the account a question it would refuse", () => {
    assert.match(PANEL, /if \(!signedIn\) return;/);
  });

  it("a trip with no list yet is not reported as an error", () => {
    // 404 from the packing route means \"no trip yet\", which is an ordinary
    // state and not something to say out loud.
    assert.match(PANEL, /res\.status === 404/);
  });

  it("it is a page search engines may keep, now that it holds an answer", () => {
    assert.doesNotMatch(PAGE, /noIndex/);
  });

  it("a visitor can find it — it is linked, not only reachable from an account", () => {
    const footer = readFileSync("components/Footer.tsx", "utf8");
    const gear = readFileSync("app/travel-gear/page.tsx", "utf8");
    assert.match(footer, /href: "\/packing"/);
    assert.match(gear, /href: "\/packing"/);
  });
});
