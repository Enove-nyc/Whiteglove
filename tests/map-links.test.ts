import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAP_KINDS, mapHref, readMapView, WHOLE_MAP } from "@/lib/map-links";
import { codeOf } from "./helpers/source";

describe("a link into the map", () => {
  it("is just the map when it asks for nothing", () => {
    assert.equal(mapHref({}), "/map");
  });

  it("carries a place, a name and a radius", () => {
    const href = mapHref({ at: "50.0647, 19.9450", name: "Kraków", radius: 25 });
    assert.match(href, /^\/map\?/);
    const view = readMapView(Object.fromEntries(new URL(`https://x${href}`).searchParams));
    assert.equal(view.name, "Kraków");
    assert.equal(view.radius, 25);
    assert.ok(view.center);
    assert.ok(Math.abs((view.center?.lat ?? 0) - 50.0647) < 0.001);
  });

  it("says nothing about kinds when it wants all of them", () => {
    assert.doesNotMatch(mapHref({ at: "50, 20", kinds: [...MAP_KINDS] }), /kinds=/);
    assert.match(mapHref({ at: "50, 20", kinds: ["shul"] }), /kinds=shul/);
  });

  it("refuses a radius the map does not offer, rather than inventing a zoom", () => {
    assert.doesNotMatch(mapHref({ at: "50, 20", radius: 7 }), /km=/);
  });

  it("drops a coordinate that is not one", () => {
    assert.equal(mapHref({ at: "pending", name: "Somewhere" }), "/map?name=Somewhere");
    assert.equal(mapHref({ at: "0, 0" }), "/map");
  });
});

describe("reading a link back", () => {
  it("opens on everything when the URL says nothing", () => {
    assert.deepEqual(readMapView({}), WHOLE_MAP);
  });

  it("keeps a name only when there is a place to name", () => {
    // A name with no point would label the whole world after one town.
    assert.equal(readMapView({ name: "Kraków" }).name, null);
    assert.equal(readMapView({ at: "50, 20", name: "Kraków" }).name, "Kraków");
  });

  it("ignores a kind it does not plot", () => {
    assert.deepEqual(readMapView({ kinds: "shul,restaurant" }).kinds, ["shul"]);
  });

  it("treats a filter that leaves nothing as no filter", () => {
    // A mangled link should open the map, not an empty one.
    assert.deepEqual(readMapView({ kinds: "restaurant" }).kinds, [...MAP_KINDS]);
    assert.deepEqual(readMapView({ kinds: "" }).kinds, [...MAP_KINDS]);
  });

  it("falls back to the default radius rather than an unknown one", () => {
    assert.equal(readMapView({ km: "3" }).radius, WHOLE_MAP.radius);
    assert.equal(readMapView({ km: "banana" }).radius, WHOLE_MAP.radius);
    assert.equal(readMapView({ km: "100" }).radius, 100);
  });
});

describe("the map's own controls", () => {
  it("cannot be left with nothing switched on", () => {
    const source = codeOf("components/MapExplorer.tsx");
    assert.match(source, /next\.length === 0 \? current : next/);
  });

  it("reads the URL once, as the initial state", () => {
    // Kept in step with the address bar, a search would fight Back for
    // authority and lose a filter every time.
    const source = codeOf("components/MapExplorer.tsx");
    assert.match(source, /useState\(\(\) =>\s*\n?\s*readMapView\(/);
  });

  it("is behind a Suspense boundary, so the page stays prerendered", () => {
    assert.match(codeOf("app/map/page.tsx"), /<Suspense[\s\S]{0,200}<MapExplorer/);
  });
});
