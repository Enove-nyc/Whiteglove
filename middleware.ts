import { NextRequest, NextResponse } from "next/server";
import {
  adminHostEntry,
  isAdminHostSegment,
  toCanonicalAdminPath,
} from "@/lib/admin-host";
import {
  edgeAccessGeneration,
  edgeAccessToken,
  edgeAccountEmail,
  edgeAccountHasSiteAccess,
  edgeLockedPaths,
  edgeMintSiteAccess,
  edgeSiteAccessValid,
  edgeSiteIsLocked,
} from "@/lib/edge-lock";
import { MIGRATION_LISTS, movedTo } from "@/lib/route-migration";
import { guideAnswer } from "@/lib/guide-paths";
import { isDirectoryApi, isPublicPage } from "@/lib/public-access";
import { BRAND_HEADER, brandFromRequestHeaders } from "@/lib/site-brand-core";
import { KOSHER_SITE_PREFIX, kosherSiteRoute, refererPath } from "@/lib/kosher-site-archive";
import { CLOSURE_HTML, closureAction, isClosedKosherHost, isRetiredKosherSubdomain } from "@/lib/kosher-closure";
import { isAndroidAppHeaders } from "@/lib/android-app";
import { isMainstreamPath } from "@/lib/mainstream-property-check";
import { prefersMarkdown } from "@/lib/markdown-request";

/*
 * The guide lives on the kosher site; the itineraries site is strictly the
 * planner. GUIDE_ONLY_PREFIXES and isGuidePath moved to lib/guide-paths.ts so
 * the sitemap reads the same list — it did not, and offered Google 760 kosher
 * URLs this middleware redirects away from.
 *
 * /sample-itinerary IS NOT ON THAT LIST, and used to be.
 *
 * It is the one page that answers "what do I actually get" — a real week
 * rendered by the same component that prints a customer's trip. On the domain
 * that CHARGES for that document, a visitor who clicked to see it was thrown
 * onto a different company's website. The planner's own page links to it, so
 * the site was ejecting its own prospects mid-decision.
 */


/**
 * Hostnames that are always open, set as a comma-separated SITE_OPEN_HOSTS
 * (e.g. "preview.whiteglovekoshertravel.com"). Lets one hostname stay public for
 * reviewers while the
 * main domain stays private. Matching ignores case, port and a "www." prefix.
 */
function hostIsOpen(request: NextRequest): boolean {
  const raw = process.env.SITE_OPEN_HOSTS?.trim();
  if (!raw) return false;
  const strip = (h: string) => h.toLowerCase().split(":")[0].replace(/^www\./, "").trim();
  const host = strip(request.headers.get("host") || request.nextUrl.hostname);
  if (!host) return false;
  return raw.split(",").map(strip).filter(Boolean).includes(host);
}

/**
 * The admin area on its own hostname, e.g. `admin.whiteglovekoshertravel.com`.
 *
 * Set `ADMIN_HOST` to that hostname and every path on it is an admin path:
 * `admin.…/shomrim` serves the shomer screen, `/` serves the dashboard. The
 * paths under `/admin` keep working there too, so no link ever breaks.
 *
 * With `ADMIN_HOST` unset — which is the default — none of this runs and the
 * site behaves exactly as before.
 */
/**
 * 410 Gone, with something a person can read.
 *
 * A status alone is for the crawler; a human who followed an old link needs a
 * way onward. Deliberately minimal and self-contained — it cannot render the
 * site's own chrome from the edge, and a gone page that looks like a working
 * page invites another try. noindex as well as 410, so the two agree.
 *
 * Brand-neutral: this is the general-travel domain and the reason the address
 * is gone is that it never belonged here.
 */
function goneResponse(): NextResponse {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow">` +
    `<title>Page not available — White Glove Itineraries</title>` +
    `<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;` +
    `background:#F7F4EE;color:#102F35;font:16px/1.6 Inter,system-ui,sans-serif;padding:24px}` +
    `main{max-width:34rem}h1{font:600 1.6rem/1.25 Georgia,serif;margin:0 0 .75rem}` +
    `p{margin:0 0 1.25rem;color:#57534e}a{display:inline-flex;min-height:44px;align-items:center;` +
    `padding:0 20px;margin:0 8px 8px 0;border-radius:999px;text-decoration:none;font-weight:600}` +
    `.p{background:#193F46;color:#FFFDFC}.s{border:1px solid #C6A15B;color:#102F35}</style></head>` +
    `<body><main><h1>This page is not available.</h1>` +
    `<p>Plan your trip in the itinerary planner, or book through our travel partners.</p>` +
    `<p><a class="p" href="/itinerary">Build a trip</a><a class="s" href="/book">Book</a><a class="s" href="/">Home</a></p>` +
    `</main></body></html>`;
  return new NextResponse(body, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow" },
  });
}

