import { NextRequest, NextResponse } from "next/server";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";
import { accountCookieName, createSessionCookie, verifyEmailCode } from "@/lib/account-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; code?: string } | null;
  if (!body?.email || !body?.code) return NextResponse.json({ error: "Enter an email and verification code." }, { status: 400 });
  // Keyed by the account AND by who is asking, so one attacker cannot lock a
  // stranger out of their own sign-up by burning the account's attempts, and
  // cannot escape the limit by spreading guesses across accounts either.
  for (const key of [`verify:${body.email.toLowerCase()}`, `verify-ip:${requesterKey(request.headers)}`]) {
    const gate = await rateLimit(key, { limit: 6, windowSeconds: 15 * 60 });
    if (!gate.ok) return NextResponse.json({ error: tooManyMessage(gate.retryAfter) }, { status: 429, headers: { "Retry-After": String(gate.retryAfter) } });
  }
  const result = await verifyEmailCode(body.email, body.code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const response = NextResponse.json({ ok: true, email: result.email });
  response.cookies.set(accountCookieName(), createSessionCookie(result.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
