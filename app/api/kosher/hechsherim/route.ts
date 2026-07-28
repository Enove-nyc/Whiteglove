import { NextRequest, NextResponse } from "next/server";
import { hechsherimFor } from "@/lib/hechsher-store";

export const dynamic = "force-dynamic";

// What the owner has confirmed about these places' hechsherim.
//
// Ids are OpenStreetMap ids ("node/1234"), which the kosher finder already
// has. Anything not confirmed comes back unverified rather than missing, so
// the badge never has to guess what silence means.
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
  const hechsherim = await hechsherimFor(ids);
  return NextResponse.json({ hechsherim });
}
