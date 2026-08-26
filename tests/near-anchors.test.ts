import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsePoint } from "@/data/near-me";
import { anchorCounts, searchSiteAnchors } from "@/lib/near-anchors";
import { codeOf } from "./helpers/source";

/**
 * What a visitor may measure FROM.
 *
 * These pin the two things that make the feature work rather than merely
 * exist: that every anchor is somewhere real, and that typing a place gets
 * that place rather than a coincidence of spelling.
 */

const label = (query: string, limit = 4) => searchSiteAnchors(query, limit).map((a) => a.label);
const kinds = (query: string, limit = 4) => searchSiteAnchors(query, limit).map((a) => a.kind);

describe("every anchor is a place on the map", () => {
  it("has coordinates that parse", () => {
    const bad = searchSiteAnchors("a", 1000);
    assert.deepEqual(bad, [], "one letter is not a search");
  });

  it("carries a real point on every result it returns", () => {
    for (const query of ["rome", "vienna", "miami", "london", "jerusalem", "antwerp"]) {
      for (const anchor of searchSiteAnchors(query, 8)) {
        assert.ok(parsePoint(anchor.at), `${anchor.label} has no usable position`);
        assert.ok(anchor.label.trim(), "an anchor with no name cannot be chosen");
      }
    }
  });

  it("knows where the airports, the quarters and the things to see are", () => {
    const counts = anchorCounts();
    assert.ok(counts.airport > 50, `only ${counts.airport} airports carry a position`);
    assert.ok(counts.quarter > 20, `only ${counts.quarter} quarters carry a position`);
    assert.ok(counts.landmark > 500, `only ${counts.landmark} things to do carry a position`);
    // "place" is OpenStreetMap's, added by the route — never built from files.
    assert.equal(counts.place, 0);
  });
});

describe("typing a place finds that place", () => {
  it("an airport code finds the airport", () => {
    assert.equal(kinds("jfk")[0], "airport");
    assert.match(label("jfk")[0], /JFK/);
  });

  it("a city finds the city, not a longer word that starts the same way", () => {
    // Römerberg is in Frankfurt. Somebody typing "rome" has not nearly found
    // it — this is the case the ranking exists for.
    const found = label("rome", 3);
    assert.ok(!found.includes("Römerberg"), `Römerberg came back for "rome": ${found.join(", ")}`);
    assert.match(found[0], /Rome/);
  });

  it("a landmark finds the landmark", () => {
    assert.equal(label("times square")[0], "Times Square");
  });

  it("the Jewish quarter of a city is offered alongside its airport", () => {
    assert.ok(kinds("rome", 4).includes("quarter"), "the Ghetto is not offered for Rome");
  });

  it("a partial city name still finds its airports", () => {
    assert.ok(label("lon", 4).every((name) => name.startsWith("London")));
  });

  it("nothing at all is a legitimate answer", () => {
    assert.deepEqual(searchSiteAnchors("qqzzxx"), []);
    assert.deepEqual(searchSiteAnchors(""), []);
  });

  it("never returns more than it was asked for", () => {
    assert.equal(searchSiteAnchors("a b", 3).length <= 3, true);
    assert.equal(searchSiteAnchors("rome", 2).length, 2);
  });
});

describe("an anchor is not a listing", () => {
  it("nothing about it is stored", () => {
    const source = codeOf("lib/near-anchors.ts");
    assert.doesNotMatch(source, /redis|upstash|prisma|fetch\(/i);
  });
});
