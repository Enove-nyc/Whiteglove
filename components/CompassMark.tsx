import { glovePinSrc } from "@/lib/map-icons";
import type { MapKind } from "@/lib/map-markers";

/**
 * The map's glove mark, drawn in the page.
 *
 * The same kind-tinted PNG the pins use (`/map-pins/{kind}.png`), so the legend
 * cannot end up showing a mark the map does not.
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
  return (
    <img
      src={glovePinSrc(kind)}
      alt=""
      width={width}
      height={height}
      aria-hidden="true"
      draggable={false}
      className={`shrink-0 object-contain ${muted ? "opacity-40 grayscale" : ""} ${className}`}
    />
  );
}
