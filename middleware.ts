import { NextRequest, NextResponse } from "next/server";
import { edgeAccessToken, edgeLockedPaths, edgeSiteIsLocked } from "@/lib/edge-lock";

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

  // /version reports only the deployed commit — no private content. It stays
  // reachable while the site is locked so the build can always be checked.
  if (pathname !== "/access" && pathname !== "/version" && !pathname.startsWith("/admin")) {
    let locked = await edgeSiteIsLocked();
    if (!locked) {
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
