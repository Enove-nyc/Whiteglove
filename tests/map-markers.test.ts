import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AIRPORT_MINIMUM_RADIUS_KM, areaLabel, boundsOf, countByKind, kmBetween, pointFrom, withinArea, type MapMarker } from "@/lib/map-markers";
import { compassFor, GLOVE_PIN_INTRINSIC, glovePinSrc, MAP_STYLE, TOGGLEABLE_KINDS } from "@/lib/map-icons";

const KRAKOW = { lat: 50.0619, lng: 19.9369 };

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
  it("serves a public PNG per kind for the map markers", () => {
    // Legend chips paint the same MAP_STYLE colours onto the bare mark; the
    // map keeps the disc PNG for contrast on dark tiles.
    const pin = compassFor("kever");
    assert.equal(pin.url, glovePinSrc("kever"));
    assert.equal(pin.url, "/map-pins/kever.png");
  });

  it("anchors at the cuff, not the centre of the disc", () => {
    const pin = compassFor("stay", 11);
    assert.ok(pin.anchorY > pin.height * 0.8, "the tip that touches the map is near the bottom");
    assert.equal(pin.anchorX, pin.width / 2);
  });

  it("keeps the baked pin's proportions when it scales with zoom", () => {
    const pin = compassFor("kever", 11);
    const ratio = pin.width / pin.height;
    const intrinsic = GLOVE_PIN_INTRINSIC.width / GLOVE_PIN_INTRINSIC.height;
    assert.ok(Math.abs(ratio - intrinsic) < 0.02);
    const far = compassFor("kever", 4);
    assert.ok(far.height < pin.height, "continent zoom shrinks the pins so they do not become texture");
  });

  it("tells kinds apart by the mark colour carried on each pin", () => {
    // Kind identity is the tint of the hand+compass artwork itself (baked into
    // /map-pins/{kind}.png), not a coloured ring around a shared gold mark.
    const colours = new Set(Object.values(MAP_STYLE).map((s) => s.color));
    assert.equal(colours.size, Object.keys(MAP_STYLE).length, "two kinds sharing a colour would be unreadable");
    for (const kind of Object.keys(MAP_STYLE) as (keyof typeof MAP_STYLE)[]) {
      const pin = compassFor(kind);
      assert.ok(MAP_STYLE[kind].label.trim().length > 0);
      assert.equal(pin.color, MAP_STYLE[kind].color);
      assert.equal(pin.url, `/map-pins/${kind}.png`);
      assert.equal(glovePinSrc(kind), pin.url);
    }
  });

  it("offers every kind but the searched-for place as a filter", () => {
    assert.ok(!TOGGLEABLE_KINDS.includes("center"), "hiding what you searched for is not a useful control");
    assert.equal(TOGGLEABLE_KINDS.length, Object.keys(MAP_STYLE).length - 1);
  });
});
