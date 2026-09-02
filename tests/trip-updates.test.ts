import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { CurrentUpdate } from "@/data/current-updates";
import type { TripAlert } from "@/data/trip-alerts";
import type { TripAdvisories } from "@/lib/trip-advisories";
import {
  MAX_PLACE_NOTICES,
  destinationSlugsOnTrip,
  nextTripFor,
  noticesForTrip,
  tripUpdates,
} from "@/lib/trip-updates";

const HREF = "/command-center";

function alert(over: Partial<TripAlert> = {}): TripAlert {
  return {
    id: "a1",
    kind: "flight_delay",
    flightId: "f1",
    title: "LY1 delayed",
    note: "Now running about 45 minutes late.",
    createdAt: "2026-09-01T09:00:00.000Z",
    acknowledged: false,
    ...over,
  };
}

function notice(over: Partial<CurrentUpdate> = {}): CurrentUpdate {
  return {
    id: "n1",
    kind: "moved",
    title: "The bakery has moved",
    detail: "Now two streets over, by the square.",
    destinationSlug: "krakow",
    startsOn: "2026-08-01",
    endsOn: "2026-10-01",
    source: "Spoke to the owner",
    published: true,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...over,
  };
}

function roll(level: number | null, over: Partial<TripAdvisories> = {}): TripAdvisories {
  return {
    countries: [
      {
        country: "Ukraine",
        stops: 2,
        advisory: level === null ? null : { country: "Ukraine", level, levelLabel: `Level ${level}: Do Not Travel`, summary: "Do not travel to Ukraine.", link: "https://example.gov/ua" },
      },
    ],
    stopsWithNoCountry: 0,
    highest: level,
    anyUnknown: false,
    ...over,
  };
}

test("nothing changed means no list at all, not an empty heading", () => {
  assert.deepEqual(tripUpdates({ alerts: [], advisories: null, notices: [], tripHref: HREF }), []);
});

test("an acknowledged flight alert is not shown again", () => {
  const out = tripUpdates({ alerts: [alert({ acknowledged: true })], advisories: null, notices: [], tripHref: HREF });
  assert.deepEqual(out, []);
});

test("a live flight alert leads, and points at the trip's own page", () => {
  const out = tripUpdates({ alerts: [alert()], advisories: null, notices: [], tripHref: HREF });
  assert.equal(out.length, 1);
  assert.equal(out[0].source, "flight");
  assert.equal(out[0].title, "LY1 delayed");
  assert.equal(out[0].href, HREF);
});

test("a cancellation is drawn louder than a delay", () => {
  const cancelled = tripUpdates({ alerts: [alert({ kind: "flight_cancelled" })], advisories: null, notices: [], tripHref: HREF });
  assert.equal(cancelled[0].tone, "danger");
  assert.equal(tripUpdates({ alerts: [alert()], advisories: null, notices: [], tripHref: HREF })[0].tone, "caution");
});

test("a level 1 or 2 advisory is not repeated here", () => {
  for (const level of [1, 2]) {
    assert.deepEqual(tripUpdates({ alerts: [], advisories: roll(level), notices: [], tripHref: HREF }), []);
  }
});

test("a level 3 or 4 advisory is, in the State Department's own words", () => {
  const out = tripUpdates({ alerts: [], advisories: roll(4), notices: [], tripHref: HREF });
  assert.equal(out.length, 1);
  assert.equal(out[0].label, "Ukraine");
  assert.equal(out[0].title, "Level 4: Do Not Travel");
  assert.equal(out[0].detail, "Do not travel to Ukraine.");
  assert.equal(out[0].href, "https://example.gov/ua");
  assert.equal(out[0].external, true);
});

test("a country with no advisory in the feed adds no row", () => {
  assert.deepEqual(tripUpdates({ alerts: [], advisories: roll(null), notices: [], tripHref: HREF }), []);
});

test("flights come before advisories, and advisories before place notices", () => {
  const out = tripUpdates({ alerts: [alert()], advisories: roll(4), notices: [notice()], tripHref: HREF });
  assert.deepEqual(out.map((u) => u.source), ["flight", "advisory", "place"]);
});

test("a place notice links to the destination it is about", () => {
  const out = tripUpdates({ alerts: [], advisories: null, notices: [notice()], tripHref: HREF });
  assert.equal(out[0].href, "/destinations/krakow");
  assert.equal(out[0].label, "Moved");
  assert.notEqual(out[0].external, true);
});

test("destination slugs are read off the stops that link to one, once each", () => {
  const slugs = destinationSlugsOnTrip([
    { href: "/destinations/krakow" },
    { href: "/destinations/krakow/" },
    { href: "/cemeteries/lizhensk" },
    { href: "https://booking.example.com/hotel" },
    {},
  ]);
  assert.deepEqual(slugs, ["krakow"]);
});

test("only published, in-window notices for this trip's places are gathered", () => {
  const updates = [
    notice({ id: "live" }),
    notice({ id: "draft", published: false }),
    notice({ id: "lapsed", endsOn: "2026-08-10" }),
    notice({ id: "elsewhere", destinationSlug: "vienna" }),
  ];
  const got = noticesForTrip(updates, ["krakow"], "2026-09-02");
  assert.deepEqual(got.map((u) => u.id), ["live"]);
});

test("place notices are capped, soonest to lapse first", () => {
  const updates = [
    notice({ id: "d", endsOn: "2026-12-01" }),
    notice({ id: "a", endsOn: "2026-09-10" }),
    notice({ id: "c", endsOn: "2026-11-01" }),
    notice({ id: "b", endsOn: "2026-10-01" }),
  ];
  const got = noticesForTrip(updates, ["krakow"], "2026-09-02");
  assert.equal(got.length, MAX_PLACE_NOTICES);
  assert.deepEqual(got.map((u) => u.id), ["a", "b", "c"]);
});

test("the same notice on two of the trip's places is only counted once", () => {
  const shared = notice({ id: "one", destinationSlug: "krakow" });
  const got = noticesForTrip([shared], ["krakow", "krakow"], "2026-09-02");
  assert.equal(got.length, 1);
});

test("the trip chosen is the soonest one that has not finished", () => {
  const trips = [
    { id: "past", startDate: "2026-01-01", endDate: "2026-01-10" },
    { id: "later", startDate: "2026-12-01", endDate: "2026-12-10" },
    { id: "next", startDate: "2026-10-01", endDate: "2026-10-08" },
  ];
  assert.equal(nextTripFor(trips, "2026-09-02")?.id, "next");
});

test("a trip already under way is still the one, until its last day passes", () => {
  const trips = [{ id: "now", startDate: "2026-08-30", endDate: "2026-09-05" }];
  assert.equal(nextTripFor(trips, "2026-09-02")?.id, "now");
  assert.equal(nextTripFor(trips, "2026-09-06"), null);
});

test("a trip with no dates cannot be current about anything", () => {
  assert.equal(nextTripFor([{ id: "x", startDate: "", endDate: "" }], "2026-09-02"), null);
});

test("the rules half reads nothing — no store, no feed, no session", () => {
  const source = readFileSync(new URL("../lib/trip-updates.ts", import.meta.url), "utf8");
  const code = source.slice(source.indexOf("export type TripUpdateSource"));
  for (const forbidden of ["fetch(", "process.env", "cookies(", "redis"]) {
    assert.ok(!code.includes(forbidden), `lib/trip-updates.ts should not contain ${forbidden}`);
  }
});