function requestHost(request: NextRequest): string {
  return (request.headers.get("host") || request.nextUrl.hostname).toLowerCase().split(":")[0].trim();
}

/**
 * The admin hostname, refused if it is a hostname the public site is served on.
 *
 * WHY THIS REFUSES. ADMIN_HOST names the host that BECOMES the admin area:
 * every path on it is rewritten to /admin plus itself. Set to a subdomain that
 * is what you want. Set to the public domain by mistake — dropping the
 * "admin." while copying — and the entire public website turns into the admin
 * login, on the live domain, until somebody notices and redeploys.
 *
 * That is too much damage for a typo, so a value that matches a hostname in
 * SITE_OPEN_HOSTS or NEXT_PUBLIC_SITE_URL is ignored and the site behaves as
 * though ADMIN_HOST were unset. Those are the hostnames the site already
 * declares as its own public addresses, so a match is a mistake by definition:
 * a host cannot be both the public site and the admin area.
 */
function configuredAdminHost(): string | null {
  const configured = process.env.ADMIN_HOST?.trim().toLowerCase().split(":")[0];
  if (!configured) return null;

  const strip = (h: string) => h.toLowerCase().split(":")[0].replace(/^www\./, "").trim();
  const publicHosts = new Set<string>();
  for (const raw of (process.env.SITE_OPEN_HOSTS ?? "").split(",")) {
    if (raw.trim()) publicHosts.add(strip(raw));
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      publicHosts.add(strip(new URL(siteUrl.includes("://") ? siteUrl : `https://${siteUrl}`).hostname));
    } catch {
      // An unparseable site URL tells us nothing; it must not disable the
      // admin hostname by accident.
    }
  }

  return publicHosts.has(strip(configured)) ? null : configured;
}

function isAdminHost(request: NextRequest): boolean {
  const configured = configuredAdminHost();
  if (!configured) return false;
  return requestHost(request) === configured;
}

/**
 * The screens that exist under /admin. Anything else on the admin hostname is
 * a link back out to the public site.
 *
 * WHY THIS LIST EXISTS. Every path on the admin hostname used to be rewritten
 * to `/admin` + itself, which is right for `/shomrim` and wrong for everything
 * else: the admin screens link out to the public site — "The directory" on the
 * kevarim screen goes to /cemeteries — and on the admin hostname that became
 * /admin/cemeteries, which does not exist. So from inside the admin, every
 * link to the site 404'd.
 *
 * Keep it in step with the folders in app/admin. A screen missing from here
 * does not break: it lands on the public site instead of the admin one, which
 * is a visible, harmless wrong answer rather than a silent one.
 */
function isAdminScreen(pathname: string): boolean {
  return isAdminHostSegment(pathname);
}

/**
 * Where the public site lives, for sending a link back to it.
 *
 * NEXT_PUBLIC_SITE_URL is already used for share links, so it is the address
 * the site already considers its own. With it unset there is nothing to send
 * anybody to, and the path is served where it is instead — the visitor gets
 * the page rather than a 404.
 */
function publicOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).origin;
  } catch {
    return null;
  }
}

/**
 * The Android app is a Trusted Web Activity wrapping this site, and its launch
 * URL — baked into the published binary — is the bare domain. The owner wants it
 * to open on the planner app (/app), not the marketing home page. Rather than
 * ship a new binary and wait on another Play review, we land it here: the app's
 * WebView tags every request with its package name, so a home-page open coming
 * from the app is sent on to /app while an ordinary browser gets the home page
 * untouched. Detection lives in lib/android-app.ts, tested there.
 */
function isAndroidAppRequest(request: NextRequest): boolean {
  return isAndroidAppHeaders((name) => request.headers.get(name));
}

/**
 * Constant-time string comparison. The admin cookie is an HMAC and the rest of
 * the auth path (lib/edge-lock.ts) already compares in constant time; a plain
 * `===` here short-circuits on the first differing byte. Practically
 * unexploitable over a network against a base64url HMAC, but there is no reason
 * for the one comparison in this file to be the odd one out.
 */
function timingSafeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The site-lock gate as a value: a redirect to /access when this request must
 * be stopped, or null when it may proceed. Pulled out of the middleware body so
 * the same gate covers the ordinary path AND the admin-host public-path branch
 * that has nowhere to redirect to — a locked page must never be served in the
 * clear just because it was reached on the admin hostname.
 */
