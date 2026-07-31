import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { placeRole, withPlaceFirst, withPlaceLast, type SavedPlace } from "@/data/route-utils";

// "Start here" and "End here" are how somebody actually plans a trip: they
// know they land at Kraków and finish at Uman, and the rest arranges itself
// between the two. One press has to do what it says, including when the place
// is not on the route yet.

const p = (id: string): SavedPlace => ({ id, name: id, address: `${id} address` });
const ids = (places: SavedPlace[]) => places.map((place) => place.id);

describe("putting a place at the start", () => {
  it("adds it when the route does not have it", () => {
    assert.deepEqual(ids(withPlaceFirst([p("a"), p("b")], p("c"))), ["c", "a", "b"]);
  });

  it("moves it rather than duplicating it", () => {
    assert.deepEqual(ids(withPlaceFirst([p("a"), p("b"), p("c")], p("c"))), ["c", "a", "b"]);
  });

  it("is a no-op when it is already the start", () => {
    assert.deepEqual(ids(withPlaceFirst([p("a"), p("b")], p("a"))), ["a", "b"]);
  });

  it("works on an empty route", () => {
    assert.deepEqual(ids(withPlaceFirst([], p("a"))), ["a"]);
  });
});

describe("putting a place at the end", () => {
  it("adds it when the route does not have it", () => {
    assert.deepEqual(ids(withPlaceLast([p("a"), p("b")], p("c"))), ["a", "b", "c"]);
  });

  it("moves it rather than duplicating it", () => {
    assert.deepEqual(ids(withPlaceLast([p("a"), p("b"), p("c")], p("a"))), ["b", "c", "a"]);
  });

  it("keeps the other stops in the order they were in", () => {
    assert.deepEqual(ids(withPlaceLast([p("a"), p("b"), p("c"), p("d")], p("b"))), ["a", "c", "d", "b"]);
  });
});

describe("what the buttons say", () => {
  it("knows where a place sits", () => {
    const route = [p("a"), p("b"), p("c")];
    assert.equal(placeRole(route, "a"), "start");
    assert.equal(placeRole(route, "b"), "middle");
    assert.equal(placeRole(route, "c"), "end");
    assert.equal(placeRole(route, "z"), "absent");
  });

  it("calls a single stop the start, not both ends", () => {
    // Lighting up "Starts here" and "Ends here" at once tells nobody anything.
    assert.equal(placeRole([p("a")], "a"), "start");
  });

  it("says absent for an empty route", () => {
    assert.equal(placeRole([], "a"), "absent");
  });

  it("does not confuse a town's guide with its beis hachaim", () => {
    // Two records for the same place are two different stops, and both belong
    // on a route.
    const route = [p("lizhensk"), p("cemetery-lizhensk")];
    assert.equal(placeRole(route, "lizhensk"), "start");
    assert.equal(placeRole(route, "cemetery-lizhensk"), "end");
  });
});
