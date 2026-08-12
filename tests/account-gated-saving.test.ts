import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { emptyItinerary } from "@/data/itinerary";
import { activityFromPlace, addPlaceIfAbsent, mergeActivity, mergePatch } from "@/lib/account-trip-client";
import { confirmationFor, returnToWithSaveFlag, stripSaveReturnFlag, type PendingSave } from "@/lib/pending-save";
import { ADD_TO_ROUTE_LABEL, ADD_TO_TRIP_LABEL, PLAN_THEN_SAVE, SAVE_AUTH_HEADING, SAVE_TRIP_LABEL } from "@/lib/save-copy";
import { GATED_FEATURES, promptFor } from "@/lib/members-only";
import { STARTING_POINTS } from "@/lib/starting-points";
import { legacyItineraryHasContent } from "@/lib/legacy-trip-storage";

const SAVE_FILES = [
  "components/SavePlaceButtons.tsx",
  "components/SaveTripItemButton.tsx",
  "components/DestinationActions.tsx",
  "components/ItineraryBuilder.tsx",
  "components/MyRouteDashboard.tsx",
  "components/AccountRoutePanel.tsx",
  "components/SharedItineraryActions.tsx",
  "components/KosherNearby.tsx",
  "components/BookPartners.tsx",
  "app/itinerary/print/page.tsx",
];

describe("account-gated saving", () => {
  it("puts the reusable modal on every public page", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    assert.match(layout, /<SaveAuthProvider/);
    assert.match(layout, /<NewSiteNotice/);
    const notice = readFileSync("components/NewSiteNotice.tsx", "utf8");
    assert.match(notice, /IT IS A POPUP/);
  });

  it("uses one heading for every save sign-in", () => {
    const modal = readFileSync("components/SaveAuthModal.tsx", "utf8");
    assert.match(modal, /SAVE_AUTH_HEADING/);
    assert.equal(SAVE_AUTH_HEADING, "Save your trip with White Glove");
    assert.match(modal, /<LoginForm/);
    assert.match(modal, /onSignedIn/);
    assert.match(modal, /role="dialog"/);
    assert.match(modal, /aria-modal="true"/);
    assert.match(modal, /useFocusTrap/);
    assert.match(modal, /aria-label="Close"/);
  });

  it("keeps password sign-in on the page so the pending add can finish", () => {
    const form = readFileSync("components/LoginForm.tsx", "utf8");
    assert.match(form, /onSignedIn\?: \(\) => void/);
    assert.match(form, /if \(onSignedIn\) return/);
    assert.match(form, /onSignedIn\(\)/);
  });

  it("does not write trips into localStorage any more", () => {
    for (const file of SAVE_FILES) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /localStorage\.setItem/, `${file} still writes a trip to this browser`);
      assert.doesNotMatch(source, /localStorage\.getItem\("whiteGlove/, `${file} still reads a trip from this browser`);
    }
  });

  it("opens the modal from signed-out save buttons instead of sending people to /login", () => {
    for (const file of [
      "components/SavePlaceButtons.tsx",
      "components/SaveTripItemButton.tsx",
      "components/DestinationActions.tsx",
      "components/AddDestinationToTrip.tsx",
      "components/SharedItineraryActions.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /requireSave/, `${file} does not go through the pending-save modal`);
      assert.doesNotMatch(source, /signInHref\(\)/, `${file} still dumps the visitor on /login`);
    }
    const book = readFileSync("components/BookPartners.tsx", "utf8");
    assert.match(book, /requireSave/);
    assert.match(book, /PartnerSearchWidget/);
    assert.match(book, /flightsEmbedPath/);
    assert.match(book, /carsEmbedPath/);
  });

  it("names the three save actions the site agreed on", () => {
    assert.equal(ADD_TO_TRIP_LABEL, "Add to trip");
    assert.equal(ADD_TO_ROUTE_LABEL, "Add to route");
    assert.equal(SAVE_TRIP_LABEL, "Save trip");
    const builder = readFileSync("components/ItineraryBuilder.tsx", "utf8");
    assert.match(builder, /SAVE_TRIP_LABEL/);
    const destination = readFileSync("app/destinations/[destination]/page.tsx", "utf8");
    assert.match(destination, /AddDestinationToTrip/);
    assert.match(destination, /Add \$\{destination\.name\} to a trip/);
  });
});

