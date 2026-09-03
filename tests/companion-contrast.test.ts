import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * THE APP'S OWN COLOURS, MEASURED RATHER THAN EYEBALLED.
 *
 * Every colour in components/companion/CompanionApp.tsx is an inline style
 * literal, so nothing else in the project can check them and nothing did. The
 * whole of the app's small print was under AA, and every primary action in it
 * was cream on gold at 2.86:1 — less than half of what is readable.
 *
 * None of that is decoration. A stop's time, a walk of four minutes, the group
 * a confirmation is filed under and the word on the button that accepts a
 * change are what somebody reads this app for, on a phone, outdoors.
 *
 * WHY THIS FILE AND NOT A BROWSER. The itineraries repository carries its own
 * copy of this component and the same pass was verified there in a browser at
 * 390, 768 and 1280 — every screen, zero failures. This copy cannot be opened
 * the same way: /app here needs a signed-in account on a paid plan and a
 * connected store. So the colours are checked by arithmetic instead, against
 * the three grounds this app actually draws on, which is the part a browser
 * was confirming anyway.
 */

const SRC = readFileSync("components/companion/CompanionApp.tsx", "utf8");

/** Reads `const NAME = "#rrggbb";` out of the component. */
function colour(name: string): string {
  const m = SRC.match(new RegExp(`const ${name} = "(#[0-9a-f]{6})";`, "i"));
  assert.ok(m, `${name} is gone from CompanionApp.tsx, or is no longer a plain hex literal`);
  return m![1];
}

