import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

// Map controls must stay inside the map's stacking context rather than painting
// over the sponsored banner or sticky header.

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function layer(name: string): number {
  const match = css.match(new RegExp(`--wg-z-${name}:\\s*(\\d+)`));
  assert.ok(match, `--wg-z-${name} is missing from globals.css`);
  return Number(match![1]);
}

describe("what is in front of what", () => {
  it("keeps the map boxed into its own stacking context", () => {
    // Without all three of these, Leaflet's 600-deep marker pane is loose in
    // the page again and the balls go back over the advertisement.
    const leafletRule = css.match(/\.leaflet-container\s*\{([^}]*)\}/);
    assert.ok(leafletRule, ".leaflet-container rule is missing from globals.css");
    const leafletBody = leafletRule![1];
    assert.match(leafletBody, /isolation:\s*isolate/, "the map must isolate its stacking context");
    assert.match(leafletBody, /z-index:\s*var\(--wg-z-map\)/, "the map must sit at the map layer");
    assert.match(leafletBody, /position:\s*relative/, "isolation only contains z-index on a positioned element");

    const boxRule = css.match(/\.wg-map-box\s*\{([^}]*)\}/);
    assert.ok(boxRule, ".wg-map-box rule is missing from globals.css");
    assert.match(boxRule![1], /isolation:\s*isolate/);
    assert.match(css, /@import "leaflet\/dist\/leaflet\.css"/);
  });

  it("puts the advertisement in front of the page and the header", () => {
    assert.ok(layer("map") < layer("header"), "the header must cover the map");
    assert.ok(layer("ad") > layer("header"), "an advertisement must not be covered by the header");
    assert.ok(layer("ad") > layer("map"), "an advertisement must not be covered by the map");
  });

  it("keeps a dialog above the advertisement", () => {
    // The sponsored popup is itself a dialog, so sponsored content still
    // reaches the very top when it wants to — but a banner must never cover a
    // dialog somebody is filling in.
    assert.ok(layer("modal") > layer("ad"));
  });

  it("uses the named layers rather than loose numbers", () => {
    for (const file of ["../components/Navbar.tsx", "../components/SitePromotions.tsx", "../components/BookPartners.tsx", "../components/PromotionBanner.tsx"]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      // z-40 / z-50 / z-[60] on a fixed or sticky layer is how this drifted
      // apart in the first place: each one picked a number by looking at
      // whatever it happened to lose to.
      const loose = source.match(/(?:fixed|sticky)[^"'`]*\bz-(?:\[\d+\]|[3-9]\d)\b/g);
      assert.deepEqual(loose, null, `${file} sets a bare z-index on a fixed/sticky layer: ${loose?.join(", ")}`);
    }
  });
});
