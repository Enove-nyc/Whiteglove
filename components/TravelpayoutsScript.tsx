"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

function publicBrowser() {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !((cap && (cap.isNativePlatform?.() ?? true)) || window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone || document.referrer.startsWith("android-app://"));
}
function subscribe(callback: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** Affiliate domain verification belongs on public discovery pages. */
export default function TravelpayoutsScript() {
  const pathname = usePathname();
  const inPublicBrowser = useSyncExternalStore(subscribe, publicBrowser, () => false);
  // Trip codes and account flows are private, not affiliate discovery pages.
  if (!inPublicBrowser || /^\/(?:join|app|i|t|account|advisor|admin|travel)(?:\/|$)/.test(pathname)) return null;
  return (
    <Script
      src="https://emrldco.com/NTU5Nzcx.js?t=559771"
      strategy="afterInteractive"
      data-cmp-ab="2"
    />
  );
}
