import type { MapKind } from "@/lib/map-markers";

/**
 * The compass from the logo, as a map pin.
 *
 * The markers used to be plain coloured dots. A dot is what every map on earth
 * draws, so ours looked like nobody had thought about it — and the site's own
 * mark is a hand holding a compass, which is exactly the right shape for
 * "here is somewhere worth going".
 *
 * Drawn rather than using the logo image: the artwork is navy, and each kind
 * of place needs its own colour. The rose is the same in both, so a pin looks
 * the same whether the page drew Google's map or OpenStreetMap's.
 *
 * A data URI rather than a file, so the legend below the map and the pins on
 * it are provably the same picture and cannot drift apart.
 */

export const MAP_STYLE: Record<MapKind, { color: string; label: string; size: number }> = {
  center: { color: "#172d52", label: "What you searched for", size: 34 },
  kever: { color: "#aa8b52", label: "Kevarim", size: 26 },
  attraction: { color: "#b4472a", label: "Things to do", size: 26 },
  stay: { color: "#2b6d80", label: "Places to stay", size: 26 },
  kosher: { color: "#2f7d54", label: "Kosher food", size: 24 },
  airport: { color: "#7a6a92", label: "Airports", size: 24 },
};

/**
 * The one description of the shape.
 *
 * The map needs it as a string it can put in an image URL; the legend needs it
 * as React. Both are built from these, so the mark below the map and the pins
 * on it cannot drift apart.
 */
export const COMPASS_VIEWBOX = "0 0 24 24";
export const COMPASS_RING = { cx: 12, cy: 12, r: 10.6, fill: "#fffdf9", strokeWidth: 1.9 };
export const COMPASS_ROSE = "M12 3.6 13.8 10.2 20.4 12 13.8 13.8 12 20.4 10.2 13.8 3.6 12 10.2 10.2Z";

/**
 * A four-point rose inside a ring, in one colour.
 *
 * The ring is filled rather than transparent so a pin stays readable over a
 * dark satellite tile as well as a pale street one.
 */
export function compassSvg(color: string): string {
  const { cx, cy, r, fill, strokeWidth } = COMPASS_RING;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${COMPASS_VIEWBOX}">`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}"/>`,
    `<path d="${COMPASS_ROSE}" fill="${color}"/>`,
    `</svg>`,
  ].join("");
}

export function compassUrl(color: string): string {
  return `data:image/svg+xml,${encodeURIComponent(compassSvg(color))}`;
}

export function compassFor(kind: MapKind): { url: string; size: number; color: string; label: string } {
  const style = MAP_STYLE[kind];
  return { url: compassUrl(style.color), size: style.size, color: style.color, label: style.label };
}

/** The kinds a visitor can switch on and off, in the order they are offered. */
export const TOGGLEABLE_KINDS: MapKind[] = ["kever", "attraction", "stay", "kosher", "airport"];
