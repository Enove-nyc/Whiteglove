import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { notableMikvaos } from "../data/notable-mikvaos";
import { notableMikvahListings, listPublishedMikvaos } from "../lib/mikvaos";

// Mikvaos are the most sensitive content on the site. These tests hold the
// line the data file draws: a city and a link to the live directory, and
// nothing that pins a private place or ages into a wrong answer.

describe("the notable mikvaos are careful by construction", () => {
  it("links every entry to the live worldwide directory", () => {
    for (const mikvah of notableMikvaos) {
      assert.ok(
        mikvah.directoryUrl.startsWith("https://www.mikvah.org/directory/"),
        `${mikvah.slug} does not point at the worldwide directory`,
      );
      assert.ok(mikvah.city.trim() && mikvah.country.trim(), `${mikvah.slug} has no place`);
    }
  });

  it("uses unique slugs", () => {
    const slugs = notableMikvaos.map((m) => m.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it("publishes no address, no hours and no coordinate", () => {
    // Deliberate: a mikvah's details are given by the community, by
    // appointment, and are not pinned on a public map.
    for (const listing of notableMikvahListings()) {
      assert.equal(listing.address, null, `${listing.name} exposes an address`);
      assert.equal(listing.hours, null, `${listing.name} exposes hours`);
      assert.equal(listing.coordinates, null, `${listing.name} exposes a coordinate`);
    }
  });
});

describe("the notable mikvaos reach the directory", () => {
  it("maps every entry into a listing", () => {
    assert.equal(notableMikvahListings().length, notableMikvaos.length);
  });

  it("appears in the published mikvah list", async () => {
    const published = await listPublishedMikvaos();
    for (const mikvah of notableMikvaos) {
      assert.ok(
        published.some((listing) => listing.name === mikvah.name && listing.city === mikvah.city),
        `${mikvah.slug} did not survive into the published mikvah list`,
      );
    }
  });
});
