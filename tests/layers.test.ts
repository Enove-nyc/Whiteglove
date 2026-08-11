import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

// The map's markers used to paint over the sponsored banner and over the
// sticky header — Leaflet numbers its panes 200 to 1000 and, with nothing
// containing them, those numbers competed with the whole page. Two things
// keep that fixed, and both are easy to undo by accident.

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
    const rule = css.match(/\.leaflet-container\s*\{([^}]*)\}/);
    assert.ok(rule, ".leaflet-container rule is missing from globals.css");
    const body = rule![1];
    assert.match(body, /isolation:\s*isolate/, "the map must isolate its stacking context");
    assert.match(body, /z-index:\s*var\(--wg-z-map\)/, "the map must sit at the map layer");
    assert.match(body, /position:\s*relative/, "isolation only contains z-index on a positioned element");
    // Google draws into the same box; it needs the same containment so its
    // chrome cannot climb over the advertisement either.
    // [\s\S] rather than the `s` flag: tsconfig targets ES2017, where
    // dotAll does not exist, and `tsc --noEmit` refuses it (TS1501). The
    // suite still passed, because `npm test` runs through tsx and never
    // typechecks — so `npm run check` was the only thing that went red.
    assert.match(css, /\.wg-map-box\s*\{[\s\S]*?z-index:\s*var\(--wg-z-map\)/, "the public map box is boxed the same way");
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
