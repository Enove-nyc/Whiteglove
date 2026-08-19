import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eruvFromInput, eruvId, eruvProblem, listEruvin, type EruvInput } from "@/lib/eruvin";

const good: EruvInput = {
  name: "The Golders Green Eruv",
  city: "London",
  country: "United Kingdom",
  covers: "Golders Green and Hendon",
  statusUrl: "https://example.org/status",
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

  it("insists the status link is a real web address — the whole point of a listing", () => {
    assert.match(eruvProblem({ ...good, statusUrl: "golders-green" }) ?? "", /web address/i);
    assert.match(eruvProblem({ ...good, statusUrl: "" }) ?? "", /web address/i);
    assert.equal(eruvProblem({ ...good, statusUrl: "http://example.org" }), null);
  });

  it("turns input into a listing, trimmed, flagged as added, with a stable id", () => {
    const listing = eruvFromInput({ ...good, name: "  The Golders Green Eruv  " });
    assert.equal(listing.name, "The Golders Green Eruv");
    assert.equal(listing.added, true);
    assert.equal(listing.id, eruvId(good));
    // The same city and name always give the same id, so re-adding replaces
    // rather than duplicating.
    assert.equal(eruvId(good), eruvId({ ...good, statusUrl: "https://other.example/status" }));
  });

  it("gives an accented name a clean ascii id", () => {
    const id = eruvId({ ...good, city: "Zürich", name: "Eruv" });
    assert.match(id, /^eruv-added-[a-z0-9-]+$/);
  });

  it("still reads the built-in list synchronously", () => {
    const built = listEruvin();
    assert.ok(built.length > 0);
    assert.ok(built.every((e) => e.statusUrl.startsWith("http")));
  });
});
