import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AIRPORTS, METRO_AREAS } from "@/data/airports";
import {
  type AddedAirport,
  airportProblem,
  airportsIn,
  describeMetro,
  isBuiltInAirport,
  mergeAirports,
  mergeMetros,
  metroProblem,
} from "@/lib/airport-admin";

/**
 * Airports and city groups the owner adds himself.
 *
 * The rule underneath: what he adds sits ON TOP of the built-in list and never
 * inside it. A merge that lost a built-in airport, or offered the same one
 * twice, would be worse than not being able to add any.
 */

const airport = (over: Partial<AddedAirport> = {}): AddedAirport => ({
  code: "RZE",
  name: "Rzeszów — Jasionka",
  city: "Rzeszów",
  country: "Poland",
  lat: 50.11,
  lng: 22.02,
  aliases: ["lizhensk"],
  ...over,
});

describe("merging what the owner added", () => {
  it("keeps every built-in airport", () => {
    // The one thing that must never happen. A merge that dropped one would
    // take a hundred airports off the site to add one.
    assert.equal(mergeAirports([]).length, AIRPORTS.length);
    assert.ok(mergeAirports([airport({ code: "ZZZ" })]).some((a) => a.code === "JFK"));
  });

  it("adds a new one", () => {
    const merged = mergeAirports([airport({ code: "ZZZ", name: "Somewhere New" })]);
    assert.equal(merged.length, AIRPORTS.length + 1);
    assert.equal(merged.find((a) => a.code === "ZZZ")?.name, "Somewhere New");
  });

  it("REPLACES a built-in rather than showing it twice", () => {
    // How a wrong coordinate or a missing alias is corrected without editing
    // the file. Two entries for JFK would leave the traveller guessing.
    const merged = mergeAirports([airport({ code: "JFK", name: "Kennedy", city: "New York", country: "USA", lat: 40.64, lng: -73.78, aliases: ["nyc"] })]);
    assert.equal(merged.filter((a) => a.code === "JFK").length, 1);
    assert.equal(merged.find((a) => a.code === "JFK")?.name, "Kennedy");
    assert.equal(merged.length, AIRPORTS.length);
  });

  it("keeps what the correction did not mention", () => {
    // Fixing one coordinate must not blank the aliases somebody typed in.
    const before = AIRPORTS.find((a) => a.code === "KRK");
    const merged = mergeAirports([{ code: "KRK", name: "", city: "", country: "", lat: 50.08, lng: 19.79, aliases: [] }]);
    const after = merged.find((a) => a.code === "KRK");
    assert.equal(after?.name, before?.name);
    assert.deepEqual(after?.aliases, before?.aliases);
    assert.equal(after?.lat, 50.08);
  });

  it("takes the code as written, whatever case it came in", () => {
    assert.ok(mergeAirports([airport({ code: " zzz " })]).some((a) => a.code === "ZZZ"));
  });

  it("ignores an entry with no code at all", () => {
    assert.equal(mergeAirports([airport({ code: "  " })]).length, AIRPORTS.length);
  });
});

describe("city groups", () => {
  it("keeps the built-in ones", () => {
    assert.ok(Object.keys(mergeMetros([])).includes("NYC"));
    assert.equal(Object.keys(mergeMetros([])).length, Object.keys(METRO_AREAS).length);
  });

  it("adds a new one", () => {
    const all = mergeMetros([{ code: "KRW", label: "Kraków and Rzeszów", country: "Poland" }]);
    assert.equal(all.KRW.label, "Kraków and Rzeszów");
  });

  it("lists what is actually in a group after the merge", () => {
    const merged = mergeAirports([
      airport({ code: "AAA", cityCode: "ZZZ" }),
      airport({ code: "BBB", cityCode: "ZZZ" }),
    ]);
    assert.deepEqual(airportsIn("ZZZ", merged), ["AAA", "BBB"]);
    assert.deepEqual(airportsIn("zzz", merged), ["AAA", "BBB"], "case does not matter");
  });

  it("says what a group searches, by name", () => {
    // "JFK, EWR and LGA" tells somebody whether the group is right.
    // "3 airports" does not.
    const merged = mergeAirports([airport({ code: "AAA", cityCode: "ZZZ" }), airport({ code: "BBB", cityCode: "ZZZ" })]);
    assert.equal(describeMetro("ZZZ", merged), "Searches AAA and BBB together.");
    assert.match(describeMetro("QQQ", merged), /Nothing is in this group yet/);
  });

  it("warns when a group holds one airport, because it will not be offered", () => {
    const merged = mergeAirports([airport({ code: "AAA", cityCode: "ZZZ" })]);
    assert.match(describeMetro("ZZZ", merged), /a group needs two/);
  });
});

describe("what cannot be saved", () => {
  it("takes a complete airport", () => {
    assert.equal(airportProblem(airport()), null);
  });

  it("needs a three-letter code", () => {
    for (const code of ["", "RZ", "RZEE", "12A"]) {
      assert.match(String(airportProblem(airport({ code }))), /three letters/, code);
    }
  });

  it("needs a coordinate, and says why", () => {
    // An airport with no coordinate is one the planner cannot measure a
    // driving time to, so it would be added and then quietly do nothing.
    assert.match(String(airportProblem({ ...airport(), lat: undefined })), /cannot work out a driving time/);
  });

  it("refuses a coordinate that is not a place on earth", () => {
    assert.match(String(airportProblem(airport({ lat: 95 }))), /not a place on earth/);
    assert.match(String(airportProblem(airport({ lng: -200 }))), /not a place on earth/);
  });

  it("refuses 0, 0 — which is what an empty form produces", () => {
    assert.match(String(airportProblem(airport({ lat: 0, lng: 0 }))), /Atlantic/);
  });

  it("refuses an airport that is its own city group", () => {
    assert.match(String(airportProblem(airport({ code: "RZE", cityCode: "RZE" }))), /its own city group/);
  });
});

describe("what a city group has to have", () => {
  const metro = { code: "KRW", label: "Kraków and Rzeszów", country: "Poland" };

  it("takes a group with two airports in it", () => {
    assert.equal(metroProblem(metro, 2), null);
  });

  it("REFUSES a group with fewer than two, and says what to do", () => {
    // A group is an offer to search several airports together. One holding a
    // single airport is a duplicate row in the picker saying the same thing
    // twice.
    assert.match(String(metroProblem(metro, 1)), /at least two airports/);
    assert.match(String(metroProblem(metro, 1)), /Put the airports in the group first/);
    assert.match(String(metroProblem(metro, 0)), /at least two/);
  });

  it("refuses a code that is already an airport", () => {
    // KRK the group and KRK the airport would be two different things under
    // one name, and the picker could not tell them apart.
    assert.match(String(metroProblem({ ...metro, code: "KRK" }, 3)), /already an airport/);
    assert.ok(isBuiltInAirport("KRK"));
  });

  it("needs a name a traveller would recognise", () => {
    assert.match(String(metroProblem({ ...metro, label: " " }, 2)), /what a traveller should see/);
  });
});
