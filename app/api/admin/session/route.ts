import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, readSessionEmail } from "@/lib/account-store";
import { isAdminAccount } from "@/lib/admin-roles";
import { ADMIN_WHO_COOKIE, signWho } from "@/lib/admin-session";
import { checkSecondFactor, twoFactorRequired } from "@/lib/admin-2fa-store";
import { recordFailedAttempt, tooManyAttempts } from "@/lib/access-attempts";
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
 *
 * SECOND FACTOR, WHEN THIS ADMIN HAS ONE. An account password is one secret
 * and behind it is the finances, every visitor's contact details and the
 * switch that closes the site. Where a code is enrolled it is demanded here,
 * and the answer is deliberately two-stage: a request with no code, from
 * somebody who is genuinely an administrator, is told `needsCode` so the
 * screen can ask — rather than being refused as though the account were
 * wrong. Nothing is demanded of an admin who has not enrolled.
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

  if (await twoFactorRequired(email)) {
    const body = (await request.json().catch(() => null)) as { code?: string } | null;
    const code = body?.code?.trim();
    // Asked for, not refused — this account IS an administrator, it just has
    // not proved the second factor yet.
    if (!code) return NextResponse.json({ needsCode: true }, { status: 401 });

    // Six digits is few enough to guess if guessing is free. Counted under
    // the same roof as the password attempts, so an attacker cannot get a
    // fresh budget by switching doors.
    const blocked = await tooManyAttempts(request, "admin");
    if (blocked) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${blocked.minutes} minute${blocked.minutes === 1 ? "" : "s"}.` },
        { status: 429 },
      );
    }
    const second = await checkSecondFactor(email, code);
    if (!second.ok) {
      await recordFailedAttempt(request, "admin");
      return NextResponse.json({ needsCode: true, error: second.error }, { status: 401 });
    }
    if (second.usedRecoveryCode) {
      console.warn("[admin] recovery code used", { email, left: second.recoveryCodesLeft });
    }
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
