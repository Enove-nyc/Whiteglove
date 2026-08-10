import { NextRequest, NextResponse } from "next/server";
import { trackPageView, trackSearch, trackSearchSelection } from "@/lib/site-analytics";
import { recordPromotionEvent } from "@/lib/admin-content";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    type?: string;
    value?: string;
    id?: string;
    found?: number;
    kind?: string;
  } | null;
  if (!body) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (body.type === "page_view" || body.type === "search") {
    if (typeof body.value !== "string") return NextResponse.json({ ok: false }, { status: 400 });
    if (body.type === "page_view") await trackPageView(body.value);
    // `found` is how many results the person was actually shown. A search that
    // showed none is recorded separately — it is somebody asking for something
    // this site has never heard of.
    else await trackSearch(body.value, typeof body.found === "number" ? body.found : undefined);
  }
  else if (body.type === "search_select") {
    // Kind only — never the query — so selected-result analytics carry no PII.
    if (typeof body.kind !== "string") return NextResponse.json({ ok: false }, { status: 400 });
    await trackSearchSelection(body.kind);
  }
  else if (body.type === "promotion_view" || body.type === "promotion_click") {
    if (!body.id) return NextResponse.json({ ok: false }, { status: 400 });
    await recordPromotionEvent(body.id, body.type === "promotion_view" ? "impression" : "click");
  }
  else return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
