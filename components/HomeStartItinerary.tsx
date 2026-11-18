"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GUEST_TRIP_KEY } from "@/lib/guest-trip";

/**
 * "Start your itinerary" on the home page (the owner's design, 18 November 2026).
 *
 * The home page is only ever shown signed out — a signed-in visitor is sent to
 * their own trips (app/page.tsx) — so this starts the no-account planner: the
 * name goes into the trip kept in this browser, and the planner opens on it.
 *
 * A TRIP ALREADY UNDER WAY IS NEVER REPLACED. If this browser holds a trip with
 * anything on it, the planner simply opens on that; a name typed here does not
 * wipe out somebody's dates and stops.
 */
export default function HomeStartItinerary() {
  const router = useRouter();
  const [name, setName] = useState("");

  function start(event: React.FormEvent) {
    event.preventDefault();
    try {
      const raw = window.localStorage.getItem(GUEST_TRIP_KEY);
      const saved = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      const hasSomething =
        saved &&
        Boolean(
          saved.startDate ||
            (Array.isArray(saved.flights) && saved.flights.length) ||
            (Array.isArray(saved.lodging) && saved.lodging.length) ||
            (Array.isArray(saved.activities) && saved.activities.length),
        );
      if (!hasSomething) {
        window.localStorage.setItem(GUEST_TRIP_KEY, JSON.stringify({ ...(saved ?? {}), title: name.trim().slice(0, 120) }));
      }
    } catch {
      // No storage (a private window): the planner still opens, blank.
    }
    router.push("/itinerary");
  }

  return (
    <form onSubmit={start} className="mt-6 flex flex-col gap-3 sm:flex-row">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Trip name (optional)</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Trip name (optional)"
          maxLength={120}
          className="min-h-12 w-full rounded-lg border border-[#D9D2C4] !bg-white px-4 text-[15px] text-[var(--ink)] outline-none placeholder:text-stone-500 focus:border-[var(--navy)] focus:ring-1 focus:ring-[var(--navy)]"
        />
      </label>
      <button
        type="submit"
        className="min-h-12 shrink-0 rounded-lg bg-[var(--navy)] px-6 text-[15px] font-semibold text-white transition hover:bg-[var(--navy-deep)]"
      >
        Create itinerary
      </button>
    </form>
  );
}
