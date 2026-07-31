import { NextRequest, NextResponse } from "next/server";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";
import { accountCookieName, createSessionCookie, verifyAccountStatus } from "@/lib/account-store";
import { hasSiteAccess } from "@/lib/admin-roles";
import { identityKey } from "@/lib/identity";
import { recordSignIn, whereFrom } from "@/lib/signin-log";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) return NextResponse.json({ error: "Enter your email address or phone number, and your password." }, { status: 400 });
  for (const key of [`login:${body.email.toLowerCase()}`, `login-ip:${requesterKey(request.headers)}`]) {
    const gate = await rateLimit(key, { limit: 10, windowSeconds: 15 * 60 });
    if (!gate.ok) return NextResponse.json({ error: tooManyMessage(gate.retryAfter) }, { status: 429, headers: { "Retry-After": String(gate.retryAfter) } });
  }
  const status = await verifyAccountStatus(body.email, body.password);
  if (!status.ok) {
    if (status.reason === "unverified") return NextResponse.json({ error: "That account is still waiting for its verification code.", verificationRequired: true }, { status: 401 });
    return NextResponse.json({ error: "Those details do not match our records." }, { status: 401 });
  }
  // Whatever they typed, the account is keyed by one spelling — the session
  // and the log both have to use it, or the log records a person who does not
  // exist and the cookie signs in a different account than the one checked.
  const email = identityKey(body.email);
  // "invited" is somebody the owner let in by name, who never needed a code.
  // Worth telling apart in the log from an ordinary visitor account.
  await recordSignIn({
    at: new Date().toISOString(),
    how: (await hasSiteAccess(email)) ? "invited" : "account",
    email,
    ...whereFrom(request.headers),
  });

  const response = NextResponse.json({ ok: true, email });
  response.cookies.set(accountCookieName(), createSessionCookie(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
