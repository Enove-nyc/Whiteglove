import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, createSessionCookie, verifyAccount } from "@/lib/account-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) return NextResponse.json({ error: "Enter an email and password." }, { status: 400 });
  const valid = await verifyAccount(body.email, body.password);
  if (!valid) return NextResponse.json({ error: "That email or password does not match our records." }, { status: 401 });
  const response = NextResponse.json({ ok: true, email: body.email.trim().toLowerCase() });
  response.cookies.set(accountCookieName(), createSessionCookie(body.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
