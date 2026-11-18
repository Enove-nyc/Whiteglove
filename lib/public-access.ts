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
  "/plan",
  "/book",
  "/go", // partner hand-off links
  "/sample-itinerary",
  "/packing",
  "/optimize",
  "/translate",
  "/my-route",
  "/command-center",
  "/group",
  // Accounts and access.
  "/login",
  "/access",
  "/account",
  "/join",
  "/team",
  // The companion app and every per-trip link.
  "/app",
  "/offline",
  "/i",
  "/t",
  "/p",
  "/f",
  "/r",
  "/a",
  "/form",
  "/rate",
  "/addons",
  "/activity",
  // Advisor tools (each requires its own sign-in).
  "/advisor",
  "/agency",
  "/clients",
  "/pipeline",
  "/proposal",
  "/payments",
  "/forms",
  "/library",
  "/history",
  "/commissions",
  // The company pages.
  "/about",
  "/contact",
  "/pricing",
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

function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** True when anyone may open this page. */
export function isPublicPage(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PAGE_PREFIXES.some((prefix) => under(pathname, prefix));
}

/** True when this API reads the directory for a visitor. */
export function isDirectoryApi(pathname: string): boolean {
  return DIRECTORY_API_PREFIXES.some((prefix) => under(pathname, prefix));
}
