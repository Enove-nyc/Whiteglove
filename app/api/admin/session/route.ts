import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, readSessionEmail } from "@/lib/account-store";
import { isAdminAccount } from "@/lib/admin-roles";
import { ADMIN_WHO_COOKIE, signWho } from "@/lib/admin-session";
import { accessToken, sameOrigin } from "@/lib/secure-access";
import { recordSignIn, whereFrom } from "@/lib/signin-log";

export const dynamic = "force-dynamic";

/**
 * Open the admin as yourself, without the shared password.
 *
 * The team screen grants a person `admin: true` and the account page then
 * offers them a way through to the admin. That link went straight to a
 * password prompt they had never been given the password for, so the grant did
 * nothing at all — the only way in was the one shared code, held by everybody
 * or nobody.
 *
 * This mints the same admin session the code does, for somebody the team
 * screen already says is an administrator, and records WHO alongside it.
 *
 * It grants nothing the shared password does not already grant. What it adds
 * is a name: the sign-in log stops saying "admin code" for every person alive,
 * and the header can say who you are.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const email = readSessionEmail(request.cookies.get(accountCookieName())?.value);
  if (!email) return NextResponse.json({ error: "Sign in to your account first." }, { status: 401 });

  // The team screen is the authority on this, not anything in the request.
  if (!(await isAdminAccount(email))) {
    return NextResponse.json({ error: "This account is not an administrator." }, { status: 403 });
  }

  const token = accessToken("admin");
  const who = signWho(email);
  if (!token || !who) {
    return NextResponse.json(
      { error: "This deployment has no session secret set, so it cannot sign you in." },
      { status: 503 },
    );
  }

  await recordSignIn({ at: new Date().toISOString(), how: "admin account", email, ...whereFrom(request.headers) });

  const response = NextResponse.json({ ok: true });
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    // The same four hours the shared code gets. Being a named administrator is
    // not a reason to stay signed in longer on a borrowed laptop.
    maxAge: 60 * 60 * 4,
    path: "/",
  };
  response.cookies.set("white_glove_admin", token, options);
  response.cookies.set(ADMIN_WHO_COOKIE, who, options);
  return response;
}
