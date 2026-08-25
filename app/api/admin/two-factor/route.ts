import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin-current";
import {
  beginTwoFactor,
  clearTwoFactor,
  confirmTwoFactor,
  regenerateRecoveryCodes,
  SHARED_DOOR,
  twoFactorStorageAvailable,
} from "@/lib/admin-2fa-store";
import { otpauthUri } from "@/lib/totp";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * Setting up, or turning off, the admin's second factor.
 *
 * ONLY EVER FROM INSIDE THE ADMIN. Every action here is guarded by already
 * holding a valid admin session — you cannot enrol a factor onto a door you
 * are not already through, and you cannot remove one either. That is the whole
 * authorisation model and it is deliberately blunt: anybody who can reach this
 * endpoint can already do everything the admin does.
 *
 * WHICH DOOR IS DECIDED BY THE SESSION, NEVER BY THE REQUEST. Somebody signed
 * in as themselves manages their own factor; somebody signed in with the
 * shared password manages the shared one. A `who` in the body would let a
 * holder of the shared password enrol — or disable — the owner's own second
 * factor, which is the exact thing this feature exists to prevent.
 *
 * THE SECRET IS NOT STORED UNTIL IT IS PROVEN. `begin` generates one and hands
 * it back; nothing is written until `confirm` arrives with a code the app
 * actually produced. A secret stored on generation is how somebody is locked
 * out by a phone whose clock is wrong or an enrolment they never finished.
 */

/**
 * Which factor this session is allowed to manage — from the session, never
 * the body.
 *
 * Through currentAdmin, which VERIFIES the admin cookie rather than merely
 * finding one. Reading the cookie jar directly and taking a non-empty value as
 * proof would let anybody who can set a cookie named `white_glove_admin` to
 * any string at all disable the owner's second factor — see
 * tests/admin-auth.test.ts, the repo-wide rule that every admin route goes
 * through one of the two real checks.
 */
async function doorForSession(): Promise<{ who: string; label: string } | null> {
  const { identity } = await currentAdmin();
  if (!identity) return null;
  return identity.how === "account"
    ? { who: identity.email, label: identity.email }
    : { who: SHARED_DOOR, label: "the shared admin password" };
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const door = await doorForSession(); // currentAdmin() — the verified cookie
  if (!door) return NextResponse.json({ error: "Open the admin first." }, { status: 401 });
  if (!twoFactorStorageAvailable()) {
    return NextResponse.json({ error: "This needs the private store connected." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { action?: string; secret?: string; code?: string } | null;

  if (body?.action === "begin") {
    const { secret } = beginTwoFactor();
    return NextResponse.json({
      ok: true,
      secret,
      // Tapped on the phone itself this opens the authenticator with
      // everything filled in; the secret is shown as text too, for setting it
      // up on a phone that is not the one reading this screen.
      uri: otpauthUri({ secret, account: door.label, issuer: "White Glove" }),
    });
  }

  if (body?.action === "confirm") {
    if (!body.secret?.trim() || !body.code?.trim()) {
      return NextResponse.json({ error: "Start again — the setup did not carry through." }, { status: 400 });
    }
    const result = await confirmTwoFactor(door.who, body.secret.trim(), body.code.trim());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, recoveryCodes: result.recoveryCodes });
  }

  if (body?.action === "regenerate") {
    const result = await regenerateRecoveryCodes(door.who);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, recoveryCodes: result.recoveryCodes });
  }

  if (body?.action === "disable") {
    const cleared = await clearTwoFactor(door.who);
    if (!cleared) return NextResponse.json({ error: "Could not turn it off. Nothing was changed." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
