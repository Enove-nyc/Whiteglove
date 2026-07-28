import { NextRequest, NextResponse } from "next/server";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";
import { setAccessPassword, verifyAccessPassword } from "@/lib/access-passwords";

function isAdmin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  }
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as
    | { scope?: "admin" | "site" | "preview"; currentPassword?: string; newPassword?: string }
    | null;
  const scopes = ["admin", "site", "preview"] as const;
  if (!body || !scopes.includes(body.scope as (typeof scopes)[number])) {
    return NextResponse.json({ error: "Choose which password to change." }, { status: 400 });
  }
  const scope = body.scope as (typeof scopes)[number];

  // Changing the admin password requires confirming the current admin password.
  if (scope === "admin") {
    const ok = await verifyAccessPassword("admin", body.currentPassword || "");
    if (!ok) return NextResponse.json({ error: "Your current admin password is not correct." }, { status: 400 });
  }

  // The two site codes must not be the same string. They would still both
  // work, but whichever was checked first would decide how long access lasts —
  // so the five-minute code would silently become permanent.
  if (scope === "site" || scope === "preview") {
    const other = scope === "site" ? "preview" : "site";
    if (await verifyAccessPassword(other, body.newPassword || "")) {
      return NextResponse.json(
        { error: "That is already your other website code. Give the two codes different words." },
        { status: 400 },
      );
    }
  }

  const result = await setAccessPassword(scope, body.newPassword || "");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error.includes("database") ? 503 : 400 });
  }
  return NextResponse.json({ ok: true });
}
