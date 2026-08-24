import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * "New York (JFK) → London — all airports (LON)" on a confirmed itinerary —
 * a city-group pick ("all airports"), meant for flight SEARCH, was still
 * selectable when entering a real, already-booked flight. A booked ticket
 * always lands at one specific airport; the group option belongs to
 * BookPartners' search, not the itinerary builder's flight form.
 */

describe("a booked flight's airport field never offers a city group", () => {
  const AC = readFileSync("components/AirportAutocomplete.tsx", "utf8");

  it("the picker only computes the group list when allowGroups is not turned off", () => {
    assert.match(AC, /const cities = allowGroups && q\.length >= 1 \? metroMatches/);
  });

  it("the itinerary builder's flight form turns it off on all three airport fields", () => {
    const BUILDER = readFileSync("components/ItineraryBuilder.tsx", "utf8");
    const flightForm = BUILDER.slice(BUILDER.indexOf('title={initial ? "Edit this flight"'), BUILDER.indexOf("Stops on the way (connections)") + 400);
    const hits = flightForm.match(/allowGroups=\{false\}/g) ?? [];
    assert.equal(hits.length, 3, "From, To, and each connecting stop should all disable the group pick");
  });

  it("BookPartners' own flight search is untouched — it still offers the group pick", () => {
    const BP = readFileSync("components/BookPartners.tsx", "utf8");
    assert.doesNotMatch(BP, /allowGroups=\{false\}/, "search is exactly where 'all airports' belongs");
  });
});
