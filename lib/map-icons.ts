import type { MapKind } from "@/lib/map-markers";

/**
 * The logo mark as a map pin: a hand holding a compass, tinted in the kind's
 * colour.
 *
 * The markers used to be a simplified compass rose drawn in SVG. That kept the
 * colours clear at twenty-six pixels, but it was not the site's mark — the mark
 * is the glove with the compass in its palm.
 *
 * Kind is told by the colour of the mark itself (and by the legend and popup),
 * not by a coloured ring or a disc around the pin. Anything that can tint the
 * artwork in the browser — the legend chips and the Leaflet markers — masks
 * the line art in `GLOVE_MARK_SRC` and paints a `MAP_STYLE` colour through it.
 * Google Maps takes a plain image URL and cannot tint one, so it is served the
 * baked PNGs under /map-pins (scripts/build-map-pins.mjs), which carry the same
 * colours already burnt in.
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

/**
 * The bare line-art mark, to be masked and tinted in CSS.
 *
 * One file, one path: the legend chips (components/CompassMark.tsx) and the map
 * markers both mask this, through the `.wg-glove-mark` rule in globals.css, so
 * the pins on the map and the pins in the legend cannot come apart.
 */
export const GLOVE_MARK_SRC = "/map-glove-pin.png";

/** Public path for one kind's baked map pin (tinted mark on a cream disc). */
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
 * The baked pin for one kind at the current zoom — Google Maps' icon.
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

/**
 * The same pin as bare line art, for a renderer that can tint it in CSS.
 *
 * Leaflet is given a div rather than an image, so the mark can be masked and
 * painted in the kind's colour — the treatment the legend chips already use.
 * No cream disc: it was only ever contrast on dark tiles, and it read as a
 * badge drawn around the mark.
 *
 * The mask fills the icon box where the baked PNG left a few pixels of air
 * under the cuff, so the anchor sits that much lower to keep the tip of the
 * cuff on the coordinate.
 */
export function markPinFor(kind: MapKind, zoom = 11): GlovePin {
  const pin = compassFor(kind, zoom);
  return { ...pin, url: GLOVE_MARK_SRC, anchorY: pin.height * 0.97 };
}

/** The kinds a visitor can switch on and off, in the order they are offered. */
export const TOGGLEABLE_KINDS: MapKind[] = ["kever", "attraction", "stay", "kosher", "airport"];
