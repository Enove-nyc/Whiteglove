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
//
// WHY THE CALLBACK, NOT loading=async. The URL used to carry loading=async and
// resolve on the script element's load event. That parameter is for the newer
// importLibrary() loading path; with the classic google.maps.Map constructor
// the load event can fire before Map exists, so the site fell through to
// OpenStreetMap even while Google's script kept finishing in the network tab.
// The documented callback is the moment the classic API is actually usable.

import { cleanKey } from "@/lib/api-key";

/**
 * Just enough of Google's map to draw ours.
 *
 * Written out here rather than adding @types/google.maps: this is the whole
 * surface the site touches, and a hand-written shim of twenty lines is easier
 * to check than a dependency of several thousand.
 */
export type LatLng = { lat: number; lng: number };

export type GLatLngBounds = {
  extend(position: LatLng): GLatLngBounds;
  isEmpty(): boolean;
};

export type GMap = {
  setCenter(position: LatLng): void;
  setZoom(zoom: number): void;
  getZoom?(): number;
  addListener?(event: string, handler: () => void): void;
  /** Frame a box. Used when the map opens on everything rather than a search. */
  fitBounds(bounds: GLatLngBounds, padding?: number): void;
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
  /** For sizing and anchoring a drawn marker icon. */
  Size: new (width: number, height: number) => object;
  Point: new (x: number, y: number) => object;
  LatLngBounds: new () => GLatLngBounds;
};

type MapsGlobal = { maps?: GoogleMapsApi };

/** How long to wait for Google to become usable before giving up. */
export const GOOGLE_MAPS_LOAD_MS = 12_000;

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

type WindowWithMapsHooks = Window & {
  gm_authFailure?: () => void;
  __wgMapsReady?: () => void;
  __wgMapsAuthFailed?: boolean;
};

/** Register once so a late auth failure can flip the public map to OSM. */
export function onGoogleMapsAuthFailure(handler: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const w = window as WindowWithMapsHooks;
  const previous = w.gm_authFailure;
  w.gm_authFailure = () => {
    w.__wgMapsAuthFailed = true;
    previous?.();
    handler();
  };
  return () => {
    if (w.gm_authFailure) {
      // Restore only if nobody else replaced us.
      if (previous) w.gm_authFailure = previous;
      else delete w.gm_authFailure;
    }
  };
}

export function googleMapsAuthFailed(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as WindowWithMapsHooks).__wgMapsAuthFailed);
}

/**
 * Load the script and resolve true once google.maps is usable.
 *
 * Resolves false rather than throwing when there is no key, when the script
 * cannot be reached, when Google never becomes ready in time, or when Google
 * has already refused the key — the caller then draws the OpenStreetMap map
 * instead, and the visitor still gets a map.
 */
export function loadGoogleMaps(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (googleMapsAuthFailed()) return Promise.resolve(false);
  if (googleMaps()?.Map) return Promise.resolve(true);

  const key = googleMapsBrowserKey();
  if (!key) return Promise.resolve(false);

  // One load per page, however many maps ask for it.
  pending ??= new Promise<boolean>((resolve) => {
    const w = window as WindowWithMapsHooks;
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(ok && !w.__wgMapsAuthFailed && Boolean(googleMaps()?.Map));
    };

    const timer = window.setTimeout(() => finish(Boolean(googleMaps()?.Map)), GOOGLE_MAPS_LOAD_MS);

    // Google calls this when the key is refused after the script has loaded.
    // Without it the script looks fine and the map draws blank / watermarked.
    const previousAuth = w.gm_authFailure;
    w.gm_authFailure = () => {
      w.__wgMapsAuthFailed = true;
      previousAuth?.();
      finish(false);
    };

    const id = "google-maps-js";
    const cbName = "__wgMapsReady";
    w[cbName] = () => finish(Boolean(googleMaps()?.Map));

    const already = document.getElementById(id) as HTMLScriptElement | null;
    if (already) {
      if (googleMaps()?.Map) {
        finish(true);
        return;
      }
      already.addEventListener("error", () => finish(false), { once: true });
      // Script tag is there but the API may still be finishing — poll briefly.
      const poll = window.setInterval(() => {
        if (googleMaps()?.Map || w.__wgMapsAuthFailed) {
          window.clearInterval(poll);
          finish(Boolean(googleMaps()?.Map) && !w.__wgMapsAuthFailed);
        }
      }, 100);
      window.setTimeout(() => window.clearInterval(poll), GOOGLE_MAPS_LOAD_MS);
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    // Classic callback — the moment google.maps.Map is actually constructible.
    // Do not add loading=async here; that path needs importLibrary(), not Map.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&callback=${cbName}&v=weekly`;
    script.addEventListener("error", () => finish(false), { once: true });
    document.head.appendChild(script);
  });

  return pending;
}

/** Named Google console errors the admin test can explain. */
export type GoogleMapErrorName =
  | "RefererNotAllowedMapError"
  | "RefererDeniedMapError"
  | "ApiNotActivatedMapError"
  | "BillingNotEnabledMapError"
  | "InvalidKeyMapError"
  | string;

export type GoogleMapsProbeResult =
  | { state: "no-key" }
  | { state: "bad-key" }
  | { state: "timeout" }
  | { state: "working" }
  | { state: "refused"; reason: GoogleMapErrorName | null };

/**
 * Load the script AND construct a tiny map, the way Google actually refuses a
 * key. Script load alone is not enough: referrer, billing and API-not-enabled
 * failures often arrive only when a Map is created or tiles are requested.
 *
 * Never returns the key. Callers may fingerprint it separately.
 */
export async function probeGoogleMaps(): Promise<GoogleMapsProbeResult> {
  if (typeof window === "undefined") return { state: "no-key" };
  if (googleMapsBrowserKeyMalformed()) return { state: "bad-key" };
  if (!googleMapsAvailable()) return { state: "no-key" };

  let reason: GoogleMapErrorName | null = null;
  const realError = console.error;
  console.error = (...args: unknown[]) => {
    const text = args.map((a) => String(a)).join(" ");
    const named = /\b([A-Za-z]+MapError)\b/.exec(text);
    if (named) reason = named[1];
    realError(...(args as []));
  };

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;left:-9999px;top:0";
  document.body.appendChild(host);

  try {
    const started = Date.now();
    const loaded = await loadGoogleMaps();
    if (!loaded) {
      if (googleMapsAuthFailed() || reason) return { state: "refused", reason };
      if (Date.now() - started >= GOOGLE_MAPS_LOAD_MS - 50) return { state: "timeout" };
      return { state: "refused", reason };
    }

    const maps = googleMaps();
    if (!maps?.Map) return { state: "refused", reason };

    // Constructing the map is what triggers many of the named MapErrors.
    try {
      new maps.Map(host, {
        center: { lat: 48, lng: 14 },
        zoom: 4,
        disableDefaultUI: true,
        gestureHandling: "none",
      });
    } catch {
      return { state: "refused", reason };
    }

    // Give Google a beat to log RefererNotAllowed / BillingNotEnabled etc.
    await new Promise((r) => window.setTimeout(r, 1500));

    if (googleMapsAuthFailed() || reason) return { state: "refused", reason };
    return { state: "working" };
  } finally {
    console.error = realError;
    host.remove();
  }
}
