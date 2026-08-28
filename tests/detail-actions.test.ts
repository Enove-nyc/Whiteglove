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
    // The name is built rather than literal now, because the suitcase has a
    // third state: it says "Adding to itinerary" while the save is in flight.
    // The rule is unchanged — the name always says what pressing it does.
    for (const source of [ROW, ACTIONS]) {
      assert.match(source, /"Adding to itinerary" : "Add to itinerary"/);
      assert.match(source, /label="View itinerary" href="\/itinerary"/);
    }
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

describe("adding a stop to a trip", () => {
  /**
   * This was a quiet way to lose a trip. Each of the three surfaces that can
   * add a stop built the new itinerary from a localStorage copy and POSTed the
   * result to the account. That was correct while the planner kept a browser
   * copy in step; it stopped being correct when the planner moved to the
   * account alone. Nothing threw — the browser copy simply went stale, so one
   * click could put an old itinerary, often an empty one, over a trip somebody
   * had built.
   *
   * There is one implementation now, and it reads the account, asks which trip
   * when the account holds more than one, and adds the stop without a day.
   */
  const HOOK = readFileSync("components/useAddToItinerary.tsx", "utf8");
  const ADD = readFileSync("components/AddToItineraryButton.tsx", "utf8");
  const SURFACES = [
    ["DetailActionRow", ROW],
    ["DestinationActions", ACTIONS],
    ["AddToItineraryButton", ADD],
  ] as const;

  it("no component builds an itinerary out of browser storage", () => {
    for (const [name, source] of [...SURFACES, ["useAddToItinerary", HOOK]] as const) {
      assert.doesNotMatch(source, /whiteGloveItinerary/, `${name} still reads the old browser key`);
    }
  });

  it("all three surfaces share one implementation rather than keeping their own", () => {
    for (const [name, source] of SURFACES) {
      assert.match(source, /useAddToItinerary/, `${name} does not use the shared hook`);
      assert.doesNotMatch(source, /fetch\("\/api\/account\/itinerary/, `${name} still adds stops itself`);
    }
  });

  it("reads the trip before it writes to it", () => {
    const read = HOOK.indexOf("`/api/account/itinerary${query}`");
    const write = HOOK.indexOf('fetch("/api/account/itinerary", {');
    assert.ok(read !== -1, "the trip is never read");
    assert.ok(write !== -1, "the trip is never saved");
    assert.ok(read < write, "it writes before it has read");
  });

  it("ASKS WHICH TRIP when the account holds more than one", () => {
    // Adding silently to whichever trip happens to be open is a guess, and a
    // wrong guess is invisible — the stop lands in a trip nobody was looking at.
    assert.match(HOOK, /fetch\("\/api\/account\/trips"\)/);
    assert.match(HOOK, /trips\.length > 1/);
    assert.match(HOOK, /Which trip\?/);
    // One trip still adds straight away: nothing to ask about.
    assert.match(HOOK, /addTo\(place, trips\[0\]\?\.id\)/);
  });

  it("the chosen trip is the one written to, not the open one", () => {
    assert.match(HOOK, /\?trip=\$\{encodeURIComponent\(tripId\)\}/);
    assert.match(HOOK, /tripId: tripId \?\? data\.tripId/);
  });

  it("the stop arrives without a day, and says so", () => {
    // An undated stop lands in the planner's "Not scheduled yet" list, where a
    // dropdown puts it on a day. Choosing one here would put a stop on a date
    // nobody picked.
    assert.match(HOOK, /date: "",/);
    assert.match(HOOK, /not on a day yet/i);
    assert.match(HOOK, /Place it on a day/);
  });

  it("names the trip it went on, on every surface", () => {
    for (const [name, source] of SURFACES) {
      assert.match(source, /AddedToTrip/, `${name} confirms without naming the trip`);
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

describe("a detail page shows an order of importance", () => {
  /**
   * ALL EIGHT USED TO SIT IN ONE ROW at equal weight — Directions, Phone,
   * Website, Share, Favorite, Route, Add to itinerary, Report — so the page's
   * answer to "what do I do with this place" was eight identical squares and
   * no answer at all. Add to itinerary, the action the whole planner is built
   * on, was seventh of the eight, after Share.
   *
   * Three in front: put it on the trip, put it on the route, go there.
   * Everything else keeps its name, its tooltip and its behaviour, one press
   * away in a native disclosure.
   */
  const ROWS: Array<[string, string]> = [
    ["components/DetailActionRow.tsx", ROW],
    ["components/DestinationActions.tsx", ACTIONS],
  ];

  for (const [name, source] of ROWS) {
    const at = source.indexOf("<MoreActions");

    it(`${name} has a More disclosure`, () => {
      assert.ok(at > 0, `${name} still shows every action at once`);
    });

    it(`${name} leads with the itinerary, then the route, then directions`, () => {
      const front = source.slice(0, at);
      const suitcase = front.indexOf('icon="suitcase"');
      const route = front.indexOf('icon="route"');
      const directions = front.indexOf('icon="directions"');
      assert.ok(suitcase > 0 && route > 0 && directions > 0, "one of the three is not in front any more");
      assert.ok(suitcase < route, "the route comes before the itinerary");
      assert.ok(route < directions, "directions come before the route");
    });

    it(`${name} moves the rest behind it without renaming anything`, () => {
      const behind = source.slice(at);
      assert.match(behind, /label="Share"/);
      assert.match(behind, /label=\{favorite \? "Remove favorite" : "Favorite"\}/);
    });
  }

  it("the shared row keeps phone, website and report reachable", () => {
    const behind = ROW.slice(ROW.indexOf("<MoreActions"));
    for (const label of ['label="Phone"', 'label="Website"', 'label="Report"']) {
      assert.ok(behind.includes(label), `${label} was dropped rather than moved`);
    }
  });
});
