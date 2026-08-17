"use client";

import { useState } from "react";
import { describeHechsher, getHechsher, hechsherLabel, HECHSHERIM, type Hechsher, type HechsherStatus } from "@/data/hechsherim";

// The little round mark beside a kosher place.
//
// The circle is where the agency's logo goes. Where there is no logo file yet,
// it carries the agency's own short form — OU, ★K, בד״ץ — which is how these
// are written on a package anyway.
//
// Confirmed or source-backed supervision can be shown on a public card:
//
//   • certified  — the owner confirmed it. Gold circle, solid.
//   • reported   — an editorial source names it. The mark is shown as a
//                  prompt to confirm directly before eating.
//   • none       — confirmed as carrying nothing. Said plainly.
//
// A listing with no recorded supervision does not show a placeholder badge.

export default function HechsherBadge({
  status,
  size = "md",
  showLabel = true,
  agencies = HECHSHERIM,
}: {
  status: HechsherStatus;
  size?: "sm" | "md";
  showLabel?: boolean;
  /** The full list, including any the owner has added. Defaults to the built-in one. */
  agencies?: Hechsher[];
}) {
  // If a mark image is missing or fails to load we fall back to the letters
  // rather than leaving a broken image in the circle.
  //
  // THIS HOOK RUNS BEFORE THE BADGE DECIDES IT HAS NOTHING TO DRAW, and has to.
  // A hook after an early return is a hook that runs on some renders and not
  // others, which is the one thing React cannot cope with: the same component
  // going from "unverified" to a real status, or back, would have shifted every
  // later hook by one. There are none after it today, so nothing was visibly
  // broken — it was a trap set for whoever added the next one.
  const [logoFailed, setLogoFailed] = useState(false);

  if (status.state === "unverified") return null;

  const hechsher = getHechsher(status.hechsherId, agencies);
  const title = describeHechsher(status, agencies);
  const label = hechsherLabel(status, agencies);
  // An uploaded picture wins over the file that ships with the site, so
  // replacing a mark does not mean editing the repository. Either way it is
  // loaded lazily: /hechsherim draws every agency at once, and that is a few
  // hundred of these circles on one screen.
  // ONLY THE MAPPING, NEVER A GUESS. This used to fall back to
  // `/hechsherim/{id}.svg` for any agency without a logo field. No agency
  // without one has a file of ANY extension — every mark that ships is named
  // explicitly below — so the guess was seventeen certain 404s on /hechsherim,
  // recovered by onError into the letters that were always going to be drawn.
  // Asking for the letters directly is the same picture without the requests.
  const logoSrc = hechsher?.logo ?? null;
  const px = size === "sm" ? 28 : 36;
  const markSize = size === "sm" ? 9 : 11;

  const circle =
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-white text-center font-bold leading-none";

  // The letters shown when there is no logo file for this agency.
  const mark = hechsher?.mark ?? status.note?.trim().slice(0, 4) ?? "";

  const confirmed = status.state === "certified";
  const reported = status.state === "reported";

  const tone = confirmed
    ? { ring: "border-[var(--gold)]", ink: "text-[var(--navy)]", text: "text-[var(--navy)]" }
    : reported
      ? { ring: "border-dashed border-amber-400", ink: "text-amber-800", text: "text-amber-800" }
      : status.state === "none"
        ? { ring: "border-stone-300", ink: "text-stone-400", text: "text-stone-500" }
        : { ring: "border-stone-300", ink: "text-stone-400", text: "text-stone-500" };

  const inside = confirmed || reported ? mark || "✓" : "—";

  return (
    <span className="inline-flex items-center gap-2" title={title}>
      <span
        className={`${circle} ${tone.ring} ${tone.ink}`}
        style={{ width: px, height: px, fontSize: inside.length > 2 ? markSize - 2 : markSize }}
        aria-hidden="true"
      >
        {hechsher && logoSrc && (confirmed || reported) && !logoFailed ? (
          /* eslint-disable-next-line @next/next/no-img-element -- a plain img
             so onError can fall back to the letters; these are tiny local
             files, already sized for the circle, with nothing for the image
             optimizer to do. */
          <img
            src={logoSrc}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setLogoFailed(true)}
            style={{ maxWidth: "72%", maxHeight: "72%" }}
          />
        ) : (
          <span className="px-0.5">{inside}</span>
        )}
      </span>
      {showLabel && <span className={`text-xs font-semibold ${tone.text}`}>{label}</span>}
      <span className="sr-only">{title}</span>
    </span>
  );
}
