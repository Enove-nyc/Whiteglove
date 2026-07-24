import { NextRequest, NextResponse } from "next/server";
import { trackPageView, trackSearch } from "@/lib/site-analytics";
import { recordPromotionEvent } from "@/lib/admin-content";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { type?: string; value?: string; id?: string } | null;
  if (!body) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (body.type === "page_view" || body.type === "search") {
    if (typeof body.value !== "string") return NextResponse.json({ ok: false }, { status: 400 });
    if (body.type === "page_view") await trackPageView(body.value);
    else await trackSearch(body.value);
  }
  else if (body.type === "promotion_view" || body.type === "promotion_click") {
    if (!body.id) return NextResponse.json({ ok: false }, { status: 400 });
    await recordPromotionEvent(body.id, body.type === "promotion_view" ? "impression" : "click");
  }
  else return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
