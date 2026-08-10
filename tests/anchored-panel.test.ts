import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { measureAnchor, type MeasureAnchorOptions } from "@/lib/anchored-panel";

/**
 * The calendar that was cut in half by the box it opened in.
 *
 * WHAT WAS WRONG. The booking panel is a rounded card, and the rounding is
 * done with `overflow-hidden` on two nested wrappers — that is what clips the
 * hairline grid to the corners. Every popover inside it was
 * `position: absolute`, and an absolutely-positioned box is clipped by any
 * ancestor that hides its overflow.
 *
 * Measured in a browser at 390px before the fix: the calendar ran to y=781
 * inside a container that ended at y=600. A hundred and eighty-one pixels of
 * the month — the last two weeks — were not on the screen, so there were dates
 * you simply could not click. The city and airport lists had the same shape
 * and the same bug.
 *
 * THE FIX is to position against the viewport instead of the field, which
 * escapes overflow clipping without moving anything in the DOM. This file
 * covers the arithmetic; the browser check that the panel is genuinely
 * unclipped is in the verification run, because only a real layout can answer
 * it — rect maths cannot tell a clipped box from an unclipped one.
 */

const LIB = readFileSync("lib/anchored-panel.ts", "utf8");
const POPOVERS = [
  "components/DateField.tsx",
  "components/AddressAutocomplete.tsx",
  "components/AirportAutocomplete.tsx",
];

/** A field 40px tall, `top` from the top of an 844px phone screen. */
function field(top: number, preferredHeight = 360, options?: MeasureAnchorOptions, height = 844) {
  const rect = { top, bottom: top + 40, left: 20, width: 300, height: 40, right: 320, x: 20, y: top };
  const element = { getBoundingClientRect: () => rect } as unknown as HTMLElement;
  const previous = globalThis.window;
  (globalThis as { window?: unknown }).window = { innerHeight: height, innerWidth: 390 };
  try {
    return measureAnchor(element, preferredHeight, options);
  } finally {
    (globalThis as { window?: unknown }).window = previous;
  }
}

describe("where the panel opens", () => {
  it("opens below a field near the top", () => {
    const box = field(100);
    assert.equal(box?.placement, "below");
    assert.equal(box?.top, 144, "it should sit just under the field");
  });

  it("FLIPS ABOVE A FIELD NEAR THE BOTTOM", () => {
    // The measured case: a check-out field two thirds down a phone screen left
    // 330px below and 508px above. Opening downwards into 330px scrolled the
    // last row of the month out of reach.
    const box = field(560);
    assert.equal(box?.placement, "above");
    // Pinned by `bottom` so a short panel stays against the field, not at the
    // top of a tall reserved slot.
    assert.equal(box?.bottom, 844 - (560 - 4), "bottom edge sits just above the field");
    assert.equal(box?.top, undefined);
  });

  it("NEVER RUNS OFF EITHER EDGE", () => {
    assert.ok(field(100)!.left >= 8);
    // A panel as wide as its field, on a field flush to the right edge.
    const box = field(100);
    assert.ok(box!.left + box!.width <= 390 - 8 + 1);
  });

  it("always leaves room to scroll rather than losing the last row", () => {
    for (const top of [0, 100, 400, 700, 820]) {
      const box = field(top);
      assert.ok(box, `no box at ${top}`);
      assert.ok(box.maxHeight >= 160, `${top}: ${box.maxHeight}px is not usable`);
      if (box.placement === "below") {
        assert.ok(box.top! >= 8, `${top}: opens off the top`);
        assert.ok(box.top! + box.maxHeight <= 844, `${top}: runs off the bottom`);
      } else {
        const panelBottom = 844 - box.bottom!;
        const panelTop = panelBottom - box.maxHeight;
        assert.ok(panelTop >= 8 - 0.5, `${top}: opens off the top`);
        assert.ok(panelBottom <= top, `${top}: overlaps the field`);
      }
    }
  });

  it("keeps a city list under Destination when there is still a usable strip below", () => {
    // Measured on /book at 390×844: Destination sat near y=609 with ~179px
    // below. preferredHeight 288 flipped the Photon list into the upper half
    // of the screen. With preferBelow it stays under the field and scrolls.
    const box = field(609, 288, { preferBelow: true });
    assert.equal(box?.placement, "below");
    assert.equal(box?.top, 609 + 40 + 4);
    assert.ok(box!.maxHeight >= 160);
    assert.ok(box!.maxHeight < 288, "it uses the room below rather than flipping");
  });

  it("still flips a city list when the strip below is unusable", () => {
    const box = field(780, 288, { preferBelow: true });
    assert.equal(box?.placement, "above");
    assert.equal(box?.bottom, 844 - (780 - 4));
  });

  it("measures nothing without an element or a window", () => {
    assert.equal(measureAnchor(null), null);
  });
});

describe("every popover uses it", () => {
  it("POSITIONS AGAINST THE VIEWPORT, NOT THE FIELD", () => {
    for (const file of POPOVERS) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /anchoredStyle\(anchor\)/, `${file} is not anchored to the viewport`);
      assert.match(source, /useAnchorTracking\(open, remeasure\)/, `${file} does not follow a scroll`);
    }
  });

  it("suggestion lists prefer sitting below the field", () => {
    for (const file of ["components/AddressAutocomplete.tsx", "components/AirportAutocomplete.tsx"]) {
      assert.match(readFileSync(file, "utf8"), /preferBelow:\s*true/, `${file} still flips like a calendar`);
    }
    // The calendar keeps the full-height flip — that is what the month needs.
    assert.doesNotMatch(readFileSync("components/DateField.tsx", "utf8"), /preferBelow/);
  });

  it("HAS NO ABSOLUTE PANEL LEFT, which is the shape of the bug", () => {
    for (const file of POPOVERS) {
      const source = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      // `absolute inset-0` is the invisible face over the native date input
      // and is meant to be clipped to its own field; a panel hanging off the
      // bottom of a field is the one that must not be.
      assert.doesNotMatch(source, /absolute[^"]*top-full/, `${file} still hangs a panel off its own field`);
    }
  });

  it("sits on the shared z-index scale rather than a guessed number", () => {
    for (const file of POPOVERS) {
      assert.match(readFileSync(file, "utf8"), /--wg-z-popover/, `${file} guesses a z-index`);
    }
    const css = readFileSync("app/globals.css", "utf8");
    assert.match(css, /--wg-z-popover:\s*55/);
    // Above the advertisement, below a dialog.
    assert.match(css, /--wg-z-ad:\s*50/);
    assert.match(css, /--wg-z-modal:\s*60/);
  });

  it("does not reach for a portal, which would move it out of its field", () => {
    // A portal escapes the clipping too, and changes what Tab does, what a
    // screen reader reads next, and whether the click-outside handler still
    // counts its own children as inside.
    for (const file of POPOVERS) {
      assert.doesNotMatch(readFileSync(file, "utf8"), /createPortal/, `${file} moved into a portal`);
    }
    assert.doesNotMatch(LIB, /createPortal/);
  });
});
