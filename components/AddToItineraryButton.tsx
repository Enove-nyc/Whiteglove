"use client";

import Link from "next/link";
import { useState } from "react";
import { useRequireSignIn } from "@/components/SignInGate";
import { emptyItinerary, type ItinActivity, type Itinerary } from "@/data/itinerary";

/**
 * Put one place on the traveler's trip.
 *
 * IT READS THE TRIP FROM THE ACCOUNT, WHICH IS THE WHOLE POINT OF THIS FILE.
 * The two places that did this before built the new itinerary from
 * localStorage and then posted the result to the account. That was correct
 * while the planner also kept a copy in the browser. It stopped being correct
 * when the planner moved to the account alone, and nothing failed loudly: the
 * browser copy simply went stale, so adding a museum to your trip posted an
 * old itinerary — often an empty one — over the trip you had actually built.
 * One click, and a week of planning replaced by a single museum.
 *
 * So: fetch what the account holds, append, save that. If the account cannot
 * be read the click does nothing and says so, because the alternative is
 * writing over something we could not see.
 */

type Place = {
  id: string;
  name: string;
  yiddishName?: string;
  address?: string;
  coordinates?: string;
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`;

export default function AddToItineraryButton({
  place,
  label = "Add to my itinerary",
  className = "",
}: {
  place: Place;
  label?: string;
  className?: string;
}) {
  const requireSignIn = useRequireSignIn();
  const [state, setState] = useState<"idle" | "saving" | "added" | "failed">("idle");

  async function add() {
    setState("saving");
    try {
      const read = await fetch("/api/account/itinerary");
      if (!read.ok) throw new Error("could not read the trip");
      const data = (await read.json()) as { itinerary?: Itinerary | null };
      const itin: Itinerary = { ...emptyItinerary(), ...(data.itinerary ?? {}) };

      const activity: ItinActivity = {
        id: uid(),
        name: place.name,
        yiddishName: place.yiddishName,
        address: place.address,
        coordinates: place.coordinates,
        // Empty means unscheduled: the planner places it. Guessing a date here
        // would put a stop on a day nobody chose.
        date: "",
        bookedOnSite: false,
      };
      const next: Itinerary = { ...itin, activities: [...(itin.activities ?? []), activity] };

      const saved = await fetch("/api/account/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itinerary: next }),
      });
      if (!saved.ok) throw new Error("could not save the trip");
      setState("added");
    } catch {
      setState("failed");
    }
  }

  if (state === "added") {
    return (
      <Link
        href="/itinerary"
        className={`inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 ${className}`}
      >
        On your itinerary — view it →
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={state === "saving"}
      onClick={() => requireSignIn(() => void add(), "Sign in to add this to your itinerary")}
      className={`inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 disabled:opacity-60 ${className}`}
    >
      {state === "saving" ? "Adding…" : state === "failed" ? "That did not save — try again" : label}
    </button>
  );
}
