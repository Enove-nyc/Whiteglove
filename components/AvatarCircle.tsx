/**
 * The one initials-or-photo circle for a person, anywhere one is shown — the
 * account's Details section today, beside a published review tomorrow. One
 * component so the same person looks the same everywhere, rather than each
 * screen drawing its own circle a shade off.
 *
 * No photo means initials in navy on cream lettering, not a grey silhouette:
 * most accounts will never upload a picture, so the fallback is the common
 * case and has to look deliberate.
 */

/**
 * "Rivka Neuman" → "RN", "Rivka" → "R", nothing usable → "?".
 *
 * First letters of the first and last word only — a middle name or a title in
 * between should not widen the circle. Spread before indexing so a letter
 * outside the basic plane (a Hebrew name, an emoji someone typed) is taken
 * whole instead of as half a surrogate pair.
 */
export function initialsFor(name?: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = [...words[0]][0] ?? "";
  const last = words.length > 1 ? [...words[words.length - 1]][0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || "?";
}

export default function AvatarCircle({
  name,
  imageUrl,
  size = 40,
}: {
  name?: string;
  imageUrl?: string;
  size?: number;
}) {
  const label = name?.trim() || "Profile picture";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-[var(--navy)] font-semibold text-[var(--cream)]"
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) }}
    >
      {imageUrl ? (
        // The media store serves raw bytes from /api/media; next/image would
        // re-proxy a small immutable circle for nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsFor(name)
      )}
    </span>
  );
}
