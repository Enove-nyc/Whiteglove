"use client";

import { useEffect } from "react";

/**
 * Quietly note that a signed-in traveller opened this page.
 *
 * Rendered only on the pages somebody RESEARCHES on — a destination, a town, a
 * beis hachaim. Not on every page, not on the account screens, not on
 * anything to do with paying: this exists so somebody can find their way back
 * to what they were reading, and a breadcrumb dropped anywhere else is
 * surveillance with no use behind it.
 *
 * Signed out it records nothing, and the route says so with a plain ok rather
 * than an error, because a visitor who has not asked to be remembered is not a
 * failure.
 *
 * It never blocks and never shows anything. If the write fails, the page is
 * exactly as it was.
 */
export function RememberVisit({ href, name, where = "" }: { href: string; name: string; where?: string }) {
  useEffect(() => {
    if (!href || !name) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/account/recent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ href, name, where }),
      }).catch(() => undefined);
      // A short delay so a page somebody opened and immediately left does not
      // push the page they actually wanted off the end of a list of eight.
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [href, name, where]);

  return null;
}
