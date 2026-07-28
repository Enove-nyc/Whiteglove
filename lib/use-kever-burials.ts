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
export function useKeverBurials(activities: ItinActivity[]): Record<string, string[]> {
  const slugs = useMemo(
    () => [...new Set(activities.map((a) => a.keverSlug).filter((s): s is string => Boolean(s)))].sort(),
    [activities],
  );
  const key = slugs.join(",");
  const [burials, setBurials] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!key) {
      setBurials({});
      return;
    }
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/kevarim/burials?slugs=${encodeURIComponent(key)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (live && data?.burials) setBurials(data.burials);
      } catch {
        /* the stop still renders without the names */
      }
    })();
    return () => {
      live = false;
    };
  }, [key]);

  return burials;
}

/** "Noam Elimelech, the Bach and 4 more" — a whole ohel on one line. */
export function burialSummary(names: string[], max = 3): string {
  if (!names.length) return "";
  if (names.length <= max) {
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }
  return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}
