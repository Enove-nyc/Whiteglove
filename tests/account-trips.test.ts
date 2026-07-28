import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { withTrips, type AccountData } from "../lib/account-store";
import { emptyItinerary } from "../data/itinerary";

// An account made before trips existed holds one itinerary and one route in
// the fields everything else on the site still reads. Opening the switcher
// must present that as the first trip without losing anything — above all not
// the share link, which somebody may already have been sent.

describe("an account that predates trips", () => {
  const legacy: AccountData = {
    route: [
      { id: "a", name: "Lizhensk", href: "/kevarim/lizhensk" },
      { id: "b", name: "Kraków", href: "/kevarim/krakow" },
    ],
    favorites: [],
    itinerary: { ...emptyItinerary(), title: "Poland, Elul" },
    itineraryShareId: "abc123",
    itineraryCollaborators: ["chavrusa@example.com"],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  test("reads back as exactly one trip", () => {
    const { trips, activeId } = withTrips(legacy);
    assert.equal(trips.length, 1);
    assert.equal(trips[0].id, activeId);
  });

  test("keeps the itinerary, its name and its route", () => {
    const { trips } = withTrips(legacy);
    assert.equal(trips[0].name, "Poland, Elul");
    assert.equal(trips[0].itinerary.title, "Poland, Elul");
    assert.equal(trips[0].route.length, 2);
  });

  test("keeps the share link and everyone it was shared with", () => {
    const { trips } = withTrips(legacy);
    assert.equal(trips[0].shareId, "abc123");
    assert.deepEqual(trips[0].collaborators, ["chavrusa@example.com"]);
  });

  test("does not invent a share link for an account that never had one", () => {
    const { trips } = withTrips({ route: [], favorites: [] });
    assert.equal(trips[0].shareId, undefined);
    assert.equal(trips[0].name, "My trip");
  });
});

describe("an account that already has trips", () => {
  const now = "2026-07-01T00:00:00.000Z";
  const data: AccountData = {
    route: [],
    favorites: [],
    trips: [
      { id: "one", name: "Poland", itinerary: emptyItinerary(), route: [], createdAt: now, updatedAt: now },
      { id: "two", name: "Ukraine", itinerary: emptyItinerary(), route: [], createdAt: now, updatedAt: now },
    ],
    activeTripId: "two",
  };

  test("opens the one it was left on", () => {
    assert.equal(withTrips(data).activeId, "two");
  });

  test("falls back to the first when the open one is gone", () => {
    // Deleting a trip elsewhere must not leave the account pointing at
    // nothing — the switcher would then have no trip to show as open.
    const { activeId } = withTrips({ ...data, activeTripId: "deleted" });
    assert.equal(activeId, "one");
  });

  test("does not fold them back into one", () => {
    assert.equal(withTrips(data).trips.length, 2);
  });
});
