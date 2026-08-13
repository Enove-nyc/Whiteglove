import { GLOVE_MARK_INTRINSIC, MAP_STYLE } from "@/lib/map-icons";
import type { MapKind } from "@/lib/map-markers";

/**
 * The map's glove mark, drawn in the page (legend / filter chips).
 *
 * Kind colour is painted onto the line-art itself — the same `MAP_STYLE`
 * colours, through the same `.wg-glove-mark` mask, as the markers on the map,
 * so a chip and its pins always match. No disc behind either of them.
 */
export default function CompassMark({ kind, size = 18, muted = false, className = "" }: {
  kind: MapKind;
  size?: number;
  muted?: boolean;
  className?: string;
}) {
  // Height matches the pin aspect; width follows so the cuff stays sharp.
  const height = size;
  const width = Math.round((size * GLOVE_MARK_INTRINSIC.width) / GLOVE_MARK_INTRINSIC.height);
  const color = muted ? "#a8a29e" : MAP_STYLE[kind].color;
  return (
    <span
      aria-hidden="true"
      className={`wg-glove-mark inline-block shrink-0 ${muted ? "opacity-40" : ""} ${className}`}
      style={{ width, height, backgroundColor: color }}
    />
  );
}
