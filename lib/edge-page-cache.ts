/**
 * A five-minute copy of the pages that are the same for every visitor who is
 * not signed in, kept at Cloudflare's edge in front of the app.
 *
 * WHY (AGENTS.md: the free Workers plan allows 10 ms of CPU a request, and a
 * burst of visitors took pages down with error 1102). The home page, Book,
 * About and the guest planner are rebuilt for every visitor although nobody
 * signed out sees anything different. Served from this copy they cost almost
 * nothing — not even the middleware runs — so a burst no longer reaches the
 * app at all.
 *
 * WHAT IS NEVER SERVED FROM IT, and each rule is a reason:
 *   - anybody carrying one of the site's own cookies (white_glove_*): signed
 *     in, admin, a Google sign-in half-way, or the site-access pass the
 *     password gate hands out. A copy made for them could carry their name or
 *     let somebody else past the gate, so they always go to the app.
 *   - any address with a query string: those are prefilled searches and
 *     one-off links (?preview=…), and differ per visitor.
 *   - anything but GET for text/html: the home page also answers in Markdown
 *     to a client that asks for it.
 *   - any host but the public www address: never the admin, the closed kosher
 *     domain or workers.dev.
 * And only a plain 200 HTML answer with no Set-Cookie is ever stored, so a
 * redirect (the password gate, a signed-in redirect) is never copied.
 *
 * A NEW DEPLOY NEVER SERVES AN OLD PAGE. The key carries the deployed version,
 * so the moment a release goes live every copy belongs to the old one and is
 * simply not found — an old page would point at script files the new release
 * no longer has. An edit in the admin shows within five minutes.
 */

export const EDGE_CACHE_HOST = "www.whitegloveitineraries.com";
export const EDGE_CACHE_SECONDS = 300;
export const EDGE_CACHED_PATHS = new Set([
  "/",
  "/about",
  "/itinerary",
  "/privacy",
  "/terms",
  "/transfers",
  "/esim",
  "/travel-insurance",
]);
/** Pages under these prefixes are cached too (the public sample itineraries). */
export const EDGE_CACHED_PREFIXES = ["/sample-itineraries", "/find"];

type RequestLike = { method: string; url: string; headers: { get(name: string): string | null } };

function pathIsCached(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return EDGE_CACHED_PATHS.has(path) || EDGE_CACHED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** The cache key for this request, or null when it must go to the app. */
export function edgeCacheKey(request: RequestLike, version: string): string | null {
  if (request.method !== "GET" || !version) return null;
  let url: URL;
  try { url = new URL(request.url); } catch { return null; }
  if (url.hostname !== EDGE_CACHE_HOST || url.search || !pathIsCached(url.pathname)) return null;
  if (/(^|;\s*)white_glove_/.test(request.headers.get("cookie") ?? "")) return null;
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) return null;
  // Pages choose phone or desktop advertising by the browser's own word.
  const device = /Mobi|Android/i.test(request.headers.get("user-agent") ?? "") ? "m" : "d";
  return `https://${EDGE_CACHE_HOST}${url.pathname}?__edge=${encodeURIComponent(version)}&__d=${device}`;
}

type ResponseLike = { status: number; headers: { get(name: string): string | null } };

/**
 * Whether the app's answer may be kept and handed to the next visitor.
 *
 * Next marks every page it builds per request "private, no-store", so that
 * header cannot be the test here: what keeps a personal page out of this
 * cache is the cookie rule in edgeCacheKey, which sends anybody who could
 * receive one straight to the app.
 */
export function edgeCacheable(response: ResponseLike): boolean {
  return (
    response.status === 200 &&
    !response.headers.get("set-cookie") &&
    (response.headers.get("content-type") ?? "").includes("text/html")
  );
}
