import { NextRequest, NextResponse } from "next/server";
import { edgeAccessToken, edgeSiteIsLocked } from "@/lib/edge-lock";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = await edgeAccessToken("admin");
    if (request.cookies.get("white_glove_admin")?.value !== token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname !== "/access" && !pathname.startsWith("/admin") && await edgeSiteIsLocked()) {
    const token = await edgeAccessToken("site");
    if (request.cookies.get("white_glove_site_access")?.value !== token) {
      const url = new URL("/access", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
