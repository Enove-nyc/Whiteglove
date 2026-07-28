import { NextRequest, NextResponse } from "next/server";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";
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
    return NextResponse.json({
      ok: true,
      generation,
      message: "Everybody signed out. Anyone who still needs in will have to enter a code again.",
    });
  }

  if (body?.action === "clear-log") {
    const ok = await clearSignIns();
    return ok
      ? NextResponse.json({ ok: true, message: "The log is empty." })
      : NextResponse.json({ error: "This needs the private store connected." }, { status: 503 });
  }

  return NextResponse.json({ error: "Say what to do." }, { status: 400 });
}
