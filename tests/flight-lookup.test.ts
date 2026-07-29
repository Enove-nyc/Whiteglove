import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { parseLocal, readAmadeusFlight, splitFlightNumber, type AmadeusDated } from "../lib/flight-lookup";
import { flightArrivalDate, readOvernightFlight, type ItinFlight } from "../data/itinerary";

// Looking a flight up is only worth having if the times come back right. A
// wrong destination or a wrong landing day puts the traveler on the wrong page
// of their own itinerary and asks for a hotel in a city they never leave the
// airport of.

const point = (iata: string, arrive?: string, depart?: string) => ({
  iataCode: iata,
  ...(arrive ? { arrival: { timings: [{ value: arrive }] } } : {}),
  ...(depart ? { departure: { timings: [{ value: depart }] } } : {}),
});

const fallback = { carrierCode: "LY", number: "1", date: "2026-08-11" };

describe("reading the times off a schedule", () => {
  test("a daytime hop lands the day it left", () => {
    const dated: AmadeusDated = {
      flightDesignator: { carrierCode: "LY", flightNumber: 1 },
      flightPoints: [
        point("TLV", undefined, "2026-08-11T09:00:00+03:00"),
        point("KRK", "2026-08-11T12:20:00+02:00"),
      ],
    };
    const f = readAmadeusFlight(dated, fallback)!;
    assert.equal(f.from, "TLV");
    assert.equal(f.to, "KRK");
    assert.equal(f.departTime, "09:00");
    assert.equal(f.arriveTime, "12:20");
    assert.equal(f.arriveDate, "", "same day, so no landing date is claimed");
    assert.deepEqual(f.stops, []);
  });

  test("a red-eye carries the day it actually lands", () => {
    const dated: AmadeusDated = {
      flightDesignator: { carrierCode: "LY", flightNumber: 26 },
      flightPoints: [
        point("JFK", undefined, "2026-08-11T23:40:00-04:00"),
        point("TLV", "2026-08-12T17:15:00+03:00"),
      ],
    };
    const f = readAmadeusFlight(dated, fallback)!;
    assert.equal(f.arriveDate, "2026-08-12");
    assert.equal(f.flightNo, "LY26");
  });
});

describe("a flight number that covers a connection", () => {
  // JFK–CDG–TLV is one flight number and three points. The destination is the
  // last one, not the first one it touches down at.
  const dated: AmadeusDated = {
    flightDesignator: { carrierCode: "AF", flightNumber: 22 },
    flightPoints: [
      point("JFK", undefined, "2026-08-11T19:30:00-04:00"),
      point("CDG", "2026-08-12T08:45:00+02:00", "2026-08-12T13:10:00+02:00"),
      point("TLV", "2026-08-12T18:05:00+03:00"),
    ],
  };

  test("the destination is the last point, not the stopover", () => {
    const f = readAmadeusFlight(dated, fallback)!;
    assert.equal(f.from, "JFK");
    assert.equal(f.to, "TLV", "the stopover is not the destination");
    assert.equal(f.arriveTime, "18:05", "the landing time is the final one");
  });

  test("the stopover comes through as a connection, with its wait", () => {
    const f = readAmadeusFlight(dated, fallback)!;
    assert.equal(f.stops.length, 1);
    assert.equal(f.stops[0].airport, "CDG");
    assert.equal(f.stops[0].arriveTime, "08:45");
    assert.equal(f.stops[0].departTime, "13:10");
    assert.equal(f.stops[0].overnight, false, "same-day connection is not a night");
  });

  test("a connection held into the next day is marked as a night", () => {
    const held: AmadeusDated = {
      flightPoints: [
        point("JFK", undefined, "2026-08-11T19:30:00-04:00"),
        point("CDG", "2026-08-12T08:45:00+02:00", "2026-08-13T07:10:00+02:00"),
        point("TLV", "2026-08-13T12:05:00+03:00"),
      ],
    };
    const f = readAmadeusFlight(held, fallback)!;
    assert.equal(f.stops[0].overnight, true);
    assert.equal(f.arriveDate, "2026-08-13");
  });
});

describe("what the planner then makes of it", () => {
  // The lookup and the planner have to agree, or the flight lands on one page
  // and the day card is drawn on another.
  test("a looked-up red-eye reads as an overnight in the planner", () => {
    const looked = readAmadeusFlight(
      {
        flightPoints: [
          point("JFK", undefined, "2026-08-11T23:40:00-04:00"),
          point("TLV", "2026-08-12T17:15:00+03:00"),
        ],
      },
      fallback,
    )!;
    const flight: ItinFlight = { id: "f", from: looked.from, to: looked.to, date: looked.date, departTime: looked.departTime, arriveTime: looked.arriveTime, arriveDate: looked.arriveDate || undefined, stops: looked.stops };
    assert.equal(flightArrivalDate(flight), "2026-08-12");
    assert.equal(readOvernightFlight(flight).overnight, true);
  });

  test("a looked-up daytime flight is not called an overnight", () => {
    const looked = readAmadeusFlight(
      {
        flightPoints: [
          point("TLV", undefined, "2026-08-11T09:00:00+03:00"),
          point("KRK", "2026-08-11T12:20:00+02:00"),
        ],
      },
      fallback,
    )!;
    const flight: ItinFlight = { id: "f", from: looked.from, to: looked.to, date: looked.date, departTime: looked.departTime, arriveTime: looked.arriveTime, arriveDate: looked.arriveDate || undefined, stops: looked.stops };
    assert.equal(flightArrivalDate(flight), "2026-08-11");
    assert.equal(readOvernightFlight(flight).overnight, false);
  });
});

describe("nothing usable", () => {
  test("an empty schedule fills nothing in rather than guessing", () => {
    assert.equal(readAmadeusFlight(undefined, fallback), null);
    assert.equal(readAmadeusFlight({ flightPoints: [] }, fallback), null);
  });

  test("a single point is not a journey", () => {
    assert.equal(readAmadeusFlight({ flightPoints: [point("JFK", undefined, "2026-08-11T19:30:00-04:00")] }, fallback), null);
  });
});

describe("reading the pieces", () => {
  test("a local timestamp splits into a date and a clock time", () => {
    assert.deepEqual(parseLocal("2026-08-11T23:40:00-04:00"), { date: "2026-08-11", time: "23:40" });
    assert.deepEqual(parseLocal("2026-08-11 23:40+03:00"), { date: "2026-08-11", time: "23:40" });
    assert.equal(parseLocal("tomorrow"), null);
    assert.equal(parseLocal(undefined), null);
  });

  test("a flight number splits however it was typed", () => {
    assert.deepEqual(splitFlightNumber("LY1"), { carrierCode: "LY", number: "1" });
    assert.deepEqual(splitFlightNumber("ba 2490"), { carrierCode: "BA", number: "2490" });
    assert.equal(splitFlightNumber("not a flight"), null);
  });
});
