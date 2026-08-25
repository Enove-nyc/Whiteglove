import { NextRequest, NextResponse } from "next/server";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";
import { recordAdminAction } from "@/lib/admin-actions-store";
import { setSiteLock } from "@/lib/site-analytics";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  if (!isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  const body = await request.json().catch(() => null) as { locked?: boolean } | null;
  if (!body || typeof body.locked !== "boolean") return NextResponse.json({ error: "Choose whether to lock the site." }, { status: 400 });
  const saved = await setSiteLock(body.locked);
  if (!saved) return NextResponse.json({ error: "Connect the analytics store before changing the site lock." }, { status: 503 });
  await recordAdminAction({ kind: body.locked ? "site-closed" : "site-opened" }, request.headers);
  return NextResponse.json({ ok: true, locked: body.locked });
}
