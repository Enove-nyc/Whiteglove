"use client";

import { useState } from "react";
import { describeHechsher, getHechsher, hechsherLabel, HECHSHERIM, type Hechsher, type HechsherStatus } from "@/data/hechsherim";

// The little round mark beside a kosher place.
//
// The circle is where the agency's logo goes. Where there is no logo file yet,
// it carries the agency's own short form — OU, ★K, בד״ץ — which is how these
// are written on a package anyway.
//
// Four states, and the difference between them matters far more than the
// design does:
//
//   • certified  — the owner confirmed it. Gold circle, solid.
//   • reported   — something says so and the source is named, but nobody here
//                  has checked. The mark is shown so the traveler knows what
//                  to look for, in a dashed circle, labelled unverified.
//   • none       — confirmed as carrying nothing. Said plainly.
//   • unverified — nobody has looked. A dashed circle with a question mark.
//
// An empty circle is not a hechsher, and this never pretends otherwise.

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
  // Most agencies have no logo file yet. The letters are shown until one
  // appears, and if a file is added but fails to load we fall back to them
  // rather than leaving a broken image in the circle.
  const [logoFailed, setLogoFailed] = useState(false);
  const hechsher = getHechsher(status.hechsherId, agencies);
  const title = describeHechsher(status, agencies);
  const label = hechsherLabel(status, agencies);
  // An uploaded picture wins over the file that ships with the site, so
  // replacing a mark does not mean editing the repository.
  const logoSrc = hechsher ? (hechsher.logo ?? `/hechsherim/${hechsher.id}.svg`) : null;
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
        : { ring: "border-dashed border-amber-400", ink: "text-amber-700", text: "text-amber-800" };

  const inside = confirmed || reported ? mark || "✓" : status.state === "none" ? "—" : "?";

  return (
    <span className="inline-flex items-center gap-2" title={title}>
      <span
        className={`${circle} ${tone.ring} ${tone.ink}`}
        style={{ width: px, height: px, fontSize: inside.length > 2 ? markSize - 2 : markSize }}
        aria-hidden="true"
      >
        {hechsher && (confirmed || reported) && !logoFailed ? (
          /* eslint-disable-next-line @next/next/no-img-element -- a plain img
             so onError can fall back to the letters; these are tiny local SVGs
             with nothing for the image optimizer to do. */
          <img
            src={logoSrc ?? ""}
            alt=""
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
