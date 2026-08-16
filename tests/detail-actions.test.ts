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
