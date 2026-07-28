import { NextRequest, NextResponse } from "next/server";
import { edgeAccessToken, edgeLockedPaths, edgeSiteIsLocked } from "@/lib/edge-lock";

/**
 * Hostnames that are always open, set as a comma-separated SITE_OPEN_HOSTS
 * (e.g. "enovenyc.com"). Lets one domain stay public for reviewers while the
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (/\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = await edgeAccessToken("admin");
    if (request.cookies.get("white_glove_admin")?.value !== token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
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
    response.cookies.set("white_glove_site_access", await edgeAccessToken("site"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // a month, so a reviewer isn't locked out mid-review
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
      const token = await edgeAccessToken("site");
      if (request.cookies.get("white_glove_site_access")?.value !== token) {
        const url = new URL("/access", request.url);
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
