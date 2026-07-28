"use client";

import { useEffect, useMemo, useState } from "react";
import type { ItinActivity } from "@/data/itinerary";

/**
 * Who is buried at each beis hachaim on this itinerary, keyed by kever slug.
 *
 * Looked up rather than stored on the stop: a trip saved before we added a
 * kever to that beis hachaim should still show it, and a correction to a name
 * should reach every itinerary that already exists.
 *
 * Returns an empty map until it loads, so callers render the stop either way.
 */
const EMPTY: Record<string, string[]> = {};

export function useKeverBurials(activities: ItinActivity[]): Record<string, string[]> {
  const slugs = useMemo(
    () => [...new Set(activities.map((a) => a.keverSlug).filter((s): s is string => Boolean(s)))].sort(),
    [activities],
  );
  const key = slugs.join(",");
  // Keyed by the slug list it was fetched for, so a stale answer for a
  // different set of stops is never shown while a new one is in flight.
  const [loaded, setLoaded] = useState<{ key: string; burials: Record<string, string[]> }>({ key: "", burials: {} });

  useEffect(() => {
    if (!key) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/kevarim/burials?slugs=${encodeURIComponent(key)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (live && data?.burials) setLoaded({ key, burials: data.burials });
      } catch {
        /* the stop still renders without the names */
      }
    })();
    return () => {
      live = false;
    };
  }, [key]);

  return loaded.key === key ? loaded.burials : EMPTY;
}

/** "Noam Elimelech, the Bach and 4 more" — a whole ohel on one line. */
export function burialSummary(names: string[], max = 3): string {
  if (!names.length) return "";
  if (names.length <= max) {
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}
