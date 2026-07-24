import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, createSessionCookie, verifyEmailCode } from "@/lib/account-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; code?: string } | null;
  if (!body?.email || !body?.code) return NextResponse.json({ error: "Enter an email and verification code." }, { status: 400 });
  const result = await verifyEmailCode(body.email, body.code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const response = NextResponse.json({ ok: true, email: result.email });
  response.cookies.set(accountCookieName(), createSessionCookie(result.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
