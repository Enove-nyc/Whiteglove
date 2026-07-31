import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { movePlace, optimizeRoute, withPlaceFirst, withPlaceLast, type SavedPlace } from "@/data/route-utils";
import { borderCrossings, countryOf } from "@/lib/borders";
import { CANDLE_LIGHTING_MINUTES, isFriday, isShabbos, shabbosWarning, sunsetMinutesUtc } from "@/lib/shabbos";

const at = (id: string, lat: number, lng: number, extra: Partial<SavedPlace> = {}): SavedPlace => ({
  id, name: id, address: `${id} address`, coordinates: `${lat}, ${lng}`, ...extra,
});
const ids = (places: SavedPlace[]) => places.map((p) => p.id);

describe("a route with chosen ends", () => {
  it("keeps the start where it was put, however far away it is", () => {
    // The airport you land at is a decision, not a distance to be optimised
    // away into the middle of the trip.
    const route = optimizeRoute([
      at("airport", 50.0, 19.8, { anchor: "start" }),
      at("near-b", 49.0, 22.0),
      at("near-a", 49.1, 22.1),
      at("far", 48.0, 30.0),
    ]);
    assert.equal(ids(route)[0], "airport");
  });

  it("keeps the end at the end", () => {
    const route = optimizeRoute([
      at("a", 50.0, 20.0),
      at("uman", 48.75, 30.22, { anchor: "end" }),
      at("b", 50.1, 20.2),
      at("c", 49.5, 21.0),
    ]);
    assert.equal(ids(route)[ids(route).length - 1], "uman");
  });

  it("still optimises everything between them", () => {
    const route = optimizeRoute([
      at("start", 50.0, 20.0, { anchor: "start" }),
      at("far", 48.0, 30.0),
      at("close", 50.1, 20.1),
      at("mid", 49.0, 25.0),
      at("end", 47.0, 35.0, { anchor: "end" }),
    ]);
    assert.deepEqual(ids(route), ["start", "close", "mid", "far", "end"]);
  });

  it("never leaves two stops claiming the same end", () => {
    let route: SavedPlace[] = [at("a", 50, 20), at("b", 51, 21)];
    route = withPlaceFirst(route, route[0]);
    route = withPlaceFirst(route, at("c", 52, 22));
    assert.equal(route.filter((p) => p.anchor === "start").length, 1);
    assert.equal(ids(route)[0], "c");
  });

  it("lets one stop be both ends of a one-stop route without breaking", () => {
    const single = withPlaceLast(withPlaceFirst([], at("a", 50, 20)), at("a", 50, 20));
    assert.equal(single.length, 1);
    assert.deepEqual(ids(optimizeRoute(single)), ["a"]);
  });
});

describe("moving a stop by hand", () => {
  it("swaps it with its neighbour", () => {
    const route = [at("a", 50, 20), at("b", 51, 21), at("c", 52, 22)];
    assert.deepEqual(ids(movePlace(route, "b", -1)), ["b", "a", "c"]);
    assert.deepEqual(ids(movePlace(route, "b", 1)), ["a", "c", "b"]);
  });

  it("does nothing at the ends of the list", () => {
    const route = [at("a", 50, 20), at("b", 51, 21)];
    assert.deepEqual(ids(movePlace(route, "a", -1)), ["a", "b"]);
    assert.deepEqual(ids(movePlace(route, "b", 1)), ["a", "b"]);
    assert.deepEqual(ids(movePlace(route, "nope", 1)), ["a", "b"]);
  });

  it("will not quietly unpin a chosen end", () => {
    // Two clicks should not undo "start here" without anybody saying so.
    const route = [at("start", 50, 20, { anchor: "start" }), at("b", 51, 21), at("c", 52, 22)];
    assert.deepEqual(ids(movePlace(route, "b", -1)), ["start", "b", "c"]);
    assert.deepEqual(ids(movePlace(route, "b", 1)), ["start", "c", "b"]);
  });
});

