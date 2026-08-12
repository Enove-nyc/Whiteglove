import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { kosherEateries } from "../data/kosher-eateries";
import { coordinatesToPoint } from "../data/route-utils";
import { getHechsher } from "../data/hechsherim";

// Restaurants are the hardest content on this site to keep honest, and these
// are the rules that keep them honest — written as tests rather than as good
// intentions, because good intentions are what a rushed batch overrides.
//
// The central one: NOTHING RESEARCHED MAY SHIP AS "CERTIFIED". That word means
// somebody checked with the certifying body. A directory saying a place is
// under a hechsher is "reported", which prints as unverified and tells the
// reader to check before eating. The distance between those two words is the
// distance between a listing and a promise.

describe("what an eatery may claim about its kashrus", () => {
  test("nothing ships as certified without a person having confirmed it", () => {
    const certified = kosherEateries.filter((e) => e.hechsher.state === "certified");
    assert.deepEqual(
      certified.map((e) => e.slug),
      [],
      "an eatery claims certified kashrus; confirm with the certifying body, record confirmedAt, then allowlist it here",
    );
  });

  test("every state is one the hechsher system knows", () => {
    for (const e of kosherEateries) {
      assert.ok(["certified", "reported", "none", "unverified"].includes(e.hechsher.state), `${e.slug}`);
    }
  });

  test("anything stronger than unverified says where it came from", () => {
    // The hechsher type requires a source for exactly this reason. A claim with
    // nothing behind it is the thing this whole design exists to prevent.
    for (const e of kosherEateries) {
      if (e.hechsher.state === "unverified") continue;
      const backed = Boolean(e.hechsher.source?.trim()) || Boolean(e.hechsher.note?.trim());
      assert.ok(backed, `${e.slug} claims "${e.hechsher.state}" with nothing behind it`);
    }
  });

  test("a named hechsher id is one that actually exists", () => {
    for (const e of kosherEateries) {
      if (!e.hechsher.hechsherId) continue;
      assert.ok(getHechsher(e.hechsher.hechsherId), `${e.slug} names an unknown hechsher "${e.hechsher.hechsherId}"`);
    }
  });
});

describe("what an eatery does not store", () => {
  test("no opening hours, ever", () => {
    // A stale opening time sends a family across a city to a locked door on
    // Erev Shabbos. The live link is how a reader gets the current answer.
    for (const e of kosherEateries) {
      assert.ok(!("hours" in e), `${e.slug} stores hours`);
      assert.ok(!("openingTimes" in e), `${e.slug} stores opening times`);
    }
  });

  test("no prices and no menu", () => {
    for (const e of kosherEateries) {
      for (const field of ["price", "prices", "menu", "priceRange"]) {
        assert.ok(!(field in e), `${e.slug} stores ${field}`);
      }
    }
  });
});

describe("an eatery can be reached and checked", () => {
  test("every entry carries a source", () => {
    for (const e of kosherEateries) {
      assert.ok(e.sourceUrl?.startsWith("http"), `${e.slug} has no source`);
    }
  });

  test("every entry says what it is and who it suits", () => {
    for (const e of kosherEateries) {
      assert.ok(e.summary.trim().length > 30, `${e.slug}'s summary is too thin to help anyone decide`);
      assert.ok(e.city.trim() && e.country.trim(), `${e.slug} has no place`);
    }
  });

  test("every coordinate is one the site can navigate to", () => {
    for (const e of kosherEateries) {
      if (!e.coordinates) continue;
      const point = coordinatesToPoint(e.coordinates);
      assert.ok(point, `${e.slug}: "${e.coordinates}" cannot be parsed`);
      assert.ok(point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180, `${e.slug} out of range`);
      assert.ok(point.lat !== 0 || point.lng !== 0, `${e.slug} points at Null Island`);
    }
  });

  test("slugs are unique", () => {
    const slugs = kosherEateries.map((e) => e.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  test("an entry that names a quarter names one that exists", async () => {
    // The tie back to the stays data is what lets somebody choose a hotel by
    // where the food is, so a broken reference quietly costs that.
    const { kosherAreas } = await import("../data/kosher-stays");
    const known = new Set(kosherAreas.map((a) => a.slug));
    for (const e of kosherEateries) {
      if (!e.nearQuarter) continue;
      assert.ok(known.has(e.nearQuarter), `${e.slug} points at quarter "${e.nearQuarter}", which does not exist`);
    }
  });

  test("a last-checked date is a real day or is absent", () => {
    for (const e of kosherEateries) {
      if (!e.lastChecked) continue;
      assert.match(e.lastChecked, /^\d{4}-\d{2}-\d{2}$/, `${e.slug} lastChecked is not a day`);
    }
  });
});