describe("pending save helpers", () => {
  it("adds a place to a trip once", () => {
    const activity = activityFromPlace({ id: "rome", name: "Rome", address: "Rome, Italy", href: "/destinations/rome" });
    const first = mergeActivity(emptyItinerary(), activity);
    assert.equal(first.added, true);
    assert.equal(first.itinerary.activities.length, 1);
    const second = mergeActivity(first.itinerary, activity);
    assert.equal(second.added, false);
    assert.equal(second.itinerary.activities.length, 1);
  });

  it("does not duplicate a route stop", () => {
    const place = { id: "lizhensk", name: "Lizhensk", address: "Lezajsk" };
    const first = addPlaceIfAbsent([], place);
    assert.equal(first.added, true);
    const second = addPlaceIfAbsent(first.places, place);
    assert.equal(second.added, false);
    assert.equal(second.places.length, 1);
  });

  it("merges a booking patch onto the account trip", () => {
    const next = mergePatch(emptyItinerary(), {
      flights: [{ id: "f1", from: "JFK", to: "FCO", date: "2026-08-20" }],
      dates: ["2026-08-20", "2026-08-27"],
    });
    assert.equal(next.flights.length, 1);
    assert.equal(next.startDate, "2026-08-20");
    assert.equal(next.endDate, "2026-08-27");
  });

  it("confirms the original action in the visitor's words", () => {
    const action: PendingSave = {
      type: "add-activity-to-trip",
      activity: { id: "rome", name: "Rome", date: "" },
    };
    const notice = confirmationFor(action);
    assert.equal(notice.message, "Rome was added to your trip.");
    assert.equal(notice.viewHref, "/itinerary");
  });

  it("keeps the Google return on the same page", () => {
    assert.equal(returnToWithSaveFlag("/destinations/rome"), "/destinations/rome?wg_save=1");
    assert.equal(returnToWithSaveFlag("/itinerary?tab=days"), "/itinerary?tab=days&wg_save=1");
    assert.equal(stripSaveReturnFlag("?wg_save=1&tab=days"), "?tab=days");
  });

  it("does not treat an empty starter trip as something to import", () => {
    assert.equal(legacyItineraryHasContent(emptyItinerary()), false);
    assert.equal(legacyItineraryHasContent({ ...emptyItinerary(), activities: [{ id: "a", name: "Rome", date: "" }] }), true);
  });
});

describe("copy no longer offers a browser-only trip", () => {
  it("tells the planner and the four doors the same thing", () => {
    assert.match(PLAN_THEN_SAVE, /Create an account when you are ready to save your trip/);
    const itinerary = STARTING_POINTS.find((point) => point.href === "/itinerary");
    assert.match(itinerary?.body ?? "", /Create an account when you are ready to save your trip/);
    for (const feature of GATED_FEATURES) {
      assert.doesNotMatch(promptFor(feature).body.join(" "), /this browser only/i);
    }
  });

  it("does not advertise local saving on the public surfaces that used to", () => {
    for (const file of [
      "components/TripSetupPanel.tsx",
      "components/TripStartFlow.tsx",
      "app/plan/page.tsx",
      "lib/starting-points.ts",
      "lib/members-only.ts",
    ]) {
      const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      assert.doesNotMatch(source, /in this browser only/, file);
      assert.doesNotMatch(source, /Saved in this browser/, file);
      assert.doesNotMatch(source, /Just open it in this browser/, file);
      assert.doesNotMatch(source, /No account needed until you want it on your phone/, file);
    }
  });
});
