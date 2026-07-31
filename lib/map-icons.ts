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
 * The one description of the shape — the compass from the logo.
 *
 * The logo's mark is an eight-point rose: four long points at the cardinals,
 * four shorter ones between them, inside a gold ring with a navy hairline just
 * within it. That two-tone ring is the part that makes it read as ours rather
 * than as a generic compass, so it is kept even at pin size.
 *
 * WHAT IS LEFT OUT, AND WHY. The full artwork also has the bail it hangs from,
 * the letter N above it, hairline rays between the points and four small
 * sparkles. At twenty-six pixels those are two or three pixels each: they
 * would be smudges rather than detail, and the bail would push the rose off
 * centre so the pin no longer sits on its own coordinate. What is kept is what
 * survives being small.
 *
 * The map needs it as a string it can put in an image URL; the legend needs it
 * as React. Both are built from these, so the mark below the map and the pins
 * on it cannot drift apart.
 */
export const COMPASS_VIEWBOX = "0 0 24 24";
export const COMPASS_RING = { cx: 12, cy: 12, r: 11.1, fill: "#fffdf9", strokeWidth: 1.5 };
/** The navy hairline just inside the ring, as in the logo. */
export const COMPASS_INNER_RING = { cx: 12, cy: 12, r: 9.85, color: "#172d52", strokeWidth: 0.7 };
export const COMPASS_ROSE =
  "M12.00 2.70 L12.75 10.20 L16.31 7.69 L13.80 11.25 L21.30 12.00 L13.80 12.75 L16.31 16.31 L12.75 13.80 " +
  "L12.00 21.30 L11.25 13.80 L7.69 16.31 L10.20 12.75 L2.70 12.00 L10.20 11.25 L7.69 7.69 L11.25 10.20Z";

/**
 * The rose inside its rings, in one colour.
 *
 * The disc is filled rather than transparent so a pin stays readable over a
 * dark satellite tile as well as a pale street one.
 */
export function compassSvg(color: string): string {
  const ring = COMPASS_RING;
  const inner = COMPASS_INNER_RING;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${COMPASS_VIEWBOX}">`,
    `<circle cx="${ring.cx}" cy="${ring.cy}" r="${ring.r}" fill="${ring.fill}" stroke="${color}" stroke-width="${ring.strokeWidth}"/>`,
    `<circle cx="${inner.cx}" cy="${inner.cy}" r="${inner.r}" fill="none" stroke="${inner.color}" stroke-width="${inner.strokeWidth}" stroke-opacity="0.55"/>`,
    `<path d="${COMPASS_ROSE}" fill="${color}"/>`,
    `</svg>`,
  ].join("");
}

export function compassUrl(color: string): string {
  return `data:image/svg+xml,${encodeURIComponent(compassSvg(color))}`;
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
 * Leaflet and Google both count zoom the same way: about 4 is a continent, 7 a
 * country, 11 a city.
 */
export function pinScale(zoom: number): number {
  if (zoom <= 5) return 0.5;
  if (zoom <= 7) return 0.7;
  if (zoom <= 9) return 0.85;
  return 1;
}

export function compassFor(kind: MapKind, zoom = 11): { url: string; size: number; color: string; label: string } {
  const style = MAP_STYLE[kind];
  // Rounded to a whole pixel: a half-pixel icon is resampled and the hairline
  // inside the ring turns to mush.
  const size = Math.max(10, Math.round(style.size * pinScale(zoom)));
  return { url: compassUrl(style.color), size, color: style.color, label: style.label };
}

/** The kinds a visitor can switch on and off, in the order they are offered. */
export const TOGGLEABLE_KINDS: MapKind[] = ["kever", "attraction", "stay", "kosher", "airport"];
