import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  connectionBetween,
  flightItineraryFromInput,
  flightItineraryProblem,
  landsNextDay,
  type FlightItineraryInput,
  type FlightLeg,
} from "@/lib/flight-itinerary";

function leg(part: Partial<FlightLeg>): FlightLeg {
  return {
    id: "x",
    airline: "",
    flightNumber: "",
    from: "",
    to: "",
    departDate: "",
    departTime: "",
    arriveDate: "",
    arriveTime: "",
    cabin: "",
    confirmation: "",
    notes: "",
    ...part,
  };
}

function input(part: Partial<FlightItineraryInput>): FlightItineraryInput {
  return { title: "", passengers: "", reference: "", notes: "", legs: [], ...part };
}

describe("what a flight itinerary must have", () => {
  it("needs a name or a passenger", () => {
    const problem = flightItineraryProblem(
      input({ legs: [{ ...leg({ from: "JFK", to: "TLV", departDate: "2026-09-01" }) }] }),
    );
    assert.match(problem ?? "", /name or a passenger/i);
  });

  it("needs at least one usable flight", () => {
    assert.match(flightItineraryProblem(input({ title: "Cohen" })) ?? "", /at least one flight/i);
    // A flight missing its destination does not count as usable.
    assert.match(
      flightItineraryProblem(input({ title: "Cohen", legs: [{ ...leg({ from: "JFK", departDate: "2026-09-01" }) }] })) ??
        "",
      /at least one flight/i,
    );
  });

  it("is happy with a name and one complete-enough flight", () => {
    assert.equal(
      flightItineraryProblem(
        input({ title: "Cohen", legs: [{ ...leg({ from: "JFK", to: "TLV", departDate: "2026-09-01" }) }] }),
      ),
      null,
    );
  });
});

describe("turning input into a stored itinerary", () => {
  it("drops empty legs and stamps ids and a share id", () => {
    const itinerary = flightItineraryFromInput(
      input({
        title: "  Cohen family  ",
        legs: [
          { ...leg({ from: "JFK", to: "LHR", departDate: "2026-09-01" }) },
          { ...leg({ from: "", to: "", departDate: "" }) }, // empty — dropped
        ],
      }),
    );
    assert.equal(itinerary.title, "Cohen family");
    assert.equal(itinerary.legs.length, 1);
    assert.ok(itinerary.legs[0].id);
    assert.ok(itinerary.shareId.length >= 10);
  });
});

describe("connections between legs", () => {
  it("sees a short same-airport gap as a connection with a layover", () => {
    const a = leg({ to: "LHR — London", arriveDate: "2026-09-01", arriveTime: "10:00" });
    const b = leg({ from: "LHR — London", departDate: "2026-09-01", departTime: "12:15" });
    const c = connectionBetween(a, b);
    assert.deepEqual(c, { airport: "LHR — London", layover: "2h 15m" });
  });

  it("does not treat a return flight days later as a connection", () => {
    const out = leg({ to: "TLV", arriveDate: "2026-09-01", arriveTime: "17:00" });
    const back = leg({ from: "TLV", departDate: "2026-09-14", departTime: "06:00" });
    assert.equal(connectionBetween(out, back), null);
  });

  it("is not a connection when the airports differ", () => {
    const a = leg({ to: "LHR", arriveDate: "2026-09-01", arriveTime: "10:00" });
    const b = leg({ from: "CDG", departDate: "2026-09-01", departTime: "12:00" });
    assert.equal(connectionBetween(a, b), null);
  });

  it("reports the connection without a duration when times are missing", () => {
    const a = leg({ to: "LHR", arriveDate: "2026-09-01" });
    const b = leg({ from: "LHR", departDate: "2026-09-01" });
    assert.deepEqual(connectionBetween(a, b), { airport: "LHR", layover: null });
  });

  it("rejects a negative gap from a mistyped time", () => {
    const a = leg({ to: "LHR", arriveDate: "2026-09-01", arriveTime: "12:00" });
    const b = leg({ from: "LHR", departDate: "2026-09-01", departTime: "10:00" });
    assert.equal(connectionBetween(a, b), null);
  });
});

describe("landsNextDay", () => {
  it("flags an overnight leg", () => {
    assert.equal(landsNextDay(leg({ departDate: "2026-09-01", arriveDate: "2026-09-02" })), true);
    assert.equal(landsNextDay(leg({ departDate: "2026-09-01", arriveDate: "2026-09-01" })), false);
  });
});
