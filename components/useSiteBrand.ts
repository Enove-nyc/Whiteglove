"use client";

import { useSyncExternalStore } from "react";
import { brandForHost, configuredBrand, type SiteBrand } from "@/lib/site-brand-core";
import { inKosherSite } from "@/lib/kosher-site-archive";

/**
 * Which of the two sites this browser is on.
 *
 * WHY A HOOK AND NOT ANOTHER EFFECT. Four components had written the same six
 * lines by hand — a `useState(false)` and an effect hook that corrects it
 * after mount — and that shape is a synchronous setState inside an effect, which
 * React 19's lint rule refuses and is right to: it is an extra render pass on
 * every mount to learn something that never changes.
 *
 * A HOSTNAME IS AN EXTERNAL STORE THAT NEVER CHANGES, which is exactly what
 * useSyncExternalStore is for. Subscribing is a no-op because nothing will ever
 * fire — the address bar cannot change brand without a navigation — and the
 * server snapshot is the build's own brand, so the first paint is already
 * right on both deployments rather than starting kosher and correcting itself.
 *
 * The hostname is still what the client reads, because one build can be served
 * on a preview host or behind a proxy that rewrites the Host — see
 * brandForHost.
 */

const NO_CHANGE = () => () => {};

/**
 * The brand to show. The order is: what the page passed (it resolved the brand
 * on the server), then the owner's Kosher Travel view inside the admin (/site,
 * lib/kosher-site-archive.ts — Kosher Travel whatever this build is), then the
 * deployment's own setting, then the hostname. The server snapshot is the
 * build's brand, Itineraries when unset (AGENTS.md, 18 November 2026: one site).
 */
export function useSiteBrand(brandProp?: SiteBrand): SiteBrand {
  const built = configuredBrand();
  const fromHost = useSyncExternalStore(
    NO_CHANGE,
    () => (inKosherSite(window.location.pathname) ? "kosher" : brandForHost(window.location.hostname)),
    () => built ?? "itineraries",
  );
  return brandProp ?? (fromHost === "kosher" ? "kosher" : built ?? fromHost);
}

export function useIsItineraries(): boolean {
  return useSiteBrand() === "itineraries";
}
