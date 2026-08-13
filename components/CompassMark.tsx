import { MAP_STYLE } from "@/lib/map-icons";
import type { MapKind } from "@/lib/map-markers";

/**
 * The map's glove mark, drawn in the page (legend / filter chips).
 *
 * Kind colour is painted onto the line-art itself — the same `MAP_STYLE`
 * colours the map pins use. No cream disc here: that backing is only for
 * contrast on map tiles, and it reads as a circle around the chip icon.
 */
export default function CompassMark({ kind, size = 18, muted = false, className = "" }: {
  kind: MapKind;
  size?: number;
  muted?: boolean;
  className?: string;
}) {
  // Height matches the pin aspect; width follows so the cuff stays sharp.
  const height = size;
  const width = Math.round((size * 56) / 78);
  const color = muted ? "#a8a29e" : MAP_STYLE[kind].color;
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${muted ? "opacity-40" : ""} ${className}`}
      style={{
        width,
        height,
        backgroundColor: color,
        WebkitMaskImage: "url(/map-glove-pin.png)",
        maskImage: "url(/map-glove-pin.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
