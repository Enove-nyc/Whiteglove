import { NextRequest, NextResponse } from "next/server";
import { getActivePromotions, publicPromotion, type PromotionPlacement } from "@/lib/admin-content";
import { LIVE_PLACEMENTS } from "@/lib/ad-types";

export const dynamic = "force-dynamic";

function readDevice(request: NextRequest): "mobile" | "desktop" {
  const userAgent = request.headers.get("user-agent") || "";
  return /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
}

function isPlacement(value: string): value is PromotionPlacement {
  return (LIVE_PLACEMENTS as string[]).includes(value);
}

// Public endpoint the site-wide promotion renderer calls with the current path.
// Returns the top-priority active promotion for each globally-rendered
// placement (thin top banner, entry popup, sticky bottom banner), or one
// named placement when `placement` is set. Fails safe: returns nulls when the
// content store isn't configured.
//
// Whose it is never leaves this handler — publicPromotion strips the
// advertiser fields and the preview token.
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") || "/";
  const preview = request.nextUrl.searchParams.get("preview") || "";
  const placement = request.nextUrl.searchParams.get("placement") || "";
  const device = readDevice(request);

  try {
    if (placement) {
      if (!isPlacement(placement)) return NextResponse.json({ promotion: null });
      const list = await getActivePromotions(placement, path, device, preview);
      return NextResponse.json({ promotion: list[0] ? publicPromotion(list[0]) : null });
    }

    const [topBanner, popup, bottomBanner] = await Promise.all([
      getActivePromotions("fixed-top-banner", path, device, preview),
      getActivePromotions("popup", path, device, preview),
      getActivePromotions("sticky-bottom-banner", path, device, preview),
    ]);
    return NextResponse.json({
      topBanner: topBanner[0] ? publicPromotion(topBanner[0]) : null,
      popup: popup[0] ? publicPromotion(popup[0]) : null,
      bottomBanner: bottomBanner[0] ? publicPromotion(bottomBanner[0]) : null,
    });
  } catch {
    if (placement) return NextResponse.json({ promotion: null });
    return NextResponse.json({ topBanner: null, popup: null, bottomBanner: null });
  }
}
