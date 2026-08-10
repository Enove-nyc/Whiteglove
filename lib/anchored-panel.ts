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
import type { CSSProperties } from "react";

/** Shortest panel that is still worth opening — below this, flip instead. */
const MIN_USABLE = 160;

export type AnchorBox = {
  /**
   * Viewport `top` when the panel opens below the field. Omitted when it
   * opens above — those panels pin with `bottom` so a short list stays
   * against the field instead of floating in a tall empty slot.
   */
  top?: number;
  /**
   * Viewport `bottom` (CSS: distance from the viewport's bottom edge) when
   * the panel opens above the field.
   */
  bottom?: number;
  left: number;
  /** The field's own width, so the panel lines up under it. */
  width: number;
  /** How tall the panel may be before it needs to scroll. */
  maxHeight: number;
  placement: "above" | "below";
};

export type MeasureAnchorOptions = {
  /**
   * Suggestion lists: stay below whenever there is a usable strip of room,
   * and scroll inside it. Calendars leave this off so a month that almost
   * fits below still flips up rather than hiding its last row.
   */
  preferBelow?: boolean;
};

/**
 * Where the panel goes, given the field it belongs to.
 *
 * IT FLIPS RATHER THAN OVERFLOWING. A calendar opened from a field near the
 * bottom of a phone screen has nowhere to go downwards; before this it went
 * there anyway and ran off the viewport. When the room below is too small and
 * there is more above, it opens upwards instead, and either way it is given a
 * maximum height so the last row is reachable by scrolling rather than lost.
 *
 * OPENING ABOVE PINS THE BOTTOM EDGE. A suggestions list is often shorter
 * than the reserved slot. Pinning with `top` and a tall max-height left a
 * short list at the top of that slot — on the book page, tens or hundreds of
 * pixels above the Destination field, easy to miss. `bottom` keeps even a
 * two-line list against the field.
 */
export function measureAnchor(
  element: HTMLElement | null,
  preferredHeight = 320,
  options?: MeasureAnchorOptions,
): AnchorBox | null {
  if (!element || typeof window === "undefined") return null;
  const rect = element.getBoundingClientRect();
  const GAP = 4;
  const EDGE = 8;
  const below = window.innerHeight - rect.bottom - GAP - EDGE;
  const above = rect.top - GAP - EDGE;
  // Calendars: flip when the full month does not FIT below, not merely when
  // it is cramped. Measured: a check-out field two thirds down a phone
  // screen left 330px below and 508px above, and a 360px calendar took the
  // 330 and scrolled its last row out of reach. It belongs above.
  //
  // Suggestion lists (`preferBelow`): flip only when the strip below is too
  // short to use. Otherwise stay under the field and scroll — flipping a
  // city list into a 288px slot parked a short Photon answer near the top of
  // the screen on /book.
  const flip = options?.preferBelow
    ? below < MIN_USABLE && above > below
    : below < preferredHeight && above > below;
  const height = Math.max(MIN_USABLE, Math.min(preferredHeight, flip ? above : below));
  const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - rect.width - EDGE));

  if (flip) {
    return {
      // Pin the panel's bottom edge just above the field.
      bottom: window.innerHeight - (rect.top - GAP),
      left,
      width: rect.width,
      maxHeight: height,
      placement: "above",
    };
  }

  return {
    top: rect.bottom + GAP,
    left,
    width: rect.width,
    maxHeight: height,
    placement: "below",
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
export function anchoredStyle(box: AnchorBox | null): CSSProperties | undefined {
  if (!box) return undefined;
  if (box.placement === "above") {
    return {
      position: "fixed",
      top: "auto",
      bottom: box.bottom,
      left: box.left,
      maxHeight: box.maxHeight,
      overflowY: "auto",
    };
  }
  return {
    position: "fixed",
    top: box.top,
    left: box.left,
    maxHeight: box.maxHeight,
    overflowY: "auto",
  };
}
