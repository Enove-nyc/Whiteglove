"use client";

import { useEffect } from "react";

/**
 * Mark the document as running inside the installed app.
 *
 * The website footer is the marketing surface for the site — the mark, the
 * brand name, the sales/legal links — and has no place inside the app, which
 * has its own navigation. The CSS hides `footer#contact` under
 * `@media (display-mode: standalone)` on its own, with no flash, for every TWA
 * and installed PWA. This adds `data-app-shell` to <html> for the cases that
 * media query misses:
 *
 *  - the native Capacitor shell (the traveller app, migrated off TWA), which
 *    loads the remote site and injects the `window.Capacitor` bridge but does
 *    NOT report display-mode standalone — so without this the footer would
 *    still show inside the actual app;
 *  - an iOS installed PWA, which reports `navigator.standalone`;
 *  - the android-app:// launch referrer (the remaining TWA case).
 *
 * An ordinary browser tab matches none of these and the attribute is never set,
 * so the website keeps its footer.
 */
export default function AppShellFlag() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    // Capacitor native shell — the bridge is injected whether it loads bundled
    // assets or (as our apps do) a remote URL, so its presence is a reliable
    // "running inside the app" even though a Capacitor WebView does not report
    // display-mode standalone.
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    const inCapacitor = cap != null && (cap.isNativePlatform?.() ?? true);
    const inApp =
      inCapacitor ||
      window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
      nav.standalone === true ||
      document.referrer.startsWith("android-app://");
    if (!inApp) return;
    document.documentElement.setAttribute("data-app-shell", "1");

    /**
     * AND THE SAFE AREAS BECOME REAL NUMBERS.
     *
     * `env(safe-area-inset-*)` is ZERO unless the viewport is declared
     * `viewport-fit=cover` — that is in the spec, not a browser quirk. So the
     * site's existing insets were all writing nothing: the phone bottom bar's
     * `pb-[env(safe-area-inset-bottom)]`, and the room reserved for it in
     * globals.css. And with Android 15 forcing apps edge to edge, the web view
     * now draws behind the status bar, so the header sat under the clock with
     * no inset to push it down. That is the report: "the top header bumps into
     * the top of the phone in the app."
     *
     * Set HERE rather than in the viewport export, so it applies inside the
     * app and nowhere else. On the open website `cover` would also put a page
     * under an iPhone's notch in landscape, where every gutter is 20px and the
     * inset is 44 — a regression on the public site to fix something only the
     * app has.
     */
    const meta = document.querySelector('meta[name="viewport"]');
    const content = meta?.getAttribute("content");
    if (meta && content && !/viewport-fit/.test(content)) {
      meta.setAttribute("content", `${content}, viewport-fit=cover`);
    }
  }, []);
  return null;
}
