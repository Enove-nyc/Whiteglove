"use client";

import { useActionState } from "react";
import { removeFlightItineraryAction } from "@/app/admin/flight-itineraries/actions";

/** Removes one saved flight itinerary. Its share link stops working at once. */
export default function FlightItineraryRemoveButton({ id }: { id: string }) {
  const [state, act, busy] = useActionState(removeFlightItineraryAction, null);
  return (
    <form action={act} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={busy}
        className="text-xs font-semibold text-stone-400 transition hover:text-red-700 disabled:opacity-50"
      >
        {busy ? "Removing…" : "Remove"}
      </button>
      {state && !state.ok && <span className="text-xs text-red-700">{state.message}</span>}
    </form>
  );
}
