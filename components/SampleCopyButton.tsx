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
 * A start date shifts the whole sample. An empty date leaves the plans unscheduled.
 */
export default function SampleCopyButton({ itinerary, templatePath }: { itinerary: Itinerary; templatePath: string }) {
  const router = useRouter();
  const [start, setStart] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function openCopiedTrip() {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "sample_copy", value: templatePath }),
      keepalive: true,
    }).catch(() => undefined);
    router.push("/itinerary?fromSample=1");
  }

  async function copy() {
    setBusy(true);
    setError("");
    const trip = start ? shiftItinerary(itinerary, start) : {
      ...itinerary,
      startDate: "",
      endDate: "",
      lodging: itinerary.lodging.map((stay) => ({ ...stay, checkIn: "", checkOut: "" })),
      activities: itinerary.activities.map((stop) => ({ ...stop, date: "" })),
      flights: itinerary.flights.map((flight) => ({ ...flight, date: "", arriveDate: undefined })),
    };
    try {
      const response = await fetch("/api/account/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", itinerary: trip, name: trip.title }),
      });
      if (response.ok) {
        openCopiedTrip();
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
      openCopiedTrip();
    } catch {
      setError("This browser could not save the trip. Check that site storage is allowed.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block max-w-xs text-sm font-semibold text-[var(--navy)]">
        Trip start date (optional)
        <input type="date" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-[var(--gold-light)] bg-white px-3" />
      </label>
      <p className="text-sm text-stone-600">Leave the date blank if you’re still deciding.</p>
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
