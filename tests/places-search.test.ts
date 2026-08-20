import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchPlaces } from "@/lib/attraction-search";

/**
 * Autofill in the builder: ONE search across everything a day can hold.
 *
 * The picker used to find only general attractions; now the same box returns
 * kosher places to eat, shuls and mikvaos too — from the same database the
 * kosher site reads — so a planner drops any of them onto a day with the
 * address and position already filled. Kevarim keep their own picker.
 */

describe("one search across everything a day can hold", () => {
  it("returns a kosher place to eat alongside attractions", async () => {
    // Rome has both sights and kosher eateries in the data.
    const results = await searchPlaces("Rome");
    assert.ok(results.length > 0, "Rome should return places");
    assert.ok(results.some((r) => r.kind.startsWith("Kosher")), "a kosher eatery should be pickable from the planner");
  });

  it("gives every result what the planner needs to drop it on a day", async () => {
    const results = await searchPlaces("Rome");
    for (const r of results) {
      assert.ok(r.name.trim().length > 0, "a result with no name");
      assert.ok(r.slug.trim().length > 0, `${r.name} has no slug`);
      assert.ok(r.kind.trim().length > 0, `${r.name} has no kind`);
      assert.ok(r.href.startsWith("/"), `${r.name} has no local href`);
    }
  });

  it("shows one place once, however many lists it is on", async () => {
    const results = await searchPlaces("Rome");
    const keys = results.map((r) => `${r.name.toLowerCase()}|${r.city.toLowerCase()}`);
    assert.equal(new Set(keys).size, keys.length, "a place is listed twice");
  });

  it("does not throw on a one-letter query", async () => {
    const results = await searchPlaces("R");
    assert.ok(Array.isArray(results));
  });
});
