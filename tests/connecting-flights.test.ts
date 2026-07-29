import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  buildDays,
  emptyItinerary,
  flightRouteLabel,
  layoverMinutes,
  readJourneys,
  type Itinerary,
  type ItinFlight,
} from "../data/itinerary";

// Nobody books "New York to Kraków". They book a ticket routed through
// Amsterdam, and they copy into the planner what the airline showed them: two
// flights. Read literally that is two journeys, which gave the traveler a free
// day in a city they never leave the airport of, a hotel warning for a night
// they are not there, and a departure sitting at the end of the following day.

const trip = (over: Partial<Itinerary> = {}): Itinerary => ({
  ...emptyItinerary(),
  startDate: "2026-08-11",
  endDate: "2026-08-14",
  ...over,
});

// The real ticket: JFK 18:00 → AMS 07:30 next morning, three and a quarter
// hours on the ground, AMS 10:45 → KRK 12:30.
const jfkAms: ItinFlight = {
  id: "leg-1",
  airline: "KLM",
  flightNo: "KL 642",
  from: "JFK",
  to: "Amsterdam (AMS)",
  date: "2026-08-11",
  departTime: "18:00",
  arriveTime: "07:30",
};
const amsKrk: ItinFlight = {
  id: "leg-2",
  airline: "KLM",
  flightNo: "KL 1361",
  from: "AMS",
  to: "Kraków (KRK)",
  date: "2026-08-12",
  departTime: "10:45",
  arriveTime: "12:30",
  confirmation: "XR7T9P",
};

describe("two flights that are really one journey", () => {
  test("are read as one, through the connecting airport", () => {
    const [journey, ...rest] = readJourneys(trip({ flights: [jfkAms, amsKrk] }));
    assert.equal(rest.length, 0, "the two legs should not stay two journeys");
    assert.equal(flightRouteLabel(journey), "JFK → Amsterdam (AMS) → Kraków (KRK)");
    assert.equal(journey.from, "JFK");
    assert.equal(journey.to, "Kraków (KRK)");
    assert.equal(journey.date, "2026-08-11");
    assert.equal(journey.departTime, "18:00");
    assert.equal(journey.arriveTime, "12:30");
    assert.equal(journey.arriveDate, "2026-08-12");
    assert.equal(journey.legs.length, 2);
  });

  test("the time on the ground is worked out, not asked for", () => {
    const [journey] = readJourneys(trip({ flights: [jfkAms, amsKrk] }));
    assert.equal(journey.stops?.length, 1);
    assert.equal(layoverMinutes(journey.stops![0]), 195); // 3 h 15 m
    assert.equal(journey.stops![0].overnight, false);
  });

  test("nothing typed on the second leg is lost", () => {
    const [journey] = readJourneys(trip({ flights: [jfkAms, amsKrk] }));
    const stop = journey.stops![0];
    assert.match(stop.notes ?? "", /KL 1361/);
    assert.match(stop.notes ?? "", /XR7T9P/);
    // …and the leg itself is still there to be opened and edited.
    assert.equal(stop.legId, "leg-2");
  });

  test("the day in the connecting city disappears, because there never was one", () => {
    const days = buildDays(trip({ flights: [jfkAms, amsKrk] }));
    const [first, second] = days;
    // Day 1: one departure, and the night is spent aboard.
    assert.equal(first.flightsDeparting.length, 1);
    assert.equal(first.overnightFlight?.id, "leg-1");
    assert.ok(!first.warnings.some((w) => w.startsWith("No place to sleep")));
    // Day 2: it lands in Kraków. It does NOT also fly out of Amsterdam.
    assert.equal(second.flightsArriving.length, 1);
    assert.equal(second.flightsArriving[0].to, "Kraków (KRK)");
    assert.equal(second.flightsDeparting.length, 0);
  });
});

describe("what is left alone", () => {
  test("a night booked in the connecting city means it is a visit", () => {
    // Two days in Amsterdam on the way is a real thing people do. A hotel
    // there says so plainly, and the legs stay two flights.
    const itin = trip({
      flights: [jfkAms, { ...amsKrk, date: "2026-08-13", departTime: "10:45" }],
      lodging: [
        { id: "h1", type: "hotel", name: "Amsterdam hotel", checkIn: "2026-08-12", checkOut: "2026-08-13" },
      ],
    });
    assert.equal(readJourneys(itin).length, 2);
  });

  test("a hotel at the far end is not a hotel in the connecting city", () => {
    // The case that was actually broken: a room in Kraków from the day you
    // land there was read as a room in Amsterdam, and the connection stayed
    // two flights. Landing at 07:30 and leaving at 10:45 the same morning has
    // no night in it for a hotel to be in the middle of.
    const itin = trip({
      flights: [jfkAms, amsKrk],
      lodging: [
        { id: "h1", type: "hotel", name: "Hotel Kraków", checkIn: "2026-08-12", checkOut: "2026-08-14" },
      ],
    });
    assert.equal(readJourneys(itin).length, 1);
  });

  test("a wait longer than a day is a stopover, not a connection", () => {
    const itin = trip({ flights: [jfkAms, { ...amsKrk, date: "2026-08-13" }] });
    assert.equal(readJourneys(itin).length, 2);
  });

  test("a second flight from somewhere else is a second flight", () => {
    const itin = trip({ flights: [jfkAms, { ...amsKrk, id: "other", from: "Warsaw (WAW)" }] });
    assert.equal(readJourneys(itin).length, 2);
  });

  test("the onward leg cannot leave before the first one lands", () => {
    const itin = trip({ flights: [jfkAms, { ...amsKrk, departTime: "05:15" }] });
    assert.equal(readJourneys(itin).length, 2);
  });

  test("a flight entered on its own is unchanged", () => {
    const [journey] = readJourneys(trip({ flights: [jfkAms] }));
    assert.equal(journey.to, "Amsterdam (AMS)");
    assert.equal(journey.arriveDate, undefined);
    assert.deepEqual(journey.stops, undefined);
    assert.equal(journey.legs.length, 1);
  });
});

describe("the airport has to be the same airport", () => {
  test("however the traveler wrote it", () => {
    // "Amsterdam (AMS)" from the picker, "AMS" from the flight lookup, and
    // "Amsterdam" typed by hand are one place.
    for (const written of ["AMS", "Amsterdam (AMS)", "Amsterdam", "ams"]) {
      const itin = trip({ flights: [jfkAms, { ...amsKrk, from: written }] });
      assert.equal(readJourneys(itin).length, 1, `did not match "${written}"`);
    }
  });

  test("but a name we do not know is not guessed at", () => {
    const itin = trip({ flights: [jfkAms, { ...amsKrk, from: "Bordeaux" }] });
    assert.equal(readJourneys(itin).length, 2);
  });
});

describe("three legs", () => {
  test("fold into one journey with two connections", () => {
    const itin = trip({
      flights: [
        jfkAms,
        { ...amsKrk, to: "Warsaw (WAW)", arriveTime: "12:30" },
        { id: "leg-3", from: "WAW", to: "Kraków (KRK)", date: "2026-08-12", departTime: "15:00", arriveTime: "16:05" },
      ],
    });
    const journeys = readJourneys(itin);
    assert.equal(journeys.length, 1);
    assert.equal(flightRouteLabel(journeys[0]), "JFK → Amsterdam (AMS) → Warsaw (WAW) → Kraków (KRK)");
    assert.equal(journeys[0].to, "Kraków (KRK)");
    assert.equal(layoverMinutes(journeys[0].stops![1]), 150);
  });
});
