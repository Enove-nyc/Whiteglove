import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * The deprecated marker, replaced — without the map ever losing its pins.
 *
 * google.maps.Marker has been deprecated since February 2024 and warns in the
 * console on every page carrying a map. Its replacement, AdvancedMarkerElement,
 * needs two things that are not always true: a Map ID on the map, and the
 * marker library on the bootstrap.
 *
 * THE FAILURE MODE IS THE WHOLE REASON THIS FILE EXISTS. If either is missing,
 * an Advanced Marker does not degrade to something smaller or plainer — it
 * renders NOTHING, and the map loses every pin on it. A map with no pins is a
 * worse outcome than a console warning by a wide margin, so the old class stays
 * as the fallback and the condition is checked rather than assumed.
 */

const LOADER = readFileSync("lib/google-maps-loader.ts", "utf8");
const MAP = readFileSync("components/AreaMap.tsx", "utf8");

describe("the marker library and the Map ID", () => {
  it("asks for the marker library with the bootstrap", () => {
    assert.match(LOADER, /libraries=marker/);
    // Still the async loading path — a callback can fire before Map exists.
    assert.match(LOADER, /loading=async/);
  });

  it("reads the Map ID from a public variable", () => {
    // A Map ID names a style, not an account; it is public by design and has
    // to be inlined into the browser bundle to be used at all.
    assert.match(LOADER, /export function googleMapsMapId\(\)/);
    assert.match(LOADER, /NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID/);
    // Through the same cleaner as the key: a value pasted with an invisible
    // character would otherwise be percent-encoded into the map options.
    assert.match(LOADER, /return cleanKey\(process\.env\.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID\)/);
  });

  it("passes it to the map only when there is one", () => {
    assert.match(MAP, /\.\.\.\(MAP_ID \? \{ mapId: MAP_ID \} : \{\}\)/);
  });
});

describe("the fallback, which is the point", () => {
  it("uses the Advanced marker only when BOTH halves are present", () => {
    // The Map ID and the library. Either one missing means no pins at all.
    assert.match(MAP, /const Advanced = MAP_ID \? maps\.marker\?\.AdvancedMarkerElement : undefined/);
  });

  it("still draws the deprecated marker when they are not", () => {
    assert.match(MAP, /const drawLegacy = \(item: MapMarker\) => \{/, "there is no fallback marker any more");
    assert.match(MAP.slice(MAP.indexOf("const drawLegacy")), /new maps\.Marker\(/);
    assert.match(MAP, /Advanced \? drawAdvanced\(item\) : drawLegacy\(item\)/);
  });

  it("DRAWS THEM AGAIN THE OLD WAY IF THE ID ITSELF IS REFUSED", () => {
    /**
     * The two checks above are answerable from this side — a variable is set
     * or it is not, a library loaded or it did not. Whether Google ACCEPTS the
     * ID is not: it can be deleted, renamed, restricted to another referrer,
     * or briefly unavailable, and that answer comes back as a console error
     * rather than as anything the code is handed. On the page it looks like a
     * map with no pins on it.
     *
     * So the pins are looked for a frame later. Every Advanced marker renders
     * a <gmp-advanced-marker> element inside the map; none of them there means
     * the ID did not work, and the set is drawn again with the deprecated
     * marker, which has never needed a Map ID.
     */
    const block = MAP.slice(MAP.indexOf("if (Advanced && visible.length > 0)"));
    assert.ok(block, "the runtime check for a refused Map ID is gone");
    assert.match(block.slice(0, 600), /querySelector\("gmp-advanced-marker"\)/);
    assert.match(block.slice(0, 600), /gmarkersRef\.current = visible\.map\(drawLegacy\)/);
    // And the pins that did not draw are taken off first, or the second set
    // lands on top of a set of invisible ones.
    assert.match(block.slice(0, 600), /detachMarker\(marker\)/);
  });

  it("keeps the icon geometry the same either way", () => {
    // markPinFor sizes both. The old marker anchored at 97% of its height; an
    // Advanced marker anchors its content by the bottom centre, which is what
    // that was approximating.
    const block = MAP.slice(MAP.indexOf("const Advanced ="));
    assert.match(block, /img\.width = pin\.width/);
    assert.match(block, /img\.height = pin\.height/);
    assert.match(block, /scaledSize: new maps\.Size\(pin\.width, pin\.height\)/);
  });
});

describe("a pin still does what a pin did", () => {
  it("is clickable, which an Advanced marker is not by default", () => {
    // Without gmpClickable the element is inert and the info window never
    // opens. The old marker was clickable with no opt-in.
    assert.match(MAP, /gmpClickable: true/);
  });

  it("listens for both the new event name and the old one", () => {
    // "gmp-click" is documented; "click" still fires on current builds.
    const block = MAP.slice(MAP.indexOf("const Advanced ="));
    assert.match(block, /addListener\("gmp-click"/);
    assert.match(block, /addListener\("click"/);
  });

  it("opens the same info window from one place", () => {
    // So the two marker kinds cannot drift apart in what a click does.
    assert.match(MAP, /const openFor = \(item: MapMarker, marker: GAnyMarker\) =>/);
    assert.equal(MAP.match(/ginfoRef\.current\?\.open\(/g)?.length, 1);
  });

  it("still carries the name, for a screen reader and a hover", () => {
    const block = MAP.slice(MAP.indexOf("const Advanced ="));
    assert.match(block, /title: item\.name/);
    // The image inside is decoration — the marker's own title is the name.
    assert.match(block, /img\.alt = ""/);
  });
});

describe("taking a pin off the map", () => {
  it("does NOT call setMap on an Advanced marker, which has no such method", () => {
    /**
     * THIS IS THE BUG THE TYPE WAS WRITTEN TO STOP. The advanced marker was
     * first typed as the old one with two fields added, which made
     * `marker.setMap(null)` compile — and AdvancedMarkerElement has no setMap.
     * It is removed with `marker.map = null`. Every redraw begins by clearing
     * the previous pins, so the wrong call would throw inside a teardown and
     * take the rest of the redraw down with it: the map would keep the pins it
     * had and never draw the ones asked for.
     *
     * The types are separate now, so a bare setMap on a list holding both no
     * longer compiles, and one helper knows which method each kind has.
     */
    assert.match(LOADER, /export function detachMarker\(marker: GAnyMarker\)/);
    assert.match(LOADER, /if \("setMap" in marker\) marker\.setMap\(null\);/);
    assert.match(LOADER, /else marker\.map = null;/);
    assert.doesNotMatch(LOADER, /export type GAdvancedMarker = GMarker/, "the advanced marker is typed as having setMap again");
  });

  it("is the only way AreaMap removes one", () => {
    const source = MAP.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.doesNotMatch(source, /marker\.setMap\(null\)/, "a marker is taken off the map without asking which kind it is");
    assert.ok((source.match(/detachMarker\(marker\)/g) ?? []).length >= 4);
  });
});
