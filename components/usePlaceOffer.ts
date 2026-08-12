"use client";

import { useCallback, useRef, useState } from "react";
import type { ItinActivity, ItinLodging } from "@/data/itinerary";
import { type TripPlace, offerKey, placesStillToAsk } from "@/lib/place-offers";

/**
 * Decides whether to ask about a place, and remembers the answer.
 *
 * ASKED WHEN THE PLACE IS IN FRONT OF THEM. A stop just typed in is one
 * moment; opening a trip that was built before this question existed is the
 * other. One place at a time, never a list — a list on the way out is the
 * site interrupting rather than asking.
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
  const seen = useRef(new Set<string>());
  const queue = useRef<TripPlace[]>([]);

  /**
   * Check a list of places and offer the first one the site does not have.
   *
   * One request for the whole list. Further unknowns wait in a queue and are
   * asked one at a time after the current question is answered — never as a
   * pile of notices.
   */
  const considerExisting = useCallback(
    async (places: TripPlace[]) => {
      if (!canAsk) return;
      const pending = placesStillToAsk(places, answeredAlready()).filter((place) => {
        if (seen.current.has(place.id)) return false;
        seen.current.add(place.id);
        return true;
      });
      if (pending.length === 0) return;
      try {
        const response = await fetch("/api/places/unknown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: pending.map((place) => place.name) }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { unknown?: string[] };
        const unknown = new Set(data.unknown ?? []);
        const missing = pending.filter((place) => unknown.has(place.name));
        if (missing.length === 0) return;
        setOffering((current) => {
          if (current) {
            queue.current = [...queue.current, ...missing];
            return current;
          }
          queue.current = missing.slice(1);
          return missing[0] ?? null;
        });
      } catch {
        // Offline, or the check failed. Say nothing — a question we cannot
        // stand behind is worse than no question.
      }
    },
    [canAsk],
  );

  const consider = useCallback((place: TripPlace) => considerExisting([place]), [considerExisting]);

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
      return queue.current.shift() ?? null;
    });
  }, []);

  return { offering, consider, considerExisting, answer };
}
