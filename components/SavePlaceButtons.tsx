"use client";

import { useEffect, useState } from "react";
import { useSaveAuth } from "@/components/SaveAuthProvider";
import { fetchAccountPlaces, PLACES_EVENT } from "@/lib/account-trip-client";
import { ADD_TO_ROUTE_LABEL, SAVE_ACCOUNT_BENEFIT } from "@/lib/save-copy";
import { useSignedIn } from "@/lib/use-signed-in";
import type { SavedPlace } from "@/data/route-utils";

/**
 * Add a kever or heritage stop to the account route.
 *
 * Both need an account. They used to write to this browser and then tell the
 * account, which left a signed-out visitor looking at "Added" while nothing
 * was kept anywhere they could get it back from.
 */

export default function SavePlaceButtons({ place }: { place: SavedPlace }) {
  const signedIn = useSignedIn();
  const { requireSave, busy } = useSaveAuth();
  const [inRoute, setInRoute] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (!signedIn) {
      setInRoute(false);
      setFavorite(false);
      return;
    }
    const sync = () => {
      void fetchAccountPlaces().then((places) => {
        if (!places) return;
        setInRoute(places.route.some((item) => item.id === place.id));
        setFavorite(places.favorites.some((item) => item.id === place.id));
      });
    };
    sync();
    window.addEventListener(PLACES_EVENT, sync);
    return () => window.removeEventListener(PLACES_EVENT, sync);
  }, [place.id, signedIn]);

  if (signedIn === null) return <div className="mt-6 h-[44px]" aria-hidden="true" />;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            requireSave(
              inRoute
                ? { type: "remove-place-from-route", placeId: place.id, name: place.name }
                : { type: "add-place-to-route", place },
            )
          }
          aria-pressed={inRoute}
          className={`inline-flex min-h-11 items-center border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition disabled:opacity-60 ${inRoute ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}
        >
          {busy ? "Saving…" : inRoute ? "Added to route" : ADD_TO_ROUTE_LABEL}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            requireSave(favorite ? { type: "remove-favorite", placeId: place.id } : { type: "add-favorite", place })
          }
          aria-pressed={favorite}
          className={`inline-flex min-h-11 items-center border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition disabled:opacity-60 ${favorite ? "border-[var(--gold)] bg-[var(--gold)] text-white" : "border-[var(--gold-light)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}
        >
          {busy ? "Saving…" : favorite ? "Saved" : "Save destination"}
        </button>
      </div>
      {signedIn === false && <p className="mt-3 text-sm leading-6 text-stone-600">{SAVE_ACCOUNT_BENEFIT}</p>}
    </div>
  );
}
