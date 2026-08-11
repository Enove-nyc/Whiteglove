"use client";

import { useEffect, useMemo, useState } from "react";
import { allHechsherim, UNVERIFIED, type Hechsher, type HechsherStatus } from "@/data/hechsherim";

/**
 * What the owner has confirmed about each of these places.
 *
 * Results are limited to White Glove listing IDs. Until a recorded status
 * arrives, callers get the neutral default instead of a made-up certification.
 */
export function useHechsherim(placeIds: string[]): { statuses: Record<string, HechsherStatus>; agencies: Hechsher[] } {
  const key = useMemo(() => [...new Set(placeIds.filter(Boolean))].sort().join(","), [placeIds]);
  const [loaded, setLoaded] = useState<{ key: string; map: Record<string, HechsherStatus>; agencies: Hechsher[] }>({
    key: "",
    map: {},
    agencies: allHechsherim(),
  });

  useEffect(() => {
    if (!key) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/kosher/hechsherim?ids=${encodeURIComponent(key)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (live && data?.hechsherim) setLoaded({ key, map: data.hechsherim, agencies: allHechsherim(data.agencies) });
      } catch {
        /* everything stays unverified, which is the safe reading */
      }
    })();
    return () => {
      live = false;
    };
  }, [key]);

  return loaded.key === key ? { statuses: loaded.map, agencies: loaded.agencies } : { statuses: {}, agencies: loaded.agencies };
}

/**
 * One White Glove listing's stored hechsher, or the neutral default when no
 * editorial status has been recorded.
 */
export function hechsherOf(
  confirmed: Record<string, HechsherStatus>,
  place: { id: string },
  _agencies?: Hechsher[],
): HechsherStatus {
  return confirmed[place.id] ?? UNVERIFIED;
}
