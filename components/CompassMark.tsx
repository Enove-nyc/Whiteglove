import { COMPASS_INNER_RING, COMPASS_RING, COMPASS_ROSE, COMPASS_VIEWBOX, MAP_STYLE } from "@/lib/map-icons";
import type { MapKind } from "@/lib/map-markers";

/**
 * The map's compass, drawn in the page.
 *
 * Built from the same three constants as the pins themselves, so the legend
 * cannot end up showing a mark the map does not use.
 */
export default function CompassMark({ kind, size = 14, muted = false, className = "" }: {
  kind: MapKind;
  size?: number;
  muted?: boolean;
  className?: string;
}) {
  const color = muted ? "#a8a29e" : MAP_STYLE[kind].color;
  return (
    <svg
      viewBox={COMPASS_VIEWBOX}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <circle cx={COMPASS_RING.cx} cy={COMPASS_RING.cy} r={COMPASS_RING.r} fill={COMPASS_RING.fill} stroke={color} strokeWidth={COMPASS_RING.strokeWidth} />
      <circle
        cx={COMPASS_INNER_RING.cx}
        cy={COMPASS_INNER_RING.cy}
        r={COMPASS_INNER_RING.r}
        fill="none"
        stroke={muted ? "#a8a29e" : COMPASS_INNER_RING.color}
        strokeWidth={COMPASS_INNER_RING.strokeWidth}
        strokeOpacity={0.55}
      />
      <path d={COMPASS_ROSE} fill={color} />
    </svg>
  );
}
