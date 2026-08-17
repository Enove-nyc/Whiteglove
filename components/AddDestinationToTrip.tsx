"use client";

import { useState } from "react";
import { useRequireSignIn } from "@/components/SignInGate";

/**
 * "Add Rome to a trip", as an action rather than a signpost.
 *
 * IT USED TO BE A LINK TO /plan. A visitor pressed a button that said it
 * would add this destination to a trip and arrived at the recommendations
 * questionnaire instead — nothing added, nothing saved, and no sign-in asked
 * for, while the icon row a few inches above it gated the same intent
 * properly. It was the one trip action on the site that could be taken
 * without an account, because it never actually did anything.
 *
 * Now it adds the destination to the account's own trip, behind the same
 * dialog as everything else. Signed out, the dialog opens and the add runs
 * the moment sign-in succeeds — the destination they pressed on is held in
 * the closure, so it is still the right one on the other side.
 */
export default function AddDestinationToTrip({
  name,
  href,
  className,
}: {
  name: string;
  /** The destination's own page, so the trip stop can link back to it. */
  href: string;
  className?: string;
}) {
  const requireSignIn = useRequireSignIn();
  const [state, setState] = useState<"idle" | "saving" | "added" | "failed">("idle");

  async function add() {
    setState("saving");
    try {
      const res = await fetch("/api/account/itinerary", { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      const itinerary = data?.itinerary ?? {
        title: "My trip",
        startDate: "",
        endDate: "",
        flights: [],
        lodging: [],
        activities: [],
      };
      const already = (itinerary.activities ?? []).some(
        (activity: { name?: string }) => activity.name?.toLowerCase() === name.toLowerCase(),
      );
      if (!already) {
        itinerary.activities = [
          ...(itinerary.activities ?? []),
          {
            id: `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            href,
            date: itinerary.startDate || "",
            bookedOnSite: false,
          },
        ];
        const saved = await fetch("/api/account/itinerary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itinerary }),
        });
        if (!saved.ok) {
          setState("failed");
          return;
        }
      }
      setState("added");
    } catch {
      setState("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={() => requireSignIn(add, "Sign in to add this to your trip")}
      className={className}
      disabled={state === "saving"}
    >
      {state === "added"
        ? `${name} is on your trip`
        : state === "failed"
          ? "Try that again"
          : state === "saving"
            ? "Adding…"
            : `Add ${name} to a trip`}
    </button>
  );
}
