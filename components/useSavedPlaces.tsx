"use client";

import { useCallback, useEffect, useState } from "react";
import type { SavedPlace } from "@/data/route-utils";

/**
 * WHAT THIS ACCOUNT HAS SAVED, read once for a whole list.
 *
 * A directory can be a hundred rows. A save button that asked the server
 * whether its own row was saved would be a hundred requests to draw one page,
 * so the list is read once and shared: module state, one request in flight at
 * a time however many buttons mount, and every button re-rendered when it
 * lands.
 *
 * THE ACCOUNT IS THE TRUTH HERE, not the browser. The older save buttons write
 * to localStorage first and sync the account quietly afterwards, which is why
 * the two can disagree and why a place saved on a phone was not on the laptop.
 * These are account-first: signing in is what saving MEANS on this site, and
 * carrying a place between devices is the reason somebody made an account.
 */

let cache: SavedPlace[] | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

async function load(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { data?: { favorites?: SavedPlace[] } | null } | null;
      cache = data?.data?.favorites ?? [];
    } catch {
      // Signed out, or offline. An empty list means every button draws as "not
      // saved", which is the honest thing to show when nothing can be read.
      cache = [];
    } finally {
      inFlight = null;
      announce();
    }
  })();
  return inFlight;
}

export function useSavedPlaces() {
  const [, bump] = useState(0);

  useEffect(() => {
    const listener = () => bump((n) => n + 1);
    listeners.add(listener);
    if (cache === null) void load();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const isSaved = useCallback((id: string) => (cache ?? []).some((place) => place.id === id), []);

  /**
   * Save or unsave, showing the change immediately and putting it back if the
   * server refuses. A heart that stays filled after a failed save is a lie the
   * traveller only discovers on another device.
   */
  const toggle = useCallback(async (place: SavedPlace): Promise<boolean> => {
    const before = cache ?? [];
    const wasSaved = before.some((item) => item.id === place.id);
    cache = wasSaved ? before.filter((item) => item.id !== place.id) : [...before, place];
    announce();
    try {
      const res = await fetch("/api/account/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection: "favorites", action: "toggle", place }),
      });
      if (!res.ok) throw new Error("refused");
      return !wasSaved;
    } catch {
      cache = before;
      announce();
      return wasSaved;
    }
  }, []);

  return { ready: cache !== null, isSaved, toggle };
}
