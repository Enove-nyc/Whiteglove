"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Itinerary } from "@/data/itinerary";
import { shiftItinerary } from "@/data/sample-itineraries";
import { GUEST_TRIP_KEY } from "@/lib/guest-trip";

/**
 * "Use this itinerary" on a sample itinerary.
 *
 * Signed in: the sample becomes a NEW trip on the account and opens — nothing
 * already there is touched (the trips route's "import"). Not signed in: it
 * becomes the trip kept in this browser, the same place the guest planner keeps
 * its own, and the visitor is asked first if that would replace one.
 *
 * The dates move to start a month from today, so the copy is a plan for a
 * trip that can still happen rather than a week in the past.
 */
export default function SampleCopyButton({ itinerary }: { itinerary: Itinerary }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    setBusy(true);
    setError("");
    const start = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const trip = shiftItinerary(itinerary, start);
    try {
      const response = await fetch("/api/account/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", itinerary: trip, name: trip.title }),
      });
      if (response.ok) {
        router.push("/itinerary");
        return;
      }
      if (response.status !== 401) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "The trip could not be copied. Please try again.");
        setBusy(false);
        return;
      }
    } catch {
      /* not signed in, or offline: keep it in this browser */
    }
    try {
      const existing = JSON.parse(window.localStorage.getItem(GUEST_TRIP_KEY) || "null") as Partial<Itinerary> | null;
      const hasTrip = Boolean(existing && ((existing.activities?.length ?? 0) + (existing.lodging?.length ?? 0) + (existing.flights?.length ?? 0) > 0));
      if (hasTrip && !window.confirm("This replaces the trip you have in this browser. Copy the sample anyway?")) {
        setBusy(false);
        return;
      }
      window.localStorage.setItem(GUEST_TRIP_KEY, JSON.stringify(trip));
      router.push("/itinerary");
    } catch {
      setError("This browser could not save the trip. Check that site storage is allowed.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void copy()}
        disabled={busy}
        className="inline-flex min-h-12 items-center rounded-lg bg-[var(--navy)] px-5 text-[15px] font-semibold text-white transition hover:bg-[var(--navy-deep)] disabled:opacity-60"
      >
        {busy ? "Copying…" : "Use this itinerary"}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
