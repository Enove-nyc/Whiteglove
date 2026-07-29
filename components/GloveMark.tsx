// The hand-and-compass artwork from the White Glove logo, isolated on a
// transparent background so it can sit directly on the site's gold surfaces
// without an app-icon tile or surrounding box.

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
 * the public API for existing callers.
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
