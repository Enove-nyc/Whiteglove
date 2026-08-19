import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { heritageFromInput, heritageProblem, heritageSlug, type HeritageInput } from "@/lib/heritage-cemeteries";

const good: HeritageInput = {
  name: "Bratislava — beis hachaim",
  city: "Bratislava",
  country: "Slovakia",
  address: "Žižkova, Bratislava",
  coordinates: "48.1486, 17.1077",
  sourceUrl: "https://app.nesiyatova.com/category-detail/?MkmId=999",
};

describe("adding a heritage cemetery from the admin", () => {
  it("accepts a complete entry", () => {
    assert.equal(heritageProblem(good), null);
  });

  it("refuses one missing the fields that make it a locator entry", () => {
    assert.match(heritageProblem({ ...good, name: " " }) ?? "", /name/i);
    assert.match(heritageProblem({ ...good, city: "" }) ?? "", /city/i);
    assert.match(heritageProblem({ ...good, country: "" }) ?? "", /country/i);
  });

  it("insists on a real coordinate — a locator entry is a point on the map", () => {
    assert.match(heritageProblem({ ...good, coordinates: "near the river" }) ?? "", /coordinates/i);
    assert.match(heritageProblem({ ...good, coordinates: "" }) ?? "", /coordinates/i);
  });

  it("insists on a details link to forward to", () => {
    assert.match(heritageProblem({ ...good, sourceUrl: "nesiyatova" }) ?? "", /web address/i);
  });

  it("turns input into a listing, flagged added, with a stable slug", () => {
    const listing = heritageFromInput({ ...good, name: "  Bratislava — beis hachaim  " });
    assert.equal(listing.name, "Bratislava — beis hachaim");
    assert.equal(listing.added, true);
    assert.equal(listing.coordinates, "48.1486, 17.1077");
    assert.equal(listing.slug, heritageSlug(good));
    assert.match(listing.slug, /^bh-added-[a-z0-9-]+$/);
    // Same city and name give the same slug, so re-adding replaces.
    assert.equal(heritageSlug(good), heritageSlug({ ...good, sourceUrl: "https://other.example" }));
  });
});
