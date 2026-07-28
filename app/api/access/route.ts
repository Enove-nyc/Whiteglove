import { NextRequest, NextResponse } from "next/server";
import { accessToken, sameOrigin } from "@/lib/secure-access";
import { verifyAccessPassword } from "@/lib/access-passwords";
import { recordFailedAttempt, tooManyAttempts } from "@/lib/access-attempts";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { scope?: "admin" | "site"; password?: string } | null;
  if (!body || (body.scope !== "admin" && body.scope !== "site")) {
    return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
  }

  // Guessing a six-character password is only expensive if guessing is slow.
  const blocked = await tooManyAttempts(request, body.scope);
  if (blocked) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${blocked.minutes} minute${blocked.minutes === 1 ? "" : "s"}.` },
      { status: 429 },
    );
  }

  if (!(await verifyAccessPassword(body.scope, body.password || ""))) {
    await recordFailedAttempt(request, body.scope);
    return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
  }

  const token = accessToken(body.scope);
  if (!token) {
    // No signing secret means no cookie can be trusted, so none is issued.
    return NextResponse.json(
      { error: "This deployment has no session secret set, so it cannot sign you in. Set WHITE_GLOVE_SESSION_SECRET." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(body.scope === "admin" ? "white_glove_admin" : "white_glove_site_access", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: body.scope === "admin" ? 60 * 60 * 4 : 60 * 60 * 24,
    path: "/",
  });
  return response;
}
