"use client";

import { useSyncExternalStore } from "react";
import { brandForHost, configuredBrand, type SiteBrand } from "@/lib/site-brand-core";

/**
 * Which brand this page is being shown as, in a client component.
 *
 * THREE SOURCES, IN ORDER. What the page was told (a prop, where a server
 * component already knew), then the deployment's own setting, then the
 * hostname in the browser.
 *
 * WHY useSyncExternalStore RATHER THAN AN EFFECT. The hostname does not exist
 * while the HTML is being made, so the value legitimately differs between
 * server and client — which is exactly what this hook is for. The Footer used
 * to do it by rendering "kosher" and correcting itself in an effect, which
 * React's own lint rule refuses (a synchronous setState in an effect is a
 * second render nobody asked for), and which left `tsc`-clean code failing
 * `eslint` on a page every visitor loads. The Navbar already did it this way;
 * this is that answer, in one place, used by both.
 *
 * NO_CHANGE because a hostname never changes under a running page: there is
 * nothing to subscribe to, so the unsubscribe is all there is.
 */
const NO_CHANGE = () => () => {};

export function useSiteBrand(brandProp?: SiteBrand): SiteBrand {
  const built = configuredBrand();
  const fromHost = useSyncExternalStore(
    NO_CHANGE,
    () => brandForHost(window.location.hostname),
    () => built ?? "kosher",
  );
  return brandProp ?? built ?? fromHost;
}
