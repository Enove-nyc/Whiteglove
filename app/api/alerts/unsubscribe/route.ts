import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/email-alerts-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const result = await unsubscribeByToken(body?.token ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, message: "You have been unsubscribed." });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await unsubscribeByToken(token);
  const url = new URL("/alerts/unsubscribed", request.url);
  url.searchParams.set("ok", result.ok ? "1" : "0");
  if (result.error) url.searchParams.set("error", result.error);
  return NextResponse.redirect(url);
}
