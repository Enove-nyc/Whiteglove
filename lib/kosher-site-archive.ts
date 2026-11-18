/**
 * The whole White Glove Kosher Travel site, kept for the owner inside the admin.
 *
 * THE OWNER'S DIRECTION (18 November 2026): Kosher Travel has closed and its
 * directory is private, but from the admin portal he wants one button that
 * opens the entire site as it was — search, destinations, kosher food, shuls,
 * mikvaos, heritage, the map. It lives on the admin subdomain, behind the admin
 * sign-in, under one prefix:
 *
 *   admin.whitegloveitineraries.com/site            → the Kosher Travel home
 *   admin.whitegloveitineraries.com/site/kosher     → /kosher, as Kosher Travel
 *
 * WHY A PREFIX. On the admin host a bare path is an admin SCREEN — and many
 * screen names are also Kosher Travel page names (/destinations, /directory,
 * /shuls, /mikvaos, /hechsherim, /eruvin, /travel, /alerts). Without a prefix
 * "/destinations" could only mean one of the two.
 *
 * WHY THE REFERER. The site's own pages link to "/destinations/rome", not
 * "/site/destinations/rome". A link followed FROM a /site page is therefore
 * sent back under /site, so clicking around stays inside the Kosher Travel
 * view instead of landing on an admin screen with the same name.
 *
 * Import-free so the edge middleware, client components and tests can share it.
 */

export const KOSHER_SITE_PREFIX = "/site";

/** True for /site and anything under it. */
export function inKosherSite(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  return p === KOSHER_SITE_PREFIX || p.startsWith(`${KOSHER_SITE_PREFIX}/`);
}

export type KosherSiteRoute =
  /** Serve this site path, as Kosher Travel. */
  | { kind: "serve"; path: string }
  /** Send the browser to this address under /site. */
  | { kind: "enter"; to: string }
  /** Not ours: the admin host's ordinary routing carries on. */
  | null;

/**
 * What the admin host does with a path, given where the click came from.
 * `refererPath` is the path of the page the request was made from, if any.
 */
export function kosherSiteRoute(pathname: string, refererPath: string | null): KosherSiteRoute {
  if (inKosherSite(pathname)) {
    const path = pathname.slice(KOSHER_SITE_PREFIX.length) || "/";
    // /site/admin/... is the admin, not a page of the site.
    if (path === "/admin" || path.startsWith("/admin/")) return { kind: "enter", to: path };
    return { kind: "serve", path };
  }
  if (!inKosherSite(refererPath)) return null;
  // The admin and its sign-in are never pulled into the site view.
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/login") return null;
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return null;
  if (/\.[a-z0-9]+$/i.test(pathname)) return null;
  return { kind: "enter", to: `${KOSHER_SITE_PREFIX}${pathname === "/" ? "" : pathname}` };
}

/** The path part of a Referer header, or null when there is none. */
export function refererPath(referer: string | null | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).pathname;
  } catch {
    return null;
  }
}