async function siteLockRedirect(request: NextRequest, pathname: string): Promise<NextResponse | null> {
  // /version and /api/health are the deployment checks and contain no private
  // content. Both must answer THROUGH the site lock: Railway calls the health
  // path before it moves traffic, so a locked site that redirected it would
  // fail every deploy while the site itself was perfectly fine.
  // It stays reachable while the site is locked so health checks keep working.
  if (pathname === "/access" || pathname === "/version" || pathname === "/api/health" || pathname.startsWith("/admin")) return null;

  let locked = hostIsOpen(request) ? false : await edgeSiteIsLocked();
  if (!locked && !hostIsOpen(request)) {
    const lockedPaths = await edgeLockedPaths();
    locked = lockedPaths.some((raw) => {
      const prefix = raw.endsWith("/") ? raw.slice(0, -1) : raw;
      return prefix.length > 0 && (pathname === prefix || pathname.startsWith(prefix + "/"));
    });
  }
  if (!locked) return null;

  const generation = await edgeAccessGeneration();
  let allowed = await edgeSiteAccessValid(request.cookies.get("white_glove_site_access")?.value, generation);
  // Someone the owner has let in by name gets through without being told the
  // shared password — they just sign in to their own account.
  if (!allowed) {
    const email = await edgeAccountEmail(request.cookies.get("white_glove_account")?.value);
    allowed = await edgeAccountHasSiteAccess(email);
  }
  if (allowed) return null;

  const url = new URL("/access", request.url);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

/**
 * The owner, signed in to the admin. The directory is private to him: he sees
 * every page and every directory search as before; nobody else does. See
 * lib/public-access.ts.
 */
/** True when the request arrived on whitegloveitineraries.com without the www. */
function isBareItinerariesHost(headers: { get(name: string): string | null }): boolean {
  const bare = (value: string | null) => (value ?? "").toLowerCase().split(",")[0].split(":")[0].trim();
  return bare(headers.get("x-forwarded-host") || headers.get("host")) === "whitegloveitineraries.com";
}

async function isOwner(request: NextRequest): Promise<boolean> {
  const token = await edgeAccessToken("admin");
  return timingSafeEqual(request.cookies.get("white_glove_admin")?.value, token);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // White Glove Kosher Travel has closed. On its own domain, and any subdomain
  // of it, every address is the one closing notice — no admin, no API, no
  // forwarding (the owner's word, 18 November 2026). See lib/kosher-closure.ts.
  if (isClosedKosherHost(request.headers)) {
    // Every subdomain but www is gone (owner, 20 November 2026).
    if (isRetiredKosherSubdomain(request.headers)) {
      return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" } });
    }
    const action = closureAction(pathname);
    if (action.kind === "notice") {
      return new NextResponse(CLOSURE_HTML, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
          "x-robots-tag": "noindex",
        },
      });
    }
  }

  // The bare domain is one address for the site, www is the other: send it to
  // www, which every link, email and the closing notice already use. Netlify
  // did this itself; on Cloudflare the site has to (18 November 2026).
  if (isBareItinerariesHost(request.headers)) {
    const to = new URL(request.nextUrl.pathname + request.nextUrl.search, "https://www.whitegloveitineraries.com");
    return NextResponse.redirect(to, 308);
  }

  // The directory's own searches are the owner's alone now (lib/public-access.ts).
  if (isDirectoryApi(pathname) && !(await isOwner(request))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (/\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();

  // Expo visitors open this independent tool by QR code, without a travel
  // account or site-access cookie. Keep the exception within this path only.
  if (isMainstreamPath(pathname) && !isAdminHost(request)) return NextResponse.next();

  // The Android app opens on the bare domain; the owner wants it to land on the
  // planner app instead. Only the home page, and only when the request comes
  // from the app itself — an ordinary browser at "/" still gets the home page.
  // 307, never cached: the choice depends on a request header, so a shared cache
  // must not serve one visitor's /app redirect to the next.
  if (pathname === "/" && isAndroidAppRequest(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    const response = NextResponse.redirect(url, 307);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Vary", "X-Requested-With");
    return response;
  }

  // A heritage town that used to live under /destinations.
  //
  // NOT A WILDCARD, AND IT CANNOT BE. /destinations/:slug now serves two
  // different kinds of page depending on the slug — eighteen vacation
  // destinations and a hundred and nine former heritage towns — so a blanket
  // rule would send every vacation page on the site to /heritage/towns. The
  // decision is per slug, from the two lists, in lib/route-migration.ts where
  // it is tested. 308 rather than 307: this is permanent, and a search engine
  // should move the ranking across rather than keep both.
  const moved = movedTo(pathname, MIGRATION_LISTS);
  if (moved) {
    const url = request.nextUrl.clone();
    url.pathname = moved;
    return NextResponse.redirect(url, 308);
  }

  const onAdminHost = isAdminHost(request);

  // THE WHOLE KOSHER TRAVEL SITE, FOR THE OWNER, INSIDE THE ADMIN. On the admin
  // host, /site/... serves the closed Kosher Travel site as it was, branded as
  // it was, to the owner signed in to the admin and nobody else. A link
  // followed from a /site page is kept under /site. See lib/kosher-site-archive.ts.
  // Any host, so it works before the admin subdomain's DNS exists too.
  {
    const referer = request.headers.get("referer");
    let fromPath: string | null = null;
    try {
      // Same host only: a link from somewhere else never steers this.
      const host = (request.headers.get("host") || request.nextUrl.host).toLowerCase();
      if (referer && new URL(referer).host.toLowerCase() === host) fromPath = refererPath(referer);
    } catch {
      fromPath = null;
    }
    const route = kosherSiteRoute(pathname, fromPath);
    if (route) {
      if (!(await isOwner(request))) {
        const login = new URL(onAdminHost ? "/login" : "/admin/login", request.url);
        login.searchParams.set("next", pathname);
        return NextResponse.redirect(login);
      }
      if (route.kind === "enter") {
        const to = request.nextUrl.clone();
        to.pathname = route.to;
        return NextResponse.redirect(to, 307);
      }
      const headers = new Headers(request.headers);
      headers.set(BRAND_HEADER, "kosher");
      const target = request.nextUrl.clone();
      target.pathname = route.path;
      const response = NextResponse.rewrite(target, { request: { headers } });
      response.headers.set("x-robots-tag", "noindex, nofollow");
      return response;
    }
  }

  // ONLY THE PLANNER, BOOKING AND THE COMPANION ARE PUBLIC. White Glove Kosher
  // Travel has closed and its directory is kept for the owner alone (AGENTS.md,
  // 18 November 2026). Every page not on the allow-list in lib/public-access.ts
  // answers "not available" — except to the owner signed in to the admin, who
  // sees it as before. A directory path with a booking or planning equivalent
  // (/hotels, /esim, /stops…) is sent there instead of a dead end.
  //
  // NEVER on the admin host, and never for /admin itself: the admin has its
  // own sign-in below.
  if (!onAdminHost && !pathname.startsWith("/admin") && !isPublicPage(pathname) && !(await isOwner(request))) {
    const answer = guideAnswer(pathname);
    if (answer?.kind === "redirect" && isPublicPage(answer.to)) {
      return NextResponse.redirect(new URL(answer.to + request.nextUrl.search, request.url), 307);
    }
    return goneResponse();
  }

  // The one admin dashboard lives on this site (with its second factor);
  // White Glove Kosher Travel has closed. See AGENTS.md, 18 November 2026.

  if (onAdminHost && pathname.startsWith("/admin")) {
    const token = await edgeAccessToken("admin");
    const authed = timingSafeEqual(request.cookies.get("white_glove_admin")?.value, token);
    const entry = adminHostEntry(pathname, request.nextUrl.search, authed);
    if (entry.kind === "redirect") {
      const url = request.nextUrl.clone();
      url.pathname = entry.pathname;
      url.search = entry.search;
      return NextResponse.redirect(url, entry.permanent ? 308 : 307);
    }
  }

  // On the admin hostname, a bare path means the admin screen OF THAT NAME —
  // and only if a screen of that name exists. /version stays where it is so
  // the deployment health check remains available, and anything else is a link back
  // out to the public site, handled below.
  const adminPath =
    onAdminHost && !pathname.startsWith("/admin") && pathname !== "/version"
      ? pathname === "/"
        ? "/admin"
        : isAdminScreen(pathname)
          ? toCanonicalAdminPath(pathname)
          : pathname
      : pathname;

  // A public path reached on the admin hostname: send it to the public site.
  // This is what the admin screens' own links do — the kevarim screen links to
  // /cemeteries — and before this they were rewritten into /admin/cemeteries
  // and 404'd, so the site was unreachable from inside the admin.
  if (onAdminHost && adminPath === pathname && pathname !== "/version" && !pathname.startsWith("/admin")) {
    // A page the public can no longer open (the kevarim screen links to
    // /cemeteries) is opened in the owner's Kosher Travel view instead.
    if (!isPublicPage(pathname)) {
      return NextResponse.redirect(new URL(KOSHER_SITE_PREFIX + pathname + request.nextUrl.search, request.url), 307);
    }
    const origin = publicOrigin();
    if (origin) {
      const url = new URL(request.url);
      const target = new URL(pathname + url.search, origin);
      return NextResponse.redirect(target);
    }
    // Nowhere to send them. The site lock still applies — a locked public page
    // must not be served in the clear just because it was reached on the admin
    // host with no public origin configured to bounce to.
    const lockRedirect = await siteLockRedirect(request, pathname);
    if (lockRedirect) return lockRedirect;
    // Serve the page here rather than 404 — noindexed, because the admin
    // hostname must never look like a second copy of the site.
    const response = NextResponse.next();
    response.headers.set("x-robots-tag", "noindex, nofollow");
    return response;
  }

  // Send the whole admin area to its own hostname once one is set, so there is
  // a single place to sign in. Off by default: turning it on before DNS
  // resolves would leave no way into /admin at all.
  // Reads the CHECKED hostname, not the raw variable. A refused ADMIN_HOST —
  // one that is also a public address — must not still be redirected to, or
  // /admin would bounce to the public site's root and never arrive.
  const adminHostname = configuredAdminHost();
  if (!onAdminHost && adminHostname && process.env.ADMIN_HOST_ONLY === "1" && pathname.startsWith("/admin")) {
    const url = new URL(request.url);
    url.hostname = adminHostname;
    url.port = "";
    // Behind the TLS terminator the incoming URL is often plain http, and
    // sending an http redirect would only bounce again through the https upgrade.
    if (!/^(localhost|127\.0\.0\.1)$/.test(url.hostname)) url.protocol = "https:";
    url.pathname = pathname.replace(/^\/admin/, "") || "/";
    return NextResponse.redirect(url);
  }

  if (adminPath.startsWith("/admin") && adminPath !== "/admin/login") {
    // A null token means this deployment has no signing secret and cannot
    // authorise anybody: timingSafeEqual returns false for a null expected
    // value, so no cookie can ever match it and the request goes to login.
    const token = await edgeAccessToken("admin");
    if (!timingSafeEqual(request.cookies.get("white_glove_admin")?.value, token)) {
      const login = new URL(onAdminHost ? "/login" : "/admin/login", request.url);
      const nextPath = (onAdminHost ? pathname : pathname.replace(/^\/admin/, "") || "/") + request.nextUrl.search;
      if (nextPath && nextPath !== "/" && nextPath !== "/login" && !nextPath.startsWith("/admin/login")) {
        login.searchParams.set("next", nextPath);
      }
      return NextResponse.redirect(login);
    }
  }

  if (adminPath !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = adminPath;
    const response = NextResponse.rewrite(url);
    // The admin hostname must never be indexed, and must never look to a search
    // engine like a second copy of the site.
    response.headers.set("x-robots-tag", "noindex, nofollow");
    return response;
  }

  if (onAdminHost) {
    const response = NextResponse.next();
    response.headers.set("x-robots-tag", "noindex, nofollow");
    return response;
  }

  // A one-off preview link: ?preview=<SITE_PREVIEW_TOKEN> lets a specific
  // person in without sharing the site password. It grants the same access the
  // password does, then strips the token from the URL so it isn't left in the
  // address bar, bookmarked or leaked in a referrer. Never applies to /admin.
  const preview = request.nextUrl.searchParams.get("preview");
  const previewToken = process.env.SITE_PREVIEW_TOKEN?.trim();
  if (preview && previewToken && preview === previewToken && previewToken.length >= 12 && !pathname.startsWith("/admin")) {
    const clean = new URL(request.url);
    clean.searchParams.delete("preview");
    const response = NextResponse.redirect(clean);
    const month = 60 * 24 * 30; // a reviewer should not be locked out mid-review
    response.cookies.set("white_glove_site_access", await edgeMintSiteAccess(await edgeAccessGeneration(), month), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: month * 60,
      path: "/",
    });
    return response;
  }

  const lockRedirect = await siteLockRedirect(request, pathname);
  if (lockRedirect) return lockRedirect;
  // Negotiate only the public Itineraries homepage, after the existing lock.
  // Private routes and all ordinary HTML/session redirects keep their handlers.
  const homepage = pathname === "/" && brandFromRequestHeaders(request.headers) === "itineraries";
  const response = homepage && prefersMarkdown(request.headers.get("accept"))
    ? NextResponse.rewrite(new URL("/site-overview.md", request.url))
    : NextResponse.next();
  if (homepage) response.headers.append("Vary", "Accept");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
