import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * The redesign's detail-page rules: essential actions as familiar icons with
 * names, the suitcase that renames itself, and Suggest edit — the pencil —
 * on every detail surface, context-aware and separate from Contact.
 */

const ROW = readFileSync("components/DetailActionRow.tsx", "utf8");
const ACTIONS = readFileSync("components/DestinationActions.tsx", "utf8");
const PANEL = readFileSync("components/SuggestEditPanel.tsx", "utf8");
// Comments out — the panel's own prose explains these rules in words that
// would trip the checks on them.
const PANEL_CODE = PANEL.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the icon action row", () => {
  it("names every icon — nothing is a bare symbol", () => {
    for (const label of ["Directions", "Share", "Report"]) {
      assert.match(ROW, new RegExp(`label="${label}"`), `${label} unnamed`);
    }
    // The stateful ones carry their state in the name, not only in color.
    assert.match(ROW, /label=\{favorite \? "Remove favorite" : "Favorite"\}/);
    assert.match(ROW, /label=\{inRoute \? "Remove from Route" : "Add to Route"\}/);
  });

  it("THE SUITCASE RENAMES ITSELF — an action before, a link after", () => {
    assert.match(ROW, /label="Add to itinerary"/);
    assert.match(ROW, /label="View itinerary" href="\/itinerary"/);
    assert.match(ACTIONS, /label="Add to itinerary"/);
    assert.match(ACTIONS, /label="View itinerary" href="\/itinerary"/);
  });

  it("gates every save through the sign-in dialog", () => {
    for (const source of [ROW, ACTIONS]) {
      assert.match(source, /requireSignIn\(/);
      assert.match(source, /"Sign in to /);
    }
  });

  it("keeps unfamiliar concepts as words — start/end of route are not icons", () => {
    assert.match(ACTIONS, /Start route here/);
    assert.match(ACTIONS, /End route here/);
  });
});

describe("Suggest edit — the pencil, everywhere, contextual", () => {
  it("auto-includes what is being corrected; the visitor never names the page", () => {
    assert.match(PANEL, /targetType,\s+targetId,\s+title,/);
    assert.doesNotMatch(PANEL_CODE, /which page|what page/i);
  });

  it("needs no sign-in, and is not the contact form", () => {
    assert.doesNotMatch(PANEL_CODE, /useRequireSignIn|useSignedIn/);
    assert.match(PANEL, /\/api\/content\/suggestions/);
    assert.doesNotMatch(PANEL_CODE, /\/api\/contact|\/contact\?/);
  });

  it("is mounted on every detail surface", () => {
    const surfaces = [
      "app/destinations/[destination]/page.tsx",
      "app/[city]/page.tsx",
      "app/heritage/towns/[place]/page.tsx",
      "app/cemeteries/[cemetery]/page.tsx",
      "app/tzaddikim/[person]/page.tsx",
      "components/AttractionDirectory.tsx",
      "components/EateryDirectory.tsx",
      "components/KosherStayDirectory.tsx",
    ];
    for (const file of surfaces) {
      assert.match(readFileSync(file, "utf8"), /<SuggestEditPanel /, `${file} has no pencil`);
    }
  });
});

describe("adding a stop reads the trip from the account, never from the browser", () => {
  /**
   * This was a quiet way to lose a trip. Both action components built the new
   * itinerary from a localStorage copy and POSTed the result to the account.
   * That was correct while the planner kept a browser copy in step; it stopped
   * being correct when the planner moved to the account alone. Nothing threw —
   * the browser copy simply went stale, so one click on the suitcase could put
   * an old itinerary, often an empty one, over a trip somebody had built.
   *
   * The rule now: read the account, append, write back. If the read fails,
   * write nothing.
   */
  const ADD = readFileSync("components/AddToItineraryButton.tsx", "utf8");

  it("no component builds an itinerary out of browser storage", () => {
    for (const [name, source] of [["DetailActionRow", ROW], ["DestinationActions", ACTIONS], ["AddToItineraryButton", ADD]] as const) {
      assert.doesNotMatch(source, /whiteGloveItinerary/, `${name} still reads the old browser key`);
    }
  });

  it("reads /api/account/itinerary before it writes to it", () => {
    for (const [name, source] of [["DetailActionRow", ROW], ["DestinationActions", ACTIONS], ["AddToItineraryButton", ADD]] as const) {
      const read = source.indexOf('fetch("/api/account/itinerary")');
      const write = source.indexOf('fetch("/api/account/itinerary", {');
      assert.ok(read !== -1, `${name} never reads the trip`);
      assert.ok(write !== -1, `${name} never saves the trip`);
      assert.ok(read < write, `${name} writes before it has read`);
    }
  });

  it("every attraction card carries the button, not only the destination page", () => {
    // Both surfaces show the same places. Offering the trip on one and only
    // the route on the other is the gap this closes.
    for (const file of ["app/destinations/[destination]/page.tsx", "components/AttractionDirectory.tsx"]) {
      assert.match(readFileSync(file, "utf8"), /<AddToItineraryButton[\s>]/, `${file} offers the route and not the trip`);
    }
  });
});