describe("borders", () => {
  it("reads the country off an address when the record does not carry one", () => {
    assert.equal(countryOf({ address: "Górna 16, 37-300 Leżajsk, Poland" }), "Poland");
    assert.equal(countryOf({ address: "Pushkina St 27A, Uman, Cherkasy Oblast, Ukraine, 20300" }), "Ukraine");
    assert.equal(countryOf({ address: "somewhere" }), null);
  });

  it("treats the same country spelled differently as the same country", () => {
    assert.equal(countryOf({ address: "x", country: "Czech Republic" }), "Czechia");
    assert.equal(countryOf({ address: "x", country: "UK" }), "United Kingdom");
  });

  it("flags leaving the Schengen area as the one that costs hours", () => {
    const crossings = borderCrossings([
      { name: "Kraków", address: "Kraków, Poland" },
      { name: "Lizhensk", address: "Leżajsk, Poland" },
      { name: "Uman", address: "Uman, Ukraine" },
    ]);
    assert.equal(crossings.length, 1, "two Polish stops in a row are not a crossing");
    assert.equal(crossings[0].major, true);
    assert.match(crossings[0].message, /several hours/);
    assert.equal(crossings[0].fromPlace, "Lizhensk");
  });

  it("says an internal crossing is drive-through, without pretending it is nothing", () => {
    const [crossing] = borderCrossings([
      { name: "Kraków", address: "Kraków, Poland" },
      { name: "Vienna", address: "Vienna, Austria" },
    ]);
    assert.equal(crossing.major, false);
    assert.match(crossing.message, /passports/i);
  });

  it("skips a stop whose country cannot be worked out rather than inventing a crossing", () => {
    // Announcing a border that is not there teaches people to ignore the
    // warnings, which costs more than the missing one.
    assert.deepEqual(
      borderCrossings([
        { name: "Kraków", address: "Kraków, Poland" },
        { name: "Mystery", address: "no country here" },
        { name: "Warsaw", address: "Warsaw, Poland" },
      ]),
      [],
    );
  });
});

describe("Shabbos", () => {
  it("knows which day it is", () => {
    assert.equal(isFriday("2026-08-07"), true);
    assert.equal(isShabbos("2026-08-08"), true);
    assert.equal(isFriday("2026-08-08"), false);
  });

  it("computes a sunset that matches reality to within a few minutes", () => {
    // Kraków, 21 June 2026. Sunset is about 20:59 local (CEST, UTC+2), so
    // about 18:59 UTC = 1139 minutes.
    const minutes = sunsetMinutesUtc(new Date("2026-06-21T12:00:00Z"), 50.0647, 19.945);
    assert.ok(minutes !== null);
    assert.ok(Math.abs(minutes! - 1139) < 10, `expected ~1139 minutes UTC, got ${Math.round(minutes!)}`);
  });

  it("says nothing at all when there is no sunset to speak of", () => {
    // Above the arctic circle in midsummer the honest answer is that the sun
    // does not set, not a made-up time.
    assert.equal(sunsetMinutesUtc(new Date("2026-06-21T12:00:00Z"), 78.2, 15.6), null);
  });

  it("warns about anything planned on Shabbos itself", () => {
    const warning = shabbosWarning("2026-08-08", "10:00", "50.0647, 19.945", "This stop");
    assert.equal(warning?.kind, "on-shabbos");
  });

  it("warns when a Friday plan lands after candle-lighting", () => {
    // Kraków in December: candles well before 16:00.
    const warning = shabbosWarning("2026-12-11", "17:30", "50.0647, 19.945", "Arrival");
    assert.equal(warning?.kind, "after-candles");
    assert.match(warning!.message, /after candle-lighting/);
    assert.ok(warning!.candleLighting);
  });

  it("warns when a Friday plan is cutting it fine", () => {
    const late = shabbosWarning("2026-12-11", "14:45", "50.0647, 19.945", "Arrival");
    assert.equal(late?.kind, "close-to-candles");
  });

  it("says nothing about a Friday morning, which is not a problem", () => {
    assert.equal(shabbosWarning("2026-12-11", "08:00", "50.0647, 19.945", "Arrival"), null);
  });

  it("still flags the day when there are no coordinates, rather than guessing a time", () => {
    const warning = shabbosWarning("2026-08-07", "16:00", undefined, "Arrival");
    assert.equal(warning?.kind, "close-to-candles");
    assert.equal(warning?.candleLighting, undefined);
    assert.match(warning!.message, /local candle-lighting/);
  });

  it("ignores a date or time it cannot read instead of warning about nothing", () => {
    assert.equal(shabbosWarning("next Friday", "16:00", "50, 19", "x"), null);
    assert.equal(shabbosWarning("2026-13-45", "16:00", "50, 19", "x"), null);
  });

  it("lights candles before sunset, not after", () => {
    assert.ok(CANDLE_LIGHTING_MINUTES > 0);
  });
});
