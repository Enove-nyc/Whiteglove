import { NextRequest, NextResponse } from "next/server";
import { getActivePromotions } from "@/lib/admin-content";

export const dynamic = "force-dynamic";

// Public endpoint the site-wide promotion renderer calls with the current path.
// Returns the top-priority active promotion for each globally-rendered
// placement (thin top banner, entry popup, sticky bottom banner). Fails safe:
// returns nulls when the content store isn't configured.
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") || "/";
  const userAgent = request.headers.get("user-agent") || "";
  const device = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";

  try {
    const [topBanner, popup, bottomBanner] = await Promise.all([
      getActivePromotions("fixed-top-banner", path, device),
      getActivePromotions("popup", path, device),
      getActivePromotions("sticky-bottom-banner", path, device),
    ]);
    return NextResponse.json({
      topBanner: topBanner[0] ?? null,
      popup: popup[0] ?? null,
      bottomBanner: bottomBanner[0] ?? null,
    });
  } catch {
    return NextResponse.json({ topBanner: null, popup: null, bottomBanner: null });
  }
}
