// Loading Google's map script, once per page.
//
// The Maps JavaScript API runs in the browser, so its key is necessarily
// public — it goes out in the page like any other script URL and there is no
// way to hide it. That is a different kind of key from the one this site keeps
// on the server for the Routes API, and the two must not be the same:
//
//   GOOGLE_MAPS_API_KEY              server only, Routes API, never sent out
//   NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY   public, Maps JavaScript API only
//
// A browser key is protected by restriction rather than by secrecy: lock it to
// the Maps JavaScript API and to your own hostnames in the Google console, and
// somebody copying it out of the page cannot spend your quota anywhere else.
// Reusing the server key here would hand out Routes API access to anyone who
// opened the page source.
//
// With no browser key set, this reports so and the map falls back to
// OpenStreetMap tiles, which need no key at all.

import { cleanKey } from "@/lib/api-key";

/**
 * Just enough of Google's map to draw ours.
 *
 * Written out here rather than adding @types/google.maps: this is the whole
 * surface the site touches, and a hand-written shim of twenty lines is easier
 * to check than a dependency of several thousand.
 */
export type LatLng = { lat: number; lng: number };

export type GMap = {
  setCenter(position: LatLng): void;
  setZoom(zoom: number): void;
};

export type GMarker = {
  setMap(map: GMap | null): void;
  addListener(event: string, handler: () => void): void;
};

export type GInfoWindow = {
  setContent(content: string): void;
  open(options: { map: GMap; anchor: GMarker }): void;
  close(): void;
};

export type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GMap;
  Marker: new (options: Record<string, unknown>) => GMarker;
  InfoWindow: new (options?: Record<string, unknown>) => GInfoWindow;
  SymbolPath: { CIRCLE: number };
};

type MapsGlobal = { maps?: GoogleMapsApi };

/** The loaded API, or null when it is not there. */
export function googleMaps(): GoogleMapsApi | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { google?: MapsGlobal }).google?.maps ?? null;
}

let pending: Promise<boolean> | null = null;

export function googleMapsBrowserKey(): string | null {
  // Read as a literal so Next inlines it at build time, then cleaned — a key
  // pasted with an invisible character in it would otherwise go into the script
  // URL percent-encoded, and Google would answer InvalidKey with no hint why.
  // See lib/api-key.ts.
  return cleanKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY);
}

export function googleMapsAvailable(): boolean {
  return googleMapsBrowserKey() !== null;
}

/**
 * The variable is set, but what is in it is not a key.
 *
 * Worth distinguishing from "not set at all": cleanKey refuses a value with a
 * character that cannot be in a key, and without this the diagnostic would tell
 * the owner to add a variable they can plainly see is already there.
 */
export function googleMapsBrowserKeyMalformed(): boolean {
  const raw = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  return Boolean(raw && raw.trim()) && cleanKey(raw) === null;
}

/**
 * Load the script and resolve true once google.maps is usable.
 *
 * Resolves false rather than throwing when there is no key, or when the script
 * cannot be reached — the caller then draws the OpenStreetMap map instead, and
 * the visitor still gets a map.
 */
export function loadGoogleMaps(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (googleMaps()?.Map) return Promise.resolve(true);

  const key = googleMapsBrowserKey();
  if (!key) return Promise.resolve(false);

  // One load per page, however many maps ask for it.
  pending ??= new Promise<boolean>((resolve) => {
    const id = "google-maps-js";
    const done = () => resolve(Boolean(googleMaps()?.Map));

    const already = document.getElementById(id) as HTMLScriptElement | null;
    if (already) {
      already.addEventListener("load", done, { once: true });
      already.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&loading=async&v=weekly`;
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(script);
  });

  return pending;
}
