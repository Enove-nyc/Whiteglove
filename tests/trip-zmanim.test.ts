import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ItineraryDay } from "@/data/itinerary";
import { zmanimRequestFor } from "@/lib/trip-zmanim";
import { jewishDay, resolveDayPlace, zmanimForDay } from "@/lib/zmanim-day-calculate";

const KRAKOW = { coordinates: "50.0497,19.9445", country: "Poland" };
const WARSAW = { coordinates: "52.2370,21.0175", country: "Poland" };
const JERUSALEM = { coordinates: "31.7683,35.2137", country: "Israel" };

function timeOf(day: ReturnType<typeof zmanimForDay>, id: string): string | null {
  for (const block of day.blocks) {
    const entry = block.entries.find((e) => e.id === id);
    if (entry) return entry.time;
  }
  return null;
}

describe("which zmanim a day of the trip needs", () => {
  it("gives a plain weekday the davening times and no candle-lighting", () => {
    const tuesday = zmanimForDay({ date: "2026-08-18", morning: KRAKOW, evening: KRAKOW });
    assert.equal(tuesday.occasion, "");
    assert.equal(tuesday.restDay, false);
    assert.equal(tuesday.blocks.length, 1);
    assert.ok(timeOf(tuesday, "sof-zman-shema-gra"));
    assert.ok(timeOf(tuesday, "sof-zman-shema-mga"));
    assert.ok(timeOf(tuesday, "sunset"));
    assert.equal(timeOf(tuesday, "candle-lighting"), null);
  });

  it("adds candle-lighting on erev Shabbos, and puts it before sunset", () => {
    const friday = zmanimForDay({ date: "2026-08-14", morning: KRAKOW, evening: KRAKOW });
    assert.equal(friday.occasion, "Erev Shabbos");
    const entries = friday.blocks[0]!.entries;
    const lighting = entries.findIndex((e) => e.id === "candle-lighting");
    const sunset = entries.findIndex((e) => e.id === "sunset");
    assert.ok(lighting >= 0, "candle-lighting is shown");
    assert.ok(lighting < sunset, "lighting comes before sunset, as the clock has it");
  });

  it("names Shabbos and yom tov, and marks the day melacha is forbidden", () => {
    const shabbos = zmanimForDay({ date: "2026-08-15", morning: KRAKOW, evening: KRAKOW });
    assert.equal(shabbos.occasion, "Shabbos");
    assert.equal(shabbos.restDay, true);

    const erevPesach = zmanimForDay({ date: "2026-04-01", morning: KRAKOW, evening: KRAKOW });
    assert.equal(erevPesach.occasion, "Erev Pesach");
    assert.ok(timeOf(erevPesach, "candle-lighting"));
  });

  it("shows alos on a fast, because that is when it starts", () => {
    const yomKippur = zmanimForDay({ date: "2026-09-21", morning: KRAKOW, evening: KRAKOW });
    assert.equal(yomKippur.occasion, "Yom Kippur");
    assert.ok(timeOf(yomKippur, "alos"));
    assert.ok(timeOf(yomKippur, "tzeit"));

    const ordinary = zmanimForDay({ date: "2026-08-18", morning: KRAKOW, evening: KRAKOW });
    assert.equal(timeOf(ordinary, "alos"), null);
  });

  it("keeps the second day of yom tov out of Eretz Yisrael", () => {
    // 9 April 2026 is the eighth day of Pesach in chutz la'aretz, and Isru Chag
    // in Israel. A trip to Yerushalayim must not be told to keep a yom tov it
    // does not keep.
    const inChul = zmanimForDay({ date: "2026-04-09", morning: KRAKOW, evening: KRAKOW });
    const inIsrael = zmanimForDay({ date: "2026-04-09", morning: JERUSALEM, evening: JERUSALEM });
    assert.equal(inChul.restDay, true);
    assert.equal(inIsrael.restDay, false);
    assert.equal(inIsrael.occasion, "Isru Chag");
  });

  it("reads the calendar the same way whichever side of the day is asked", () => {
    assert.equal(jewishDay("2026-08-15", false).occasion, "Shabbos");
    assert.equal(jewishDay("2026-08-15", true).occasion, "Shabbos");
  });
});

