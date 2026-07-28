import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, createSessionCookie, verifyAccountStatus } from "@/lib/account-store";
import { hasSiteAccess } from "@/lib/admin-roles";
import { recordSignIn, whereFrom } from "@/lib/signin-log";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) return NextResponse.json({ error: "Enter an email and password." }, { status: 400 });
  const status = await verifyAccountStatus(body.email, body.password);
  if (!status.ok) {
    if (status.reason === "unverified") return NextResponse.json({ error: "That account is waiting for email verification.", verificationRequired: true }, { status: 401 });
    return NextResponse.json({ error: "That email or password does not match our records." }, { status: 401 });
  }
  const email = body.email.trim().toLowerCase();
  // "invited" is somebody the owner let in by name, who never needed a code.
  // Worth telling apart in the log from an ordinary visitor account.
  await recordSignIn({
    at: new Date().toISOString(),
    how: (await hasSiteAccess(email)) ? "invited" : "account",
    email,
    ...whereFrom(request.headers),
  });

  const response = NextResponse.json({ ok: true, email });
  response.cookies.set(accountCookieName(), createSessionCookie(body.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
