import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eruvFromInput, eruvId, eruvProblem, listEruvin, type EruvInput } from "@/lib/eruvin";

const good: EruvInput = {
  name: "The Golders Green Eruv",
  city: "London",
  country: "United Kingdom",
  covers: "Golders Green and Hendon",
  sourceUrl: "https://example.org/eruv",
};

describe("adding an eruv from the admin", () => {
  it("accepts a complete eruv", () => {
    assert.equal(eruvProblem(good), null);
  });

  it("refuses one without the fields that make it a listing", () => {
    assert.match(eruvProblem({ ...good, name: "  " }) ?? "", /name/i);
    assert.match(eruvProblem({ ...good, city: "" }) ?? "", /city/i);
    assert.match(eruvProblem({ ...good, country: "" }) ?? "", /country/i);
  });

  it("insists the source link is a real web address — the whole point of a listing", () => {
    assert.match(eruvProblem({ ...good, sourceUrl: "golders-green" }) ?? "", /web address/i);
    assert.match(eruvProblem({ ...good, sourceUrl: "" }) ?? "", /web address/i);
    assert.equal(eruvProblem({ ...good, sourceUrl: "http://example.org" }), null);
  });

  it("accepts an optional boundary map, but rejects a malformed one", () => {
    assert.equal(eruvProblem({ ...good, mapUrl: "https://example.org/map.png" }), null);
    assert.equal(eruvProblem({ ...good, mapUrl: null }), null);
    assert.match(eruvProblem({ ...good, mapUrl: "not-a-url" }) ?? "", /map link/i);
  });

  it("turns input into a listing, trimmed, flagged as added, with a stable id", () => {
    const listing = eruvFromInput({ ...good, name: "  The Golders Green Eruv  " });
    assert.equal(listing.name, "The Golders Green Eruv");
    assert.equal(listing.added, true);
    assert.equal(listing.id, eruvId(good));
    // The same city and name always give the same id, so re-adding replaces
    // rather than duplicating.
    assert.equal(eruvId(good), eruvId({ ...good, sourceUrl: "https://other.example/eruv" }));
  });

  it("gives an accented name a clean ascii id", () => {
    const id = eruvId({ ...good, city: "Zürich", name: "Eruv" });
    assert.match(id, /^eruv-added-[a-z0-9-]+$/);
  });

  it("still reads the built-in list synchronously", () => {
    const built = listEruvin();
    assert.ok(built.length > 0);
    assert.ok(built.every((e) => e.sourceUrl.startsWith("http")));
  });
});