describe("a day that does not stay in one place", () => {
  it("splits the day when the drive moves the clock", () => {
    const travel = zmanimForDay({ date: "2026-08-18", morning: WARSAW, evening: KRAKOW });
    assert.equal(travel.blocks.length, 2);
    const [morning, evening] = travel.blocks;
    assert.equal(morning!.span, "morning");
    assert.equal(evening!.span, "evening");
    assert.equal(morning!.placeName, "Warsaw");
    assert.equal(evening!.placeName, "Kraków");
    // The morning half carries the morning, and hands nothing on.
    assert.ok(morning!.entries.some((e) => e.id === "sof-zman-shema-gra"));
    assert.ok(!morning!.entries.some((e) => e.id === "sunset"));
    assert.ok(evening!.entries.some((e) => e.id === "sunset"));
    assert.ok(!evening!.entries.some((e) => e.id === "sof-zman-shema-gra"));
  });

  it("stays one block when both ends of the day keep the same clock", () => {
    // Two points thirteen kilometres apart are the same city and the same times.
    const near = zmanimForDay({
      date: "2026-08-18",
      morning: { coordinates: "50.0100,19.8000", country: "Poland" },
      evening: KRAKOW,
    });
    assert.equal(near.blocks.length, 1);
    assert.equal(near.blocks[0]!.span, "day");
  });
});

describe("putting a clock to a place", () => {
  it("takes the timezone from the country the stop carries", () => {
    const place = resolveDayPlace(KRAKOW);
    assert.equal(place?.timeZoneId, "Europe/Warsaw");
    assert.equal(place?.placeName, "Kraków");
  });

  it("lends a nearby city's timezone to a hotel, which carries no country", () => {
    const hotel = resolveDayPlace({ coordinates: "50.0619,19.9370" });
    assert.equal(hotel?.timeZoneId, "Europe/Warsaw");
    assert.equal(hotel?.placeName, "Kraków");
  });

  it("refuses rather than guessing an offset off the longitude", () => {
    // Reykjavik: no country mapping, and no city we hold near enough to borrow
    // from. A fixed offset has no daylight saving in it and would read an hour
    // wrong for half the year, which is worse than saying nothing.
    assert.equal(resolveDayPlace({ coordinates: "64.1466,-21.9426", country: "Iceland" }), null);

    const day = zmanimForDay({ date: "2026-08-18", morning: { coordinates: "64.1466,-21.9426" } });
    assert.equal(day.blocks.length, 0);
    assert.match(day.unavailable ?? "", /timezone we trust/);
  });

  it("tells an empty day apart from an unplaceable one", () => {
    const empty = zmanimForDay({ date: "2026-08-18" });
    assert.match(empty.unavailable ?? "", /no place on it yet/);
  });

  it("never throws on a half-planned day", () => {
    assert.doesNotThrow(() => zmanimForDay({ date: "2026-08-18", morning: { coordinates: "not a point" } }));
    assert.doesNotThrow(() => zmanimForDay({ date: "2026-08-18", evening: { country: "Poland" } }));
  });
});

describe("where the trip says each day is", () => {
  function day(date: string, extra: Partial<ItineraryDay> = {}): ItineraryDay {
    return {
      date,
      label: date,
      index: 0,
      flightsDeparting: [],
      flightsArriving: [],
      lodging: null,
      activities: [],
      warnings: [],
      freeHours: null,
      travelHours: 0,
      borderMinutes: 0,
      travelLegs: [],
      ...extra,
    };
  }

  const stop = (name: string, coordinates: string, country?: string) => ({
    id: name,
    name,
    date: "",
    coordinates,
    country,
    distanceFromPrev: null,
    travelMinutesFromPrev: null,
  });

  it("wakes the traveler where last night's bed was", () => {
    const days = [
      day("2026-08-17", {
        lodging: { id: "a", type: "hotel", name: "Warsaw hotel", coordinates: WARSAW.coordinates, checkIn: "2026-08-17", checkOut: "2026-08-18" },
      }),
      day("2026-08-18", {
        activities: [stop("Kever", KRAKOW.coordinates, "Poland")],
        lodging: { id: "b", type: "hotel", name: "Kraków hotel", coordinates: KRAKOW.coordinates, checkIn: "2026-08-18", checkOut: "2026-08-19" },
      }),
    ];
    const asked = zmanimRequestFor(days);
    assert.equal(asked[1]!.morning?.coordinates, WARSAW.coordinates);
    assert.equal(asked[1]!.evening?.coordinates, KRAKOW.coordinates);
    // The hotel has no country of its own, so the day's stops lend it one.
    assert.equal(asked[1]!.evening?.country, "Poland");
  });

  it("falls back to the day's own stops when there is no bed either side", () => {
    const days = [day("2026-08-18", { activities: [stop("Kever", KRAKOW.coordinates, "Poland")] })];
    const asked = zmanimRequestFor(days);
    assert.equal(asked[0]!.morning?.coordinates, KRAKOW.coordinates);
    assert.equal(asked[0]!.evening?.coordinates, KRAKOW.coordinates);
  });

  it("asks for nothing about a day with nowhere on it", () => {
    const asked = zmanimRequestFor([day("2026-08-18")]);
    assert.equal(asked[0]!.morning, undefined);
    assert.equal(asked[0]!.evening, undefined);
  });
});
