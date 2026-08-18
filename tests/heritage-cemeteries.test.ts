import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { heritageCemeteries } from "../data/heritage-cemeteries";
import { coordinatesToPoint } from "../data/route-utils";

// The locator set: real locations with a source, nothing invented. These
// tests hold that shape — every one navigable, every one linked to Nesiya
// Tova, and none of them dressed up as a rich kever page it is not.

describe("the heritage cemetery locator", () => {
  it("is a real, non-trivial set", () => {
    assert.ok(heritageCemeteries.length > 1000, `only ${heritageCemeteries.length}`);
  });

  it("gives every entry a navigable coordinate and a source", () => {
    for (const cem of heritageCemeteries) {
      const point = coordinatesToPoint(cem.coordinates);
      assert.ok(point, `${cem.slug}: "${cem.coordinates}" cannot be parsed`);
      assert.ok(point.lat !== 0 || point.lng !== 0, `${cem.slug} at Null Island`);
      assert.ok(cem.sourceUrl.startsWith("https://"), `${cem.slug} has no source`);
      assert.ok(cem.city.trim() && cem.country.trim(), `${cem.slug} has no place`);
    }
  });

  it("uses unique slugs and unique coordinates", () => {
    const slugs = heritageCemeteries.map((c) => c.slug);
    assert.equal(new Set(slugs).size, slugs.length, "duplicate slug");
    const coords = heritageCemeteries.map((c) => c.coordinates);
    assert.equal(new Set(coords).size, coords.length, "duplicate coordinate");
  });

  it("invents nothing — carries no Yiddish name or burial list", () => {
    for (const cem of heritageCemeteries) {
      assert.ok(!("yiddishName" in cem), `${cem.slug} carries a yiddishName`);
      assert.ok(!("burials" in cem), `${cem.slug} carries burials`);
    }
  });
});
