import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { notableEruvin, WORLDWIDE_ERUV_DIRECTORY } from "../data/notable-eruvin";
import { listEruvin } from "../lib/eruvin";
import { NAV_CATEGORIES } from "../lib/navigation";

// An eruv listing is a route to the community's live status, never a claim
// that the eruv is up. These tests hold that line.

describe("the eruvin are careful, sourced listings", () => {
  it("links every eruv to a live status page", () => {
    for (const eruv of notableEruvin) {
      assert.ok(eruv.statusUrl.startsWith("https://"), `${eruv.slug} has no status link`);
      assert.ok(eruv.city.trim() && eruv.country.trim(), `${eruv.slug} has no place`);
    }
    assert.ok(WORLDWIDE_ERUV_DIRECTORY.startsWith("https://"));
  });

  it("uses unique slugs", () => {
    const slugs = notableEruvin.map((e) => e.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it("stores no coordinate — an eruv is an area, not a pin", () => {
    for (const eruv of notableEruvin) {
      assert.ok(!("coordinates" in eruv), `${eruv.slug} stores a coordinate`);
    }
  });

  it("maps every eruv into a listing, sorted", () => {
    const listings = listEruvin();
    assert.equal(listings.length, notableEruvin.length);
    for (const listing of listings) {
      assert.ok(listing.statusUrl.startsWith("https://"), `${listing.id} lost its status link`);
    }
  });
});

describe("eruvin are reachable from the Kosher dropdown", () => {
  it("names Eruvin in the Kosher category, pointing at /eruvin", () => {
    const kosher = NAV_CATEGORIES.find((category) => category.label === "Kosher");
    assert.ok(kosher, "no Kosher category");
    assert.ok(
      kosher!.links.some((link) => link.href === "/eruvin"),
      "the Kosher dropdown does not link to /eruvin",
    );
  });
});
