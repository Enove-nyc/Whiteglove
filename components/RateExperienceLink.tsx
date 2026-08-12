"use client";

import { useState } from "react";
import ExperienceRatingForm from "@/components/ExperienceRatingForm";
import { rateHref, type RatingKind } from "@/lib/experience-ratings";

/**
 * A quiet door into rating a listing or place, on the card itself.
 *
 * Expands in place so the directory does not turn into a wall of forms. The
 * same form lives on /rate for trips and for links from elsewhere.
 */

export default function RateExperienceLink({
  kind,
  refId,
  label,
}: {
  kind: RatingKind;
  refId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mb-1 text-sm font-semibold text-stone-500 underline decoration-[var(--gold-light)] underline-offset-4"
        >
          Close
        </button>
        <ExperienceRatingForm kind={kind} refId={refId} label={label} compact />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
    >
      Rate how this went
    </button>
  );
}

/** Same door as a plain link, for places that should not open a form in-page. */
export function ratePageHref(kind: RatingKind, refId: string, label: string) {
  return rateHref({ kind, ref: refId, label });
}
