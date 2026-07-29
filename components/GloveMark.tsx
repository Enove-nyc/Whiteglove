// The complete hand-and-compass mark from the White Glove logo, reused as a
// small brand mark throughout the site. The shared CSS uses the same artwork as
// the site's app icon, so bullets, headings, and dividers all match the logo.

const SIZES = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
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
 * An unordered list that uses the logo mark as its bullet. `onNavy` remains in
 * the public API for existing callers; the mark already carries its navy tile.
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
