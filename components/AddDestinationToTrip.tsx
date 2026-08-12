"use client";

import { useSaveAuth } from "@/components/SaveAuthProvider";
import { activityFromPlace } from "@/lib/account-trip-client";
import { ADD_TO_TRIP_LABEL, SAVE_ACCOUNT_BENEFIT } from "@/lib/save-copy";
import { useSignedIn } from "@/lib/use-signed-in";
import type { SavedPlace } from "@/data/route-utils";

/**
 * Add a vacation destination to the signed-in trip.
 *
 * Used to be a link into /plan. Planning is still there; this button is the
 * save. Signed out it opens the account modal and, after sign-in, adds the
 * destination once without asking them to press it again.
 */
export default function AddDestinationToTrip({
  place,
  label,
  className,
  showBenefit = false,
}: {
  place: SavedPlace;
  label?: string;
  className?: string;
  showBenefit?: boolean;
}) {
  const signedIn = useSignedIn();
  const { requireSave, busy } = useSaveAuth();
  const text = label ?? `Add ${place.name} to a trip`;

  if (signedIn === null) {
    return <span className="inline-block h-11 min-w-[12rem]" aria-hidden="true" />;
  }

  return (
    <span className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => requireSave({ type: "add-activity-to-trip", activity: activityFromPlace(place) })}
        className={
          className ??
          "inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--surface)] disabled:opacity-60"
        }
      >
        {busy ? "Saving…" : text}
      </button>
      {showBenefit && signedIn === false && (
        <span className="max-w-sm text-sm leading-6 text-stone-600">{SAVE_ACCOUNT_BENEFIT}</span>
      )}
      <span className="sr-only">{ADD_TO_TRIP_LABEL}</span>
    </span>
  );
}
