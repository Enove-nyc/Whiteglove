"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Itinerary } from "@/data/itinerary";

const LS_KEY = "whiteGloveItinerary";

// Actions on a shared (read-only) itinerary: print it, or copy it into the
// viewer's own planner. Copying never silently overwrites — it confirms first
// if the viewer already has a trip in progress.
export default function SharedItineraryActions({ itinerary }: { itinerary: Itinerary }) {
  const router = useRouter();
  const [note, setNote] = useState("");

  function copyToPlanner() {
    try {
      const existing = localStorage.getItem(LS_KEY);
      let hasTrip = false;
      if (existing) {
        const parsed = JSON.parse(existing) as Partial<Itinerary>;
        hasTrip = Boolean((parsed.flights?.length || parsed.lodging?.length || parsed.activities?.length));
      }
      if (hasTrip && !window.confirm("This will replace the trip currently in your planner. Continue?")) return;
      // Strip any share/account linkage so it becomes the viewer's own copy.
      const copy: Itinerary = { ...itinerary, title: itinerary.title ? `${itinerary.title} (copy)` : "My trip" };
      localStorage.setItem(LS_KEY, JSON.stringify(copy));
      setNote("Copied to your planner…");
      router.push("/itinerary");
    } catch {
      setNote("Couldn't copy — please try again.");
    }
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => window.print()} className="border border-[var(--gold)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Print / Save as PDF</button>
      <button type="button" onClick={copyToPlanner} className="border border-[var(--navy)] bg-[var(--navy)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">Copy into my planner</button>
      {note && <span className="text-xs font-semibold text-emerald-700">{note}</span>}
    </div>
  );
}
