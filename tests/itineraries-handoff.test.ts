import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { shouldOfferHandoff } from "@/lib/itineraries-handoff";

describe("Kosher Travel has an independent itinerary planner", () => {
  it("does not send existing or new trips to the other company", () => {
    for (const brand of ["kosher", "itineraries"])
      for (const hasTrip of [true, false])
        assert.equal(shouldOfferHandoff({ brand, hasTrip }), false);
  });
  it("renders its own builder without the cross-company handoff", () => {
    const page = readFileSync("app/itinerary/page.tsx", "utf8");
    assert.match(page, /<ItineraryBuilder/);
    assert.doesNotMatch(page, /ContinueInItineraries/);
    assert.match(page, /requireSignedIn/);
  });
});
