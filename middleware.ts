import { NextRequest, NextResponse } from "next/server";
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

/**
 * Hostnames that are always open, set as a comma-separated SITE_OPEN_HOSTS
 * (e.g. "preview.whitegloveitineraries.com"). Lets one hostname stay public for
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
 * The admin area on its own hostname, e.g. `admin.whitegloveitineraries.com`.
 *
 * Set `ADMIN_HOST` to that hostname and every path on it is an admin path:
 * `admin.…/shomrim` serves the shomer screen, `/` serves the dashboard. The
 * paths under `/admin` keep working there too, so no link ever breaks.
 *
 * With `ADMIN_HOST` unset — which is the default — none of this runs and the
 * site behaves exactly as before.
 */
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
const ADMIN_SCREENS = new Set([
  "accounts",
  "add",
  "advertisements",
  "content",
  "destinations",
  "directory",
  "directory-listings",
  "finances",
  "hechsherim",
  "inventory",
  "kevarim",
  "login",
  "pages",
  "settings",
  "shomrim",
  "team",
]);

function isAdminScreen(pathname: string): boolean {
  return ADMIN_SCREENS.has(pathname.split("/")[1] ?? "");
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (/\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();

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

  // On the admin hostname, a bare path means the admin screen OF THAT NAME —
  // and only if a screen of that name exists. /version stays where it is so
  // the deployed build can always be checked, and anything else is a link back
  // out to the public site, handled below.
  const adminPath =
    onAdminHost && !pathname.startsWith("/admin") && pathname !== "/version"
      ? pathname === "/"
        ? "/admin"
        : isAdminScreen(pathname)
          ? `/admin${pathname}`
          : pathname
      : pathname;

  // A public path reached on the admin hostname: send it to the public site.
  // This is what the admin screens' own links do — the kevarim screen links to
  // /cemeteries — and before this they were rewritten into /admin/cemeteries
  // and 404'd, so the site was unreachable from inside the admin.
  if (onAdminHost && adminPath === pathname && pathname !== "/version" && !pathname.startsWith("/admin")) {
    const origin = publicOrigin();
    if (origin) {
      const url = new URL(request.url);
      const target = new URL(pathname + url.search, origin);
      return NextResponse.redirect(target);
    }
    // Nowhere to send them. Serve the page here rather than 404 — noindexed,
    // because the admin hostname must never look like a second copy of the site.
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
    // Behind Vercel's proxy the incoming URL is plain http, and sending an
    // http redirect would only bounce again through the https upgrade.
    if (!/^(localhost|127\.0\.0\.1)$/.test(url.hostname)) url.protocol = "https:";
    url.pathname = pathname.replace(/^\/admin/, "") || "/";
    return NextResponse.redirect(url);
  }

  if (adminPath.startsWith("/admin") && adminPath !== "/admin/login") {
    // A null token means this deployment has no signing secret and cannot
    // authorise anybody. Said explicitly rather than relying on a cookie never
    // being equal to null, so a later refactor cannot turn it into fail-open.
    const token = await edgeAccessToken("admin");
    if (!token || request.cookies.get("white_glove_admin")?.value !== token) {
      return NextResponse.redirect(new URL(onAdminHost ? "/login" : "/admin/login", request.url));
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

  // /version reports only the deployed commit — no private content. It stays
  // reachable while the site is locked so the build can always be checked.
  if (pathname !== "/access" && pathname !== "/version" && !pathname.startsWith("/admin")) {
    let locked = hostIsOpen(request) ? false : await edgeSiteIsLocked();
    if (!locked && !hostIsOpen(request)) {
      const lockedPaths = await edgeLockedPaths();
      locked = lockedPaths.some((raw) => {
        const prefix = raw.endsWith("/") ? raw.slice(0, -1) : raw;
        return prefix.length > 0 && (pathname === prefix || pathname.startsWith(prefix + "/"));
      });
    }
    if (locked) {
      const generation = await edgeAccessGeneration();
      let allowed = await edgeSiteAccessValid(request.cookies.get("white_glove_site_access")?.value, generation);

      // Someone the owner has let in by name gets through without being told
      // the shared password — they just sign in to their own account.
      if (!allowed) {
        const email = await edgeAccountEmail(request.cookies.get("white_glove_account")?.value);
        allowed = await edgeAccountHasSiteAccess(email);
      }

      if (!allowed) {
        const url = new URL("/access", request.url);
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
