import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDayStops } from "@/lib/day-stops";

/**
 * The planner asks the day assistant for one place per line so each can become
 * an addable stop. This is the reading-back, and it must fail toward prose:
 * a line it cannot parse is dropped, and a reply with no parseable line leaves
 * the planner showing the model's own words, exactly as before.
 */
describe("reading day suggestions back into stops", () => {
  it("pulls the place name off a dash bullet and keeps the reason", () => {
    const stops = parseDayStops("- The Zugliget Chairlift — a ride up to János Hill for the view");
    assert.deepEqual(stops, [{ name: "The Zugliget Chairlift", note: "a ride up to János Hill for the view" }]);
  });

  it("handles the shapes a model actually returns", () => {
    const text = [
      "Here are a few ideas:",
      "- **Margaret Island** — a car-free park in the Danube",
      "1. Great Market Hall: an iron-and-glass market",
      "* Fisherman's Bastion",
      "",
      "Confirm details locally.",
    ].join("\n");
    assert.deepEqual(parseDayStops(text), [
      { name: "Margaret Island", note: "a car-free park in the Danube" },
      { name: "Great Market Hall", note: "an iron-and-glass market" },
      { name: "Fisherman's Bastion" },
    ]);
  });

  it("returns nothing when the reply is prose, so the planner falls back to it", () => {
    assert.deepEqual(parseDayStops("This is just a paragraph with no bullets at all."), []);
    assert.deepEqual(parseDayStops(""), []);
  });

  it("drops duplicates and caps the list", () => {
    const text = Array.from({ length: 9 }, (_, i) => `- Place ${i % 3}`).join("\n");
    const stops = parseDayStops(text);
    assert.equal(stops.length, 3);
  });
});
