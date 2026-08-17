import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * EVERY ACTION THAT KEEPS SOMEBODY'S PERSONAL DATA ASKS FOR AN ACCOUNT FIRST,
 * AND NOTHING IS KEPT IN A BROWSER INSTEAD.
 *
 * The site used to do this in two different ways at once. Most actions —
 * favourite, add to Route, add to itinerary, review — opened the sign-in
 * dialog and resumed on the far side of it. But three did not: the kosher
 * list's "Add to my trip" and the booking partners' "add this to your trip"
 * wrote straight into localStorage with nobody signed in, and "Add Rome to a
 * trip" was a link to the recommendations questionnaire that saved nothing at
 * all. A visitor could therefore build a real trip that existed in one
 * browser on one device, and the planner told them so in small print.
 *
 * These pin the rule rather than the wording: the writer reaches the account,
 * and the gate is what stands in front of it.
 */

const read = (path: string) => readFileSync(path, "utf8");
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("no trip is kept in the browser", () => {
  it("the planner reads and writes the account, and nothing else", () => {
    const builder = withoutComments(read("components/ItineraryBuilder.tsx"));
    assert.doesNotMatch(builder, /localStorage\.setItem/);
    assert.match(builder, /fetch\("\/api\/account\/itinerary"/);
    // The one localStorage read left is the saved Route being imported into a
    // trip, which is a different collection and mirrored to the account.
    assert.doesNotMatch(builder, /localStorage\.getItem\(LS_KEY\)/);
  });

  it("the kosher list and the booking partners write to the account too", () => {
    for (const path of ["components/KosherNearby.tsx", "components/BookPartners.tsx"]) {
      const source = withoutComments(read(path));
      assert.doesNotMatch(source, /localStorage\.setItem/, `${path} still writes a trip to the browser`);
      assert.match(source, /api\/account\/itinerary/, `${path} does not reach the account`);
    }
  });
});

describe("every trip action stands behind the same dialog", () => {
  const GATED: Array<[string, string]> = [
    ["components/ItineraryBuilder.tsx", "building or changing a trip"],
    ["components/KosherNearby.tsx", "adding kosher food to a trip"],
    ["components/BookPartners.tsx", "adding a flight, stay or car"],
    ["components/AddDestinationToTrip.tsx", "adding a destination to a trip"],
    ["components/DestinationActions.tsx", "favourite, Route, itinerary"],
    ["components/DetailActionRow.tsx", "the detail action row"],
    ["components/SavePlaceButtons.tsx", "saving a place"],
    ["components/SaveTripItemButton.tsx", "adding to Route"],
    ["components/SharedItineraryActions.tsx", "copying a shared trip"],
    ["components/MyRouteDashboard.tsx", "editing the Route"],
    ["components/TripComments.tsx", "commenting on a trip"],
    ["components/reviews/ReviewSection.tsx", "writing a review"],
  ];

  for (const [path, what] of GATED) {
    it(`asks before ${what}`, () => {
      assert.match(read(path), /useRequireSignIn/, `${path} does not gate ${what}`);
    });
  }

  it("“Add {destination} to a trip” is an action, not a link to the questionnaire", () => {
    const page = read("app/destinations/[destination]/page.tsx");
    assert.match(page, /<AddDestinationToTrip/);
    // The old link went to /plan?destination=… and saved nothing.
    assert.doesNotMatch(page, /addToTripHref/);
    const button = read("components/AddDestinationToTrip.tsx");
    assert.match(button, /requireSignIn\(add,/);
    // The destination is captured before the dialog opens, so the add that
    // runs after sign-in is still the one they pressed.
    assert.match(button, /async function add\(\)/);
  });
});
