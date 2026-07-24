import { NextRequest, NextResponse } from "next/server";
import { trackPageView, trackSearch } from "@/lib/site-analytics";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { type?: string; value?: string } | null;
  if (!body || typeof body.value !== "string") return NextResponse.json({ ok: false }, { status: 400 });
  if (body.type === "page_view") await trackPageView(body.value);
  else if (body.type === "search") await trackSearch(body.value);
  else return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
