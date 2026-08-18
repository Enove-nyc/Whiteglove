"use client";

import { AddedToTrip, useAddToItinerary, type TripStop } from "@/components/useAddToItinerary";

/**
 * Put one place on the traveler's trip, from an attraction card.
 *
 * The work — read the account, ask which trip when there is more than one, add
 * the stop without a day — lives in useAddToItinerary so that this button, the
 * suitcase on a detail page and the suitcase on a destination page all behave
 * the same. See components/useAddToItinerary.tsx for why each of those rules
 * is there.
 */
export default function AddToItineraryButton({
  place,
  label = "Add to my itinerary",
  className = "",
}: {
  place: TripStop;
  label?: string;
  className?: string;
}) {
  const { start, dialog, phase } = useAddToItinerary();

  if (phase.kind === "added") {
    return (
      <>
        <AddedToTrip tripName={phase.tripName} className={className} />
        {dialog}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={phase.kind === "working"}
        onClick={() => start(place)}
        className={`inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 disabled:opacity-60 ${className}`}
      >
        {phase.kind === "working" ? "Adding…" : phase.kind === "failed" ? "That did not save — try again" : label}
      </button>
      {dialog}
    </>
  );
}
