import { NextRequest, NextResponse } from "next/server";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";
import { getLockedPaths, setLockedPaths } from "@/lib/site-analytics";

function isAdmin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  }
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { paths?: string[] } | null;
  if (!body || !Array.isArray(body.paths)) {
    return NextResponse.json({ error: "Choose which sections to lock." }, { status: 400 });
  }
  const saved = await setLockedPaths(body.paths);
  if (!saved) {
    return NextResponse.json({ error: "Connect the private database to lock sections." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, paths: await getLockedPaths() });
}
