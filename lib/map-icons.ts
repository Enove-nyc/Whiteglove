import type { MapKind } from "@/lib/map-markers";

/**
 * The logo mark as a map pin: a hand holding a compass, tinted in the kind's
 * colour and seated on a neutral cream disc for contrast on dark tiles.
 *
 * The markers used to be a simplified compass rose drawn in SVG. That kept the
 * colours clear at twenty-six pixels, but it was not the site's mark — the mark
 * is the glove with the compass in its palm. The artwork is baked into small
 * PNGs under /map-pins (see scripts/build-map-pins.mjs) so Google Maps shows
 * the same picture as the legend without resampling a full-size logo into
 * mush.
 *
 * Kind is told by the colour of the mark itself (and by the legend and popup),
 * not by a coloured ring around the pin.
 */

export const MAP_STYLE: Record<MapKind, { color: string; label: string; /** Pin height in CSS pixels at full zoom. */ size: number }> = {
  center: { color: "#172d52", label: "What you searched for", size: 44 },
  kever: { color: "#aa8b52", label: "Kevarim", size: 36 },
  attraction: { color: "#b4472a", label: "Things to do", size: 36 },
  stay: { color: "#2b6d80", label: "Places to stay", size: 36 },
  kosher: { color: "#2f7d54", label: "Kosher food", size: 34 },
  airport: { color: "#7a6a92", label: "Airports", size: 34 },
};

/** Intrinsic pixel size of each file in /map-pins (scripts/build-map-pins.mjs). */
export const GLOVE_PIN_INTRINSIC = { width: 56, height: 78 };

/** Public path for one kind's pin. Same file the legend draws. */
export function glovePinSrc(kind: MapKind): string {
  return `/map-pins/${kind}.png`;
}

/**
 * How big a pin should be at a given zoom.
 *
 * The map opens on everything, which at continent zoom is nearly three hundred
 * points inside a few hundred pixels. At full size they pile into a heap where
 * no individual place can be picked out — the pins stop being pins and become
 * texture. Shrinking them out there keeps the shape of where things ARE, which
 * is what that view is for, and they come up to full size as soon as somebody
 * zooms in far enough to want to press one.
 *
 * Google Maps uses roughly 4 for a continent, 7 for a country, and 11 for a
 * city.
 */
export function pinScale(zoom: number): number {
  if (zoom <= 5) return 0.5;
  if (zoom <= 7) return 0.7;
  if (zoom <= 9) return 0.85;
  return 1;
}

export type GlovePin = {
  url: string;
  /** Drawn width in CSS pixels. */
  width: number;
  /** Drawn height in CSS pixels. */
  height: number;
  /** Horizontal anchor from the left of the icon (tip of the cuff, centred). */
  anchorX: number;
  /** Vertical anchor from the top of the icon (tip of the cuff). */
  anchorY: number;
  color: string;
  label: string;
};

/**
 * The pin for one kind at the current zoom.
 *
 * The cuff is the tip that sits on the coordinate — not the centre of the disc
 * — so a place's marker reads as "here" rather than floating above it.
 */
export function compassFor(kind: MapKind, zoom = 11): GlovePin {
  const style = MAP_STYLE[kind];
  const height = Math.max(14, Math.round(style.size * pinScale(zoom)));
  const width = Math.max(10, Math.round((height * GLOVE_PIN_INTRINSIC.width) / GLOVE_PIN_INTRINSIC.height));
  return {
    url: glovePinSrc(kind),
    width,
    height,
    anchorX: width / 2,
    // Slightly above the very bottom so anti-aliasing on the cuff tip does not
    // leave a gap between the pin and the map.
    anchorY: height * 0.92,
    color: style.color,
    label: style.label,
  };
}

/** The kinds a visitor can switch on and off, in the order they are offered. */
export const TOGGLEABLE_KINDS: MapKind[] = ["kever", "attraction", "stay", "kosher", "airport"];
