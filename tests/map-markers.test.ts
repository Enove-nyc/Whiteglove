import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { AIRPORT_MINIMUM_RADIUS_KM, areaLabel, boundsOf, countByKind, kmBetween, pointFrom, withinArea, type MapMarker } from "@/lib/map-markers";
import { GLOVE_MARK_INTRINSIC, GLOVE_MARK_SRC, markPinFor, MAP_STYLE, TOGGLEABLE_KINDS } from "@/lib/map-icons";

const KRAKOW = { lat: 50.0619, lng: 19.9369 };

function channels(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance, the WCAG one: how light a colour reads. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Hue in degrees — which colour it is, apart from how dark it is. */
function hue(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const span = max - min;
  const raw = max === r ? (g - b) / span : max === g ? 2 + (b - r) / span : 4 + (r - g) / span;
  return ((raw * 60) + 360) % 360;
}

function marker(over: Partial<MapMarker> & Pick<MapMarker, "id" | "kind">): MapMarker {
  return { name: over.id, lat: KRAKOW.lat, lng: KRAKOW.lng, ...over };
}

describe("what falls inside a search area", () => {
  it("shows everything when nothing has been searched", () => {
    // The map used to open on Kraków at 50 km, so somebody who did not know to
    // type a town saw one corner of Poland and concluded that was all there was.
    const all = [marker({ id: "a", kind: "kever" }), marker({ id: "b", kind: "stay", lat: 41.9, lng: 12.5 })];
    assert.equal(withinArea(all, null, 50).length, 2);
  });

  it("measures nothing when there is nothing to measure from", () => {
    const [first] = withinArea([marker({ id: "a", kind: "kever" })], null, 50);
    assert.equal(first.km, undefined, "a distance with no origin would be a made-up number");
  });

  it("drops what is beyond the radius and stamps the distance on what is not", () => {
    const all = [
      marker({ id: "near", kind: "kever", lat: 50.1, lng: 19.9 }),
      marker({ id: "far", kind: "kever", lat: 41.9, lng: 12.5 }),
    ];
    const inside = withinArea(all, KRAKOW, 50);
    assert.deepEqual(inside.map((m) => m.id), ["near"]);
    assert.ok((inside[0].km ?? 99) < 50);
  });

  it("keeps an airport further out than everything else", () => {
    // You will fly into one two hours away and drive; you will not detour two
    // hours for a restaurant.
    const rome = { lat: 41.9, lng: 12.5 };
    const hundredish = { lat: 50.9, lng: 19.9 };
    const all = [
      marker({ id: "airport-near-ish", kind: "airport", ...hundredish }),
      marker({ id: "kever-near-ish", kind: "kever", ...hundredish }),
      marker({ id: "airport-far", kind: "airport", ...rome }),
    ];
    const inside = withinArea(all, KRAKOW, 25).map((m) => m.id);
    assert.ok(inside.includes("airport-near-ish"), "an airport within the wider net stays");
    assert.ok(!inside.includes("kever-near-ish"), "everything else obeys the chosen radius");
    assert.ok(!inside.includes("airport-far"), "the wider net is still a net");
    assert.ok(kmBetween(KRAKOW, hundredish) < AIRPORT_MINIMUM_RADIUS_KM);
  });

  it("uses the chosen radius for airports once it is the wider of the two", () => {
    const far = { lat: 51.5, lng: 19.9 };
    const all = [marker({ id: "airport", kind: "airport", ...far })];
    assert.equal(withinArea(all, KRAKOW, 200).length, 1);
    assert.ok(kmBetween(KRAKOW, far) > AIRPORT_MINIMUM_RADIUS_KM);
  });
});

describe("how many there are", () => {
  it("counts every kind, including the ones with none", () => {
    const counts = countByKind([
      marker({ id: "a", kind: "kever" }),
      marker({ id: "b", kind: "kever" }),
      marker({ id: "c", kind: "attraction" }),
    ]);
    assert.equal(counts.kever, 2);
    assert.equal(counts.attraction, 1);
    assert.equal(counts.stay, 0, "a missing kind is zero, not absent");
    assert.equal(counts.kosher, 0);
  });
});

describe("framing the map when nothing has been searched", () => {
  it("holds every marker inside the box", () => {
    const all = [
      marker({ id: "rome", kind: "stay", lat: 41.9, lng: 12.5 }),
      marker({ id: "krakow", kind: "kever", lat: 50.06, lng: 19.94 }),
      marker({ id: "london", kind: "airport", lat: 51.5, lng: -0.12 }),
    ];
    const box = boundsOf(all)!;
    for (const m of all) {
      assert.ok(m.lat <= box.north && m.lat >= box.south, `${m.id} latitude inside`);
      assert.ok(m.lng <= box.east && m.lng >= box.west, `${m.id} longitude inside`);
    }
  });

  it("gives a single marker a box with some size to it", () => {
    // A zero-height box makes a map zoom to the maximum and show one street.
    const box = boundsOf([marker({ id: "only", kind: "kever" })])!;
    assert.ok(box.north - box.south >= 0.5);
    assert.ok(box.east - box.west >= 0.5);
  });

  it("has nothing to frame when there is nothing", () => {
    assert.equal(boundsOf([]), null);
  });

  it("stays on the earth", () => {
    const box = boundsOf([marker({ id: "pole", kind: "kever", lat: 89.99, lng: 179.99 })])!;
    assert.ok(box.north <= 90);
    assert.ok(box.east <= 180);
  });
});

describe("reading a coordinate", () => {
  it("refuses the placeholders the data actually uses", () => {
    // These are real values in data/cemeteries.ts for graves nobody has checked.
    for (const value of ["pending", "To be added", "", undefined, "unknown"]) {
      assert.equal(pointFrom(value), null, `${JSON.stringify(value)} is not a place`);
    }
  });

  it("still reads degrees, minutes and seconds", () => {
    // The site's own parser handles both, and this must not quietly lose it.
    const point = pointFrom("50°3'42.8\"N 19°56'12.9\"E");
    assert.ok(point, "DMS should parse");
    assert.ok(Math.abs(point!.lat - 50.06) < 0.02);
    assert.ok(Math.abs(point!.lng - 19.94) < 0.02);
  });

  it("refuses a point off the earth, and the null island", () => {
    assert.equal(pointFrom("120.0, 19.0"), null);
    assert.equal(pointFrom("0, 0"), null, "what a half-filled record parses to is not a place");
  });

  it("reads an ordinary decimal pair", () => {
    assert.deepEqual(pointFrom("50.0619, 19.9369"), KRAKOW);
  });
});

describe("saying where you are looking", () => {
  it("names the search, or says everywhere", () => {
    assert.equal(areaLabel("Kraków", 50), "within 50 km of Kraków");
    assert.equal(areaLabel(null, 50), "everywhere");
  });
});

describe("the glove marker", () => {
  it("draws every marker from the one piece of artwork, on no disc", () => {
    // The owner asked for the legend's treatment on the map: the line art
    // tinted in the kind's colour, no cream circle behind it. The pre-tinted
    // pins that carried that circle are gone, and so is their colour table.
    const pin = markPinFor("airport", 11);
    assert.equal(pin.url, GLOVE_MARK_SRC);
    assert.equal(pin.url, "/map-glove-pin.png");
    for (const file of ["../lib/map-icons.ts", "../lib/tinted-mark.ts", "../components/AreaMap.tsx", "../components/CompassMark.tsx", "../app/globals.css"]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      assert.ok(!source.includes("/map-pins/"), `${file} still reaches for a baked pin`);
    }
  });

  it("anchors at the cuff, and keeps the artwork's proportions at every zoom", () => {
    for (const zoom of [4, 7, 11]) {
      const pin = markPinFor("stay", zoom);
      assert.equal(pin.anchorX, pin.width / 2, "the cuff is centred across the icon");
      assert.ok(pin.anchorY > pin.height * 0.9, "the coordinate sits at the tip of the cuff");
      assert.ok(pin.anchorY <= pin.height, "and not below the artwork");
      const ratio = pin.width / pin.height;
      const intrinsic = GLOVE_MARK_INTRINSIC.width / GLOVE_MARK_INTRINSIC.height;
      assert.ok(Math.abs(ratio - intrinsic) < 0.03, "a stretched glove is a different mark");
    }
    assert.ok(markPinFor("kever", 4).height < markPinFor("kever", 11).height, "continent zoom shrinks the pins so they do not become texture");
  });

  it("colours map and legend from one place", () => {
    // A second colour table is how the chips and the pins would come apart.
    for (const kind of TOGGLEABLE_KINDS) {
      assert.equal(markPinFor(kind).color, MAP_STYLE[kind].color);
      assert.equal(markPinFor(kind).url, markPinFor("center").url, "one piece of artwork for every kind");
    }
    const chip = readFileSync(new URL("../components/CompassMark.tsx", import.meta.url), "utf8");
    assert.match(chip, /MAP_STYLE\[kind\]\.color/, "the legend swatch reads the shared table, so it darkens with the pins");
  });

  it("keeps the kinds deep enough to mark a place on light terrain", () => {
    // Pale line art has no fill to carry the colour, so it washed out over
    // sunlit map tiles and stopped saying where anything was.
    for (const [kind, style] of Object.entries(MAP_STYLE)) {
      assert.ok(luminance(style.color) < 0.12, `${kind} at ${style.color} is too light to read over terrain`);
    }
  });

  it("keeps the kinds far enough apart to tell one from another", () => {
    const hues = Object.entries(MAP_STYLE).map(([kind, style]) => ({ kind, hue: hue(style.color) }));
    for (const a of hues) {
      for (const b of hues) {
        if (a.kind === b.kind) continue;
        const apart = Math.min(Math.abs(a.hue - b.hue), 360 - Math.abs(a.hue - b.hue));
        assert.ok(apart >= 20, `${a.kind} and ${b.kind} are ${apart.toFixed(0)}° apart, which is one colour at pin size`);
      }
    }
  });

  it("hands Google the same mark tinted, rather than a second set of pins", () => {
    // Google's marker icon is a URL, so it cannot mask the artwork in CSS. It
    // gets the same artwork painted in the same colour instead.
    const tint = readFileSync(new URL("../lib/tinted-mark.ts", import.meta.url), "utf8");
    assert.match(tint, /GLOVE_MARK_SRC/, "the tint starts from the shared artwork");
    assert.match(tint, /source-in/, "keeping the alpha is what makes it a tint and not a box");
    const map = readFileSync(new URL("../components/AreaMap.tsx", import.meta.url), "utf8");
    assert.match(map, /tintedMarkUrl\(MAP_STYLE\[kind\]\.color\)/, "Google's icons come from the shared colour table");
  });

  it("masks the legend chip and the map marker through the same rule", () => {
    // The chip and the marker are different elements in different renderers;
    // they share the mask so neither can be restyled without the other.
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const rule = css.match(/\.wg-glove-mark\s*\{([^}]*)\}/);
    assert.ok(rule, ".wg-glove-mark is missing from globals.css");
    assert.match(rule![1], /mask-image:\s*url\(\/map-glove-pin\.png\)/);
    assert.match(rule![1], /-webkit-mask-image:\s*url\(\/map-glove-pin\.png\)/);
    assert.match(rule![1], /mask-size:\s*contain/);
    assert.match(rule![1], /mask-repeat:\s*no-repeat/);
    assert.match(rule![1], /mask-position:\s*center/);

    const chip = readFileSync(new URL("../components/CompassMark.tsx", import.meta.url), "utf8");
    assert.match(chip, /wg-glove-mark/, "the legend chip masks the shared artwork");
    const map = readFileSync(new URL("../components/AreaMap.tsx", import.meta.url), "utf8");
    assert.match(map, /wg-glove-mark/, "the map marker masks the same artwork");
    assert.match(map, /divIcon/, "an <img> marker cannot be tinted");

    // Bare line art on pale tiles, and a ring for whoever is on a keyboard.
    assert.match(css, /\.wg-map-pin\s*\{[\s\S]*?drop-shadow/, "the marker needs an edge now the disc is gone");
    assert.match(css, /\.wg-map-pin:focus-visible\s*\{[\s\S]*?outline:/, "Leaflet markers are tabbable");
  });

  it("tells kinds apart by the mark colour carried on each pin", () => {
    // Kind identity is the tint of the hand+compass artwork itself, not a
    // coloured ring around a shared gold mark.
    const colours = new Set(Object.values(MAP_STYLE).map((s) => s.color));
    assert.equal(colours.size, Object.keys(MAP_STYLE).length, "two kinds sharing a colour would be unreadable");
    for (const kind of Object.keys(MAP_STYLE) as (keyof typeof MAP_STYLE)[]) {
      const pin = markPinFor(kind);
      assert.ok(MAP_STYLE[kind].label.trim().length > 0);
      assert.equal(pin.color, MAP_STYLE[kind].color);
    }
  });

  it("offers every kind but the searched-for place as a filter", () => {
    assert.ok(!TOGGLEABLE_KINDS.includes("center"), "hiding what you searched for is not a useful control");
    assert.equal(TOGGLEABLE_KINDS.length, Object.keys(MAP_STYLE).length - 1);
  });
});
