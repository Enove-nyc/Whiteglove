// The White Glove mark — the gloved hand holding the compass — reused small:
// as a bullet, a section ornament, a marker beside a heading.
//
// It is the favicon image itself (see .glove-mark in globals.css), so the mark
// on the browser tab and the mark down the side of a list are the same picture
// rather than two drawings of the same idea. Because it carries its own navy
// tile it reads on cream and on navy alike, and does not take a colour from
// the section around it.

const SIZES = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
  xl: "h-10 w-10",
} as const;

export default function GloveMark({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return <span aria-hidden="true" className={`glove-mark shrink-0 ${SIZES[size]} ${className}`} />;
}

/** A hairline section divider with the glove set into the middle of it. */
export function GloveRule({ className = "" }: { className?: string }) {
  return (
    <div className={`glove-rule ${className}`} role="presentation">
      <GloveMark size="sm" />
    </div>
  );
}

/**
 * An unordered list that uses the mark as its bullet. Pass `onNavy` when the
 * list sits on a dark background, so each mark gets a hairline edge to sit
 * against instead of blending into it.
 */
export function GloveList({
  items,
  onNavy = false,
  className = "",
}: {
  items: React.ReactNode[];
  onNavy?: boolean;
  className?: string;
}) {
  return (
    <ul className={`glove-list ${onNavy ? "glove-on-navy" : ""} ${className}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
