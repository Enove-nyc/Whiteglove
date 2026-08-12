"use client";

import { useEffect, useState } from "react";
import { useSaveAuth } from "@/components/SaveAuthProvider";
import { activityFromPlace, fetchAccountPlaces, PLACES_EVENT } from "@/lib/account-trip-client";
import { ADD_TO_ROUTE_LABEL, ADD_TO_TRIP_LABEL } from "@/lib/save-copy";
import { useSignedIn } from "@/lib/use-signed-in";
import type { SavedPlace } from "@/data/route-utils";

/**
 * One save control. Heritage stops go on the route; vacation stops go on the
 * trip. Signed out, the same button opens the account modal and finishes the
 * add after sign-in.
 */

export default function SaveTripItemButton({
  item,
  label,
  saveAs = "route",
}: {
  item: SavedPlace;
  label?: string;
  saveAs?: "trip" | "route";
}) {
  const signedIn = useSignedIn();
  const { requireSave, busy } = useSaveAuth();
  const [saved, setSaved] = useState(false);
  const idleLabel = label ?? (saveAs === "trip" ? ADD_TO_TRIP_LABEL : ADD_TO_ROUTE_LABEL);
  const doneLabel = saveAs === "trip" ? "Added to trip" : "Added to route";

  useEffect(() => {
    if (!signedIn || saveAs !== "route") {
      if (!signedIn) setSaved(false);
      return;
    }
    const sync = () => {
      void fetchAccountPlaces().then((places) => {
        if (places) setSaved(places.route.some((place) => place.id === item.id));
      });
    };
    sync();
    window.addEventListener(PLACES_EVENT, sync);
    return () => window.removeEventListener(PLACES_EVENT, sync);
  }, [item.id, saveAs, signedIn]);

  if (signedIn === null) return <span className="inline-block h-11 w-[170px]" aria-hidden="true" />;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (saveAs === "trip") {
          requireSave({ type: "add-activity-to-trip", activity: activityFromPlace(item) });
          return;
        }
        requireSave(
          saved
            ? { type: "remove-place-from-route", placeId: item.id, name: item.name }
            : { type: "add-place-to-route", place: item },
        );
      }}
      aria-pressed={saveAs === "route" ? saved : undefined}
      className={`inline-flex min-h-11 items-center border px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] transition disabled:opacity-60 ${saved ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}
    >
      {busy ? "Saving…" : saved ? doneLabel : idleLabel}
    </button>
  );
}
