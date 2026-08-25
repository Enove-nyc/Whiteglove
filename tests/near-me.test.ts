import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  distanceLabel,
  metresBetween,
  nearest,
  parsePoint,
  walkingLabel,
  walkingNote,
  type Coordinates,
} from "@/data/near-me";

const ROME_HOTEL = parsePoint("41.8955, 12.4823")!;
const ROME_GHETTO = parsePoint("41.8921, 12.4780")!;

describe("reading a pair of coordinates", () => {
  it("reads the format the listings actually use", () => {
    assert.deepEqual(parsePoint("41.8921, 12.4780"), { latitude: 41.8921, longitude: 12.478 });
    assert.deepEqual(parsePoint("50.0497,19.9445"), { latitude: 50.0497, longitude: 19.9445 });
    assert.deepEqual(parsePoint("-33.9, 151.2"), { latitude: -33.9, longitude: 151.2 });
  });

  it("refuses anything that is not a position", () => {
    for (const bad of ["", null, undefined, "nonsense", "1", "1,2,3", "abc,def"]) {
      assert.equal(parsePoint(bad), null, `${JSON.stringify(bad)} should not parse`);
    }
  });

  it("refuses an impossible one rather than plotting it", () => {
    assert.equal(parsePoint("91, 0"), null);
    assert.equal(parsePoint("0, 181"), null);
  });

  it("treats 0,0 as empty, because that is what two blank fields parse to", () => {
    // Null Island is in the Atlantic and no listing on this site is there.
    assert.equal(parsePoint("0,0"), null);
  });
});

describe("how far apart two places are", () => {
  it("gets a short city distance right", () => {
    // Piazza Venezia to the Ghetto is a little over half a kilometre.
    const metres = metresBetween(ROME_HOTEL, ROME_GHETTO);
    assert.ok(metres > 450 && metres < 600, `${Math.round(metres)}m is not the real distance`);
  });

  it("is zero for the same point, and symmetric", () => {
    assert.equal(Math.round(metresBetween(ROME_HOTEL, ROME_HOTEL)), 0);
    assert.equal(
      Math.round(metresBetween(ROME_HOTEL, ROME_GHETTO)),
      Math.round(metresBetween(ROME_GHETTO, ROME_HOTEL)),
    );
  });

  it("handles a long one — London to Jerusalem", () => {
    const london: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
    const jerusalem: Coordinates = { latitude: 31.7683, longitude: 35.2137 };
    const km = metresBetween(london, jerusalem) / 1000;
    assert.ok(km > 3500 && km < 3700, `${Math.round(km)}km is wrong`);
  });
});

describe("saying a distance the way somebody reads one", () => {
  it("rounds metres, rather than pretending to the metre", () => {
    assert.equal(distanceLabel(412), "400 m");
    assert.equal(distanceLabel(437), "450 m");
  });

  it("switches to kilometres, with a decimal only while it helps", () => {
    assert.equal(distanceLabel(1200), "1.2 km");
    assert.equal(distanceLabel(24_000), "24 km");
  });
});

describe("a walking time is an estimate, and behaves like one", () => {
  it("gives a time for a walkable distance", () => {
    assert.equal(walkingLabel(400), "About 6 minutes' walk");
    assert.equal(walkingLabel(50), "A minute's walk");
  });

  it("allows for streets not being straight lines", () => {
    // 1km straight line is more than 12.5 minutes at 80 m/min, because the
    // walk is longer than the crow flies — and under-stating it is the
    // direction that matters before Shabbos.
    const minutes = Number(/(\d+)/.exec(walkingLabel(1000)!)![1]);
    assert.ok(minutes > 12, `${minutes} min under-states a 1km walk`);
  });

  it("stops offering a time once nobody would walk it", () => {
    assert.equal(walkingLabel(6000), null);
    assert.equal(walkingNote(6000), null);
  });

  it("warns before Shabbos once the estimate is loose enough to matter", () => {
    assert.equal(walkingNote(400), null);
    assert.match(walkingNote(2500) ?? "", /allow more than this before Shabbos/);
  });
});

describe("finding the nearest of something", () => {
  const places = [
    { name: "Far", coordinates: "41.9500, 12.4800" },
    { name: "Near", coordinates: "41.8921, 12.4780" },
    { name: "Nowhere", coordinates: null },
    { name: "Middle", coordinates: "41.9100, 12.4800" },
  ];
  const find = (within: number, limit = 10) =>
    nearest(ROME_HOTEL, places, { coordinatesOf: (p) => p.coordinates, within, limit });

  it("returns them closest first", () => {
    assert.deepEqual(find(20_000).map((r) => r.item.name), ["Near", "Middle", "Far"]);
  });

  it("skips anything with no position — unknown is not 'far away'", () => {
    assert.ok(!find(20_000).some((r) => r.item.name === "Nowhere"));
  });

  it("drops anything past the range asked for", () => {
    assert.deepEqual(find(1000).map((r) => r.item.name), ["Near"]);
  });

  it("respects the limit", () => {
    assert.equal(find(20_000, 2).length, 2);
  });

  it("carries the distance and the walk with each one", () => {
    const [closest] = find(20_000);
    assert.match(closest.distance, /^\d+ m$/);
    assert.match(closest.walk ?? "", /walk/);
  });

  it("finds nothing, rather than failing, when there is nothing", () => {
    assert.deepEqual(nearest(ROME_HOTEL, [], { coordinatesOf: () => null, within: 5000, limit: 5 }), []);
  });
});
