import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { gearSpellingSplits, gearWordingHint, type TravelGearItem } from "@/lib/travel-gear";

/**
 * The shelf is filled by pasting, and pasting brings four things with it.
 *
 * Every row is a real product with a real supplier, and the way the shelf gets
 * filled is by copying a title and a line of description from wherever the
 * product lives. That is the right way to fill it. It also means, every time:
 * a title with a stray comma or pipe left on the end, a description cut off
 * mid-sentence at whatever length the source truncated it to, a typo in a word
 * nobody proofreads — "Potable Luggage Scale" was live on the shelf — and the
 * same Hebrew word spelled two ways down one page.
 *
 * NONE OF IT REFUSES A SAVE. The row is still useful and he may be mid-paste,
 * and the site must not rewrite a supplier's product title on his behalf: the
 * one thing worse than a typo in a product name is a "correction" that makes
 * it the wrong product. So it says what it sees, where he is already looking.
 */

const base: TravelGearItem = {
  id: "x",
  name: "Portable luggage scale",
  description: "A small scale for weighing a case before the airport.",
  imageUrl: "",
  price: "",
  priceCheckedAt: "",
  url: "https://example.com/x",
  cta: "",
};

describe("wording that reads as pasted", () => {
  it("catches the typo that was actually live", () => {
    const hint = gearWordingHint({ ...base, name: "Potable Luggage Scale" });
    assert.match(hint ?? "", /probably meant to be "portable"/);
  });

  it("catches a title still carrying its separator", () => {
    for (const name of ["Luggage scale,", "Luggage scale |", "Luggage scale -"]) {
      assert.match(gearWordingHint({ ...base, name }) ?? "", /stray mark/, `${name} passed`);
    }
  });

  it("catches a description cut off where the source truncated it", () => {
    assert.match(
      gearWordingHint({ ...base, description: "A small scale for weighing a case before…" }) ?? "",
      /cut off/,
    );
    assert.match(
      gearWordingHint({
        ...base,
        description: "A compact digital hanging scale with a wide hook and a backlit display for weighing a case",
      }) ?? "",
      /stops without finishing/,
    );
  });

  it("says nothing about a row that reads as written", () => {
    assert.equal(gearWordingHint(base), null);
    // A short description with no full stop is a label, not a truncation.
    assert.equal(gearWordingHint({ ...base, description: "Weighs a case" }), null);
    // And a question mark or a quote ends a sentence too.
    assert.equal(gearWordingHint({ ...base, description: `${"x".repeat(90)}?` }), null);
  });
});

describe("one word, spelled two ways, on one page", () => {
  it("reports the split without claiming a right spelling", () => {
    const splits = gearSpellingSplits([
      { ...base, id: "a", name: "Havdalah candle" },
      { ...base, id: "b", name: "Havdallah set" },
    ]);
    assert.deepEqual(splits, ["havdalah / havdallah"]);
  });

  it("says nothing when the shelf is consistent", () => {
    assert.deepEqual(
      gearSpellingSplits([
        { ...base, id: "a", name: "Havdalah candle" },
        { ...base, id: "b", name: "Havdalah set" },
      ]),
      [],
    );
  });

  it("is shown where he edits the shelf", () => {
    const form = readFileSync("components/TravelGearForm.tsx", "utf8");
    assert.match(form, /gearWordingHint/);
    assert.match(form, /gearSpellingSplits/);
    assert.match(form, /Spelled two ways on the shelf/);
  });

  it("never blocks a save", () => {
    // gearItemProblem is what refuses; these must stay out of it.
    const lib = readFileSync("lib/travel-gear.ts", "utf8");
    const problem = lib.slice(lib.indexOf("export function gearItemProblem"), lib.indexOf("export function gearListProblem"));
    assert.doesNotMatch(problem, /gearWordingHint|gearSpellingSplits/);
  });
});
