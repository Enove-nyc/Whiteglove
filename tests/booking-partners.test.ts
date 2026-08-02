import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeFlights, describeHotels, flightsVia, hotelsVia } from "@/lib/booking-partners";

/**
 * Who runs a search on /book.
 *
 * The rule these tests exist to hold: HAVING A TOKEN IS NOT A DECISION. The
 * old rule sent every flight on the site to Duffel the moment a token was
 * present, so somebody adding one to try a search moved the whole booking
 * flow without choosing to. Where the bookings go is a business decision and
 * it takes somebody deciding.
 */

describe("where a flight search goes", () => {
  it("goes to Kayak when nothing is set", () => {
    assert.equal(flightsVia({}), "kayak");
  });

  it("STAYS on Kayak when only a Duffel token is present", () => {
    // The one that was wrong. A token is somebody who has an account; it is
    // not somebody saying "move all our flights".
    assert.equal(flightsVia({ DUFFEL_ACCESS_TOKEN: "duffel_test_abc" }), "kayak");
  });

  it("stays on Kayak when the flag is set but there is no token", () => {
    // A flag with no token is a search that cannot run. Better the partner
    // that works than our own that errors.
    assert.equal(flightsVia({ DUFFEL_FLIGHTS: "1" }), "kayak");
  });

  it("goes to Duffel only when somebody has said both", () => {
    assert.equal(flightsVia({ DUFFEL_ACCESS_TOKEN: "duffel_test_abc", DUFFEL_FLIGHTS: "1" }), "duffel");
  });

  it("takes exactly \"1\", not anything that looks willing", () => {
    // "true", "yes" and "0" are all somebody guessing at the format. Only the
    // documented value turns it on, so a guess fails safe rather than moving
    // the bookings.
    for (const value of ["true", "yes", "on", "0", "", "  "]) {
      assert.equal(flightsVia({ DUFFEL_ACCESS_TOKEN: "t", DUFFEL_FLIGHTS: value }), "kayak", value);
    }
    assert.equal(flightsVia({ DUFFEL_ACCESS_TOKEN: "t", DUFFEL_FLIGHTS: " 1 " }), "duffel", "trimmed");
  });

  it("ignores a token that is only whitespace", () => {
    assert.equal(flightsVia({ DUFFEL_ACCESS_TOKEN: "   ", DUFFEL_FLIGHTS: "1" }), "kayak");
  });
});

describe("where a hotel search goes", () => {
  it("goes to Booking.com unless told otherwise", () => {
    assert.equal(hotelsVia({}), "booking");
    assert.equal(hotelsVia({ DUFFEL_ACCESS_TOKEN: "t" }), "booking");
    assert.equal(hotelsVia({ DUFFEL_STAYS: "1" }), "booking");
  });

  it("goes to Duffel Stays when both are set", () => {
    // Stays is approved separately from the token and the search 403s until
    // it is, so this flag is also saying "the approval came through".
    assert.equal(hotelsVia({ DUFFEL_ACCESS_TOKEN: "t", DUFFEL_STAYS: "1" }), "duffel");
  });

  it("is not moved by the flights flag", () => {
    assert.equal(hotelsVia({ DUFFEL_ACCESS_TOKEN: "t", DUFFEL_STAYS: "" } as { DUFFEL_ACCESS_TOKEN: string; DUFFEL_STAYS: string }), "booking");
  });
});

describe("what the admin is told", () => {
  it("says where they go", () => {
    // The last time nobody could answer "where do flights go", they moved
    // without anybody noticing.
    assert.match(describeFlights("kayak"), /Kayak/);
    assert.match(describeFlights("kayak"), /default/i);
    assert.match(describeHotels("booking"), /Booking\.com/);
  });

  it("names the variable in BOTH directions, not only the one you are on", () => {
    // Naming it only on the Duffel side hides it from the one person who
    // needs it: whoever is looking at this while flights go to Kayak and
    // wondering how to change that.
    for (const said of [describeFlights("kayak"), describeFlights("duffel")]) {
      assert.match(said, /DUFFEL_FLIGHTS=1/, said);
    }
    for (const said of [describeHotels("booking"), describeHotels("duffel")]) {
      assert.match(said, /DUFFEL_STAYS=1/, said);
    }
  });

  it("says how to undo it when it is on", () => {
    assert.match(describeFlights("duffel"), /Remove it/);
    assert.match(describeHotels("duffel"), /Remove it/);
  });
});
