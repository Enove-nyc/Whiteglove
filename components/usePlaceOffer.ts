"use client";

import { useCallback, useState } from "react";
import type { ItinActivity, ItinLodging } from "@/data/itinerary";
import { type TripPlace, offerKey, worthOffering } from "@/lib/place-offers";

/**
 * Decides whether to ask about a place, and remembers the answer.
 *
 * ASKED AT THE MOMENT IT IS ADDED, and nowhere else. Somebody who has just
 * typed a hotel in has it in mind; a notice that appears twenty minutes later,
 * or a list of them on the way out, is the site interrupting rather than
 * asking. One place, once, while they are looking at it.
 *
 * NOTHING HAPPENS WITHOUT A PRESS, and the check that decides whether to ask
 * sends nothing but a name — see app/api/places/unknown. Their trip stays where
 * it is either way.
 *
 * A NO IS FINAL. It is kept in this browser, keyed by the place rather than by
 * the stop, so the same hotel on next year's trip does not ask again. Being
 * asked twice is how a fair question turns into nagging — and somebody who has
 * said no once and is asked again learns that saying no does not work.
 */

const ASKED = "whiteGlovePlaceOffersAnswered";

function answeredAlready(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ASKED);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function remember(key: string) {
  try {
    localStorage.setItem(ASKED, JSON.stringify({ ...answeredAlready(), [key]: true }));
  } catch {
    // A full or blocked storage means they may be asked again on this device.
    // Annoying, and better than losing the trip over it.
  }
}

/** A stop as a place, carrying nothing of the day it sits on. */
export function placeFromStop(a: ItinActivity): TripPlace {
  return {
    id: a.id,
    kind: "stop",
    name: a.name?.trim() ?? "",
    address: a.address?.trim() || undefined,
    coordinates: a.coordinates?.trim() || undefined,
    country: a.country?.trim() || undefined,
    href: a.href?.trim() || undefined,
    phone: a.phone?.trim() || undefined,
  };
}

/** A stay as a place, carrying neither the nights nor the booking reference. */
export function placeFromStay(l: ItinLodging): TripPlace {
  return {
    id: l.id,
    kind: "stay",
    name: l.name?.trim() ?? "",
    address: l.address?.trim() || undefined,
    coordinates: l.coordinates?.trim() || undefined,
    phone: l.phone?.trim() || undefined,
  };
}

export function usePlaceOffer(canAsk: boolean) {
  const [offering, setOffering] = useState<TripPlace | null>(null);

  /**
   * Called when a stop or a stay has just been added.
   *
   * Everything that would stop the question is checked here rather than on the
   * server: not signed in, not really a place, already answered. Only what
   * survives all three costs a request, and that request carries one name.
   */
  const consider = useCallback(
    async (place: TripPlace) => {
      if (!canAsk || !worthOffering(place)) return;
      if (answeredAlready()[offerKey(place)]) return;
      try {
        const response = await fetch("/api/places/unknown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: [place.name] }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { unknown?: string[] };
        // Nothing is offered unless the site really has not got it. Being asked
        // about a kever that is already on the site reads as the site not
        // knowing its own contents.
        if (data.unknown?.includes(place.name)) setOffering(place);
      } catch {
        // Offline, or the check failed. Say nothing — a question we cannot
        // stand behind is worse than no question.
      }
    },
    [canAsk],
  );

  /**
   * The question has been answered — either way.
   *
   * Yes and no are remembered identically and on purpose: having sent a place
   * in is at least as good a reason not to be asked about it again as having
   * refused. Which it was does not need recording here, because nothing on
   * this side behaves differently; the sending already happened in the notice.
   */
  const answer = useCallback(() => {
    setOffering((current) => {
      if (current) remember(offerKey(current));
      return null;
    });
  }, []);

  return { offering, consider, answer };
}
