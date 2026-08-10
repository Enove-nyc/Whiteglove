/**
 * Positioning a popover so its own panel cannot swallow it.
 *
 * THE BUG THIS EXISTS FOR. The booking panel is drawn as a rounded card with
 * `overflow-hidden` — that is what clips the hairline grid to the rounded
 * corners, and it is on two nested wrappers. Every popover inside it (the
 * calendar, the city list, the airport list) was `position: absolute`, and an
 * absolutely-positioned box is clipped by any ancestor that hides its
 * overflow. Measured on a 390px viewport: the calendar ran to y=781 inside a
 * container that ended at y=600, so 181 pixels of it — most of the month —
 * were simply not on the screen. You could not pick a date.
 *
 * WHY `fixed` RATHER THAN A PORTAL. A fixed box is positioned against the
 * viewport and escapes overflow clipping without moving in the DOM. A portal
 * would escape it too, and would also move the panel out of its field in the
 * document order — which changes what Tab does, what a screen reader reads
 * next, and whether the click-outside handler still sees its own children as
 * inside. Staying put and changing the coordinate system is the smaller change
 * and keeps all of that behaviour exactly as it was.
 *
 * The one thing `fixed` does not escape is an ancestor that establishes a
 * containing block — a transform, a filter, a backdrop-filter, will-change,
 * or contain: paint. There is none above these fields, and the test asserts
 * it stays that way.
 */

import { useEffect } from "react";

export type AnchorBox = {
  /** Viewport coordinates, for `position: fixed`. */
  top: number;
  left: number;
  /** The field's own width, so the panel lines up under it. */
  width: number;
  /** How tall the panel may be before it needs to scroll. */
  maxHeight: number;
  placement: "above" | "below";
};

/**
 * Where the panel goes, given the field it belongs to.
 *
 * IT FLIPS RATHER THAN OVERFLOWING. A calendar opened from a field near the
 * bottom of a phone screen has nowhere to go downwards; before this it went
 * there anyway and ran off the viewport. When the room below is too small and
 * there is more above, it opens upwards instead, and either way it is given a
 * maximum height so the last row is reachable by scrolling rather than lost.
 */
export function measureAnchor(element: HTMLElement | null, preferredHeight = 320): AnchorBox | null {
  if (!element || typeof window === "undefined") return null;
  const rect = element.getBoundingClientRect();
  const GAP = 4;
  const EDGE = 8;
  const below = window.innerHeight - rect.bottom - GAP - EDGE;
  const above = rect.top - GAP - EDGE;
  // Flip when the panel does not FIT below, not merely when it is cramped.
  // Measured: a check-out field two thirds down a phone screen left 330px
  // below and 508px above, and a 360px calendar took the 330 and scrolled its
  // last row out of reach. It belongs above.
  const flip = below < preferredHeight && above > below;
  const height = Math.max(160, Math.min(preferredHeight, flip ? above : below));

  return {
    top: flip ? Math.max(EDGE, rect.top - GAP - height) : rect.bottom + GAP,
    // Never off the left or right edge: a panel wider than its field on a
    // narrow screen would otherwise hang off the side of the phone.
    left: Math.max(EDGE, Math.min(rect.left, window.innerWidth - rect.width - EDGE)),
    width: rect.width,
    maxHeight: height,
    placement: flip ? "above" : "below",
  };
}

/**
 * Keeps a measurement true while the panel is open.
 *
 * `true` on the scroll listener is the capture phase, which is the only way to
 * hear about a scroll inside some other scrolling element — the panel is
 * anchored to the viewport now, so a field that moves for any reason has to
 * take its panel with it.
 *
 * The effect only adds listeners; nothing sets state in its body, which is
 * what the cascading-render lint rule is about.
 */
export function useAnchorTracking(open: boolean, remeasure: () => void): void {
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", remeasure, true);
    window.addEventListener("resize", remeasure);
    return () => {
      window.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("resize", remeasure);
    };
  }, [open, remeasure]);
}

/** The inline style a panel needs. Kept here so all three agree. */
export function anchoredStyle(box: AnchorBox | null): React.CSSProperties | undefined {
  if (!box) return undefined;
  return {
    position: "fixed",
    top: box.top,
    left: box.left,
    maxHeight: box.maxHeight,
    overflowY: "auto",
  };
}
