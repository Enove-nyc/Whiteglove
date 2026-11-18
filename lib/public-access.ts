/**
 * What the public may reach on the one White Glove site.
 *
 * THE OWNER'S DIRECTION, 18 NOVEMBER 2026 (AGENTS.md): White Glove Kosher
 * Travel has closed and its database is kept for the owner alone. The public
 * can plan a trip, book through partners and use the companion app; nobody but
 * the owner can browse or search the directory — destinations, kosher food,
 * shuls, mikvaos, heritage, places to stay, the map, site search.
 *
 * AN ALLOW-LIST, NOT A BLOCK-LIST. A page added later is private until it is
 * deliberately added here, so the directory cannot leak back out through a
 * route nobody remembered to block. The owner, signed in to the admin, sees
 * every page as before.
 *
 * Import-free so the edge middleware and tests can both read it.
 */

/** Page path prefixes anyone may open. */
export const PUBLIC_PAGE_PREFIXES = [
  // Planning and booking — the public product.
  "/itinerary",
  "/book",
  "/go", // partner hand-off links
  // The old Travel menu's partner pages, back at the owner's word (18 November 2026).
  "/transfers",
  "/esim",
  "/travel-insurance",
  "/sample-itinerary",
  "/packing",
  "/optimize",
  "/translate",
  "/command-center",
  // Accounts and access.
  "/login",
  "/access",
  "/account",
  "/join",
  // The companion app and every per-trip link.
  "/app",
  "/offline",
  "/i",
  "/t",
  "/p",
  "/f",
  "/a",
  "/form",
  "/rate",
  // The company pages.
  "/about",
  "/contact",
  // Where an old alert email's unsubscribe link lands — signups are closed, unsubscribing is not.
  "/alerts/unsubscribed",
  "/privacy",
  "/terms",
  // Machine endpoints that are routes rather than files.
  "/version",
  "/site-overview.md",
  "/admin.webmanifest",
] as const;

/**
 * API prefixes that read the directory for a visitor. Closed to the public;
 * the owner's admin cookie still opens them. Everything else under /api —
 * accounts, trips, the companion, partner searches, Google hotel lookup —
 * carries on as before.
 */
export const DIRECTORY_API_PREFIXES = [
  "/api/search",
  "/api/kosher",
  "/api/near",
  "/api/things-to-do",
  "/api/cemeteries",
  "/api/kevarim",
  "/api/attractions",
  "/api/lodging/search",
  "/api/itinerary/nearby",
  "/api/zmanim/places",
  "/api/reviews",
  "/api/ratings",
  "/api/content",
  "/api/assistant/site",
] as const;

/**
 * Whether the planner offers search of the owner's own listings (lodging,
 * attractions, kevarim, nearby sites). Off: travellers add a place by name and
 * a Google-autocompleted address instead.
 */
export const DIRECTORY_SEARCH_IS_PUBLIC = false;

/**
 * Whether the adviser screens (/advisor, clients, pipeline, proposals,
 * payments, forms, group trips…) are offered to anyone. Off at the owner's
 * word, 18 November 2026: the pages answer "not available" and no menu,
 * account page or signed-in redirect points at them. Turning this back on
 * also needs their prefixes returned to PUBLIC_PAGE_PREFIXES.
 */
export const ADVISER_SCREENS_ARE_PUBLIC = false;

/**
 * Whether the saved-route screen (/my-route) is offered. Off at the owner's
 * word, 18 November 2026 ("remove route"): no menu, header icon, bottom bar or
 * account panel points at it, and the page answers "not available" to the
 * public. Saved routes stay in each account.
 */
export const ROUTE_IS_PUBLIC = false;

function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Pages under a public prefix that are still the owner's alone.
 *
 * THE OWNER'S WORD, 18 NOVEMBER 2026: pricing, the app demonstration, the
 * adviser screens (/advisor, clients, pipeline, proposals, payments, forms…)
 * and Get recommendations (/plan) come off the public site. The trip app
 * itself (/app) stays, because a traveller holding a trip code — or the
 * installed app — opens their trip there.
 */
export const OWNER_ONLY_PAGES = ["/app/preview"] as const;

/** True when anyone may open this page. */
export function isPublicPage(pathname: string): boolean {
  if (pathname === "/") return true;
  if (OWNER_ONLY_PAGES.some((prefix) => under(pathname, prefix))) return false;
  return PUBLIC_PAGE_PREFIXES.some((prefix) => under(pathname, prefix));
}

/** True when this API reads the directory for a visitor. */
export function isDirectoryApi(pathname: string): boolean {
  return DIRECTORY_API_PREFIXES.some((prefix) => under(pathname, prefix));
}
