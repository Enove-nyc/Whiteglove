import { NextRequest, NextResponse } from "next/server";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";
import { recordAdminAction } from "@/lib/admin-actions-store";
import { clearSignIns, revokeAllAccess } from "@/lib/signin-log";

function isAdmin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

/**
 * Revoke everybody, or forget the log.
 *
 * Revoking raises the generation every access cookie is signed against, so
 * every code already handed out and every browser already carrying a cookie
 * stops working at once. The codes themselves still work — change those on the
 * Passwords screen if somebody has one they should not.
 */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { action?: string } | null;

  if (body?.action === "revoke-all") {
    const generation = await revokeAllAccess();
    if (generation === null) {
      return NextResponse.json({ error: "This needs the private store connected." }, { status: 503 });
    }
    await recordAdminAction({ kind: "sessions-revoked" }, request.headers);
    return NextResponse.json({
      ok: true,
      generation,
      message: "Everybody signed out. Anyone who still needs in will have to enter a code again.",
    });
  }

  if (body?.action === "clear-log") {
    const ok = await clearSignIns();
    if (!ok) return NextResponse.json({ error: "This needs the private store connected." }, { status: 503 });
    // Emptying the sign-in log is itself recorded, in the log that cannot be
    // emptied from in here. Otherwise the one action that erases the evidence
    // is the one action that leaves none.
    await recordAdminAction({ kind: "signin-log-cleared" }, request.headers);
    return NextResponse.json({ ok: true, message: "The log is empty." });
  }

  return NextResponse.json({ error: "Say what to do." }, { status: 400 });
}