function luminance(hex: string): number {
  const parts = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = parts.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const GOLD = colour("GOLD");
const CREAM = colour("CREAM");
const NAVY = colour("NAVY");
const INK = colour("INK");
const MUTED = colour("MUTED");
const FAINT = colour("FAINT");
const GOLD_ON_DARK = colour("GOLD_ON_DARK");
const ON_GOLD = SRC.includes("const ON_GOLD = NAVY;") ? NAVY : colour("ON_GOLD");

/**
 * The grounds the app draws MUTED text on. On the Mushroom palette that is the
 * warm-white card (#FAF8F3): the page ground is Mushroom (#D5CEC3), dark enough
 * that a legible-as-muted grey cannot clear 4.5 on it, so muted metadata lives
 * on the raised card and the page carries only ink and headings. The deep chips
 * (#C7BFB1) carry ink, not grey — checked separately below.
 */
const GROUNDS: Array<[string, string]> = [
  ["a warm-white card", "#FAF8F3"],
];

// Everything measured here is under 18px, so AA is 4.5 for all of it.
const AA = 4.5;

describe("the two greys clear AA on every ground", () => {
  for (const [where, bg] of GROUNDS) {
    it(`MUTED reads on ${where}`, () => {
      const r = ratio(MUTED, bg);
      assert.ok(r >= AA, `MUTED ${MUTED} on ${bg} is ${r.toFixed(2)}:1, under ${AA}`);
    });

    it(`FAINT reads on ${where}`, () => {
      const r = ratio(FAINT, bg);
      assert.ok(r >= AA, `FAINT ${FAINT} on ${bg} is ${r.toFixed(2)}:1, under ${AA}`);
    });
  }

  it("keeps them two greys, not one", () => {
    // They exist to separate a label from the metadata beside it. Driven to the
    // same value the hierarchy is gone and one of them should be deleted
    // rather than quietly duplicated.
    assert.notEqual(MUTED, FAINT);
    assert.ok(luminance(MUTED) < luminance(FAINT), "MUTED must be the darker of the two");
  });

  it("writes in a deep teal rather than a warm charcoal", () => {
    // The old ink was #26323a — a warm charcoal. It is the palette's dark teal
    // #102F35 now, which has real blue in it and clears 9:1 on the Mushroom
    // ground (13:1 on a card) — as dark as text gets while carrying the brand.
    const [red, , blue] = [1, 3, 5].map((i) => parseInt(INK.slice(i, i + 2), 16));
    assert.ok(blue > red, `the ink ${INK} has no more blue in it than red`);
    assert.ok(ratio(INK, CREAM) >= 9, "the ink got lighter on the way to being bluer");
  });
});

describe("what is written on the gold", () => {
  it("is legible, which the cream was not", () => {
    /**
     * Cream on gold is 2.86:1 — well under half of AA — and it was on every
     * primary action in the app. The gold does not move; it is the brand. The
     * navy already in this palette clears AA against exactly the same gold, so
     * only the words changed colour.
     */
    const r = ratio(ON_GOLD, GOLD);
    assert.ok(r >= AA, `text on gold is ${r.toFixed(2)}:1, under ${AA}`);
    assert.ok(ratio(CREAM, GOLD) < AA, "cream on gold has become legible — this test is out of date");
  });

  it("is not written in cream anywhere the gold is behind it", () => {
    assert.doesNotMatch(SRC, /background: GOLD, color: CREAM/);
    assert.doesNotMatch(SRC, /color: on \? CREAM/);
    assert.doesNotMatch(SRC, /fg: on \? CREAM/);
  });

  it("keeps the live card gold, and readable to the dark end of it", () => {
    /**
     * The "happening now" card is the one place a warm highlight IS the signal,
     * so it stays gold rather than going navy with the panel. Its gradient ran
     * to #8f6c3a, where navy is 3.33:1 — so the dark end was lifted to #b07f38,
     * which is 4.52 and clears AA across the whole card.
     */
    assert.match(SRC, /linear-gradient\(155deg, \$\{GOLD\} 0%, #B89048 100%\)/);
    assert.ok(ratio(ON_GOLD, "#B89048") >= AA);
  });
});

describe("the dark the app is anchored on", () => {
  /**
   * THE FIRST SCREEN HAD A PANEL AND THE OTHER SCREENS HAD NOTHING.
   *
   * The bar at the top of every screen was cream, on a cream page, above white
   * cards — so the wallet, the advisor thread and the You screen carried no
   * dark colour at all and had nothing to sit against. It is navy now, the
   * same navy as the panel, which is what makes the app read as one thing
   * rather than one good screen and four pale ones.
   */
  it("puts the navy bar at the top of every screen, not only the first", () => {
    assert.match(SRC, /background: NAVY, color: CREAM, borderBottom/);
  });

  it("writes on it in things that can be read there", () => {
    // 9.5px small caps, so 4.5 with no allowance for size.
    const eyebrow = ratio(GOLD_ON_DARK, NAVY);
    assert.ok(eyebrow >= AA, `the eyebrow on the navy bar is ${eyebrow.toFixed(2)}:1, under ${AA}`);
    assert.ok(ratio(CREAM, NAVY) >= AA);
  });

  it("uses a lifted gold there rather than the flat one", () => {
    // The brand gold is 5.13:1 on the navy — legible, and muddy at 9.5px
    // against a dark ground. Same hue, carried up.
    assert.notEqual(GOLD_ON_DARK, GOLD);
    assert.ok(ratio(GOLD_ON_DARK, NAVY) > ratio(GOLD, NAVY));
  });

  it("rings the unread dot in the colour actually behind it", () => {
    // It was ringed in cream, for the cream bar it used to sit on. On navy
    // that reads as a smudge rather than a dot.
    assert.match(SRC, /background: GOLD, border: `2px solid \$\{NAVY\}`/);
  });

  it("gives the section headings the navy too", () => {
    // They were the same grey as the metadata under them, so a wallet was one
    // flat wash of grey small caps with nothing marking where a group started.
    assert.doesNotMatch(SRC, /kicker\(MUTED\)/, "a section heading is grey small caps again");
    assert.match(SRC, /kicker\(NAVY\)/);
  });

  it("makes the opening panel the dark one, not a second gold block", () => {
    assert.match(SRC, /linear-gradient\(150deg, \$\{NAVY\} 0%/);
  });
});
