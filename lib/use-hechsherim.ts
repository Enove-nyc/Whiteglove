"use client";

import { useEffect, useMemo, useState } from "react";
import { allHechsherim, matchHechsher, UNVERIFIED, type Hechsher, type HechsherStatus } from "@/data/hechsherim";

/**
 * What the owner has confirmed about each of these places.
 *
 * Anything not yet confirmed — which is most of them — reads back as
 * unverified, including while this is still loading. That is deliberate: the
 * badge should never flash a hechsher it does not have, and "nobody has
 * checked" is the correct answer until somebody has.
 *
 * Returns a plain object; use `hechsherOf` to read from it so a missing entry
 * comes back as unverified rather than undefined.
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
 * One place's hechsher: what the owner confirmed, else what OpenStreetMap
 * reports, else unverified.
 *
 * The order matters. A confirmation always wins over a map tag, and a map tag
 * is never presented as a confirmation — it comes back as "reported", with OSM
 * named as the source.
 */
export function hechsherOf(
  confirmed: Record<string, HechsherStatus>,
  place: { id: string; reportedHechsher?: string },
  agencies?: Hechsher[],
): HechsherStatus {
  const own = confirmed[place.id];
  if (own) return own;
  if (place.reportedHechsher) {
    // Land it on a known agency where the text names one, so the circle can
    // carry that agency's mark instead of four arbitrary letters.
    const matched = matchHechsher(place.reportedHechsher, agencies);
    return {
      state: "reported",
      hechsherId: matched?.id,
      note: place.reportedHechsher,
      source: "OpenStreetMap",
    };
  }
  return UNVERIFIED;
}
