"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { useRequireSignIn } from "@/components/SignInGate";
import { useSavedPlaces } from "@/components/useSavedPlaces";
import type { SavedPlace } from "@/data/route-utils";

/**
 * SAVE THIS PLACE — on the listings that never had it.
 *
 * Destinations, towns and batei hachaim could be saved. A restaurant, a shul,
 * a mikvah, a hotel and an attraction could not, which are the things somebody
 * is actually collecting while they plan. They are list rows rather than pages
 * of their own, so the control lives on the row.
 *
 * IT ASKS FOR THE ACCOUNT AT THE MOMENT IT IS WORTH SOMETHING, and not before.
 * Nothing about signing in is mentioned until somebody reaches for the heart —
 * then the existing prompt appears, saying what it is for, and the save they
 * asked for completes on the other side of it rather than being forgotten. No
 * wall in front of browsing, and no banner asking anybody to make an account
 * for a reason nobody has given them yet.
 */
export function SaveListingButton({ place, what = "place" }: { place: SavedPlace; what?: string }) {
  const requireSignIn = useRequireSignIn();
  const { ready, isSaved, toggle } = useSavedPlaces();
  const [busy, setBusy] = useState(false);

  const saved = isSaved(place.id);

  function press() {
    // The reason, in the words of the thing being saved — "Sign in to save this
    // restaurant" tells somebody what they get, where a bare "Sign in" asks
    // them to guess.
    requireSignIn(() => {
      setBusy(true);
      void toggle(place).finally(() => setBusy(false));
    }, `Sign in to save this ${what}`);
  }

  return (
    <button
      type="button"
      onClick={press}
      disabled={busy}
      aria-pressed={saved}
      // The state is in the label as well as the fill, so it is not colour
      // alone that says whether this is saved.
      aria-label={saved ? `Saved — remove this ${what}` : `Save this ${what}`}
      title={saved ? "Saved" : "Save"}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--gold-ink)] transition-colors hover:bg-[var(--cream)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] disabled:opacity-60"
    >
      {/* Until the account's list has been read, the outline is shown rather
          than a guess — a heart that fills in a moment after the page settles
          is worse than one that was simply right. */}
      <Icon name={ready && saved ? "heart-filled" : "heart"} className="h-5 w-5" />
    </button>
  );
}
