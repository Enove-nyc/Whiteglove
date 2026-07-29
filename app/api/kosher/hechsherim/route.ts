import { NextRequest, NextResponse } from "next/server";
import { hechsherimFor, listAgencies } from "@/lib/hechsher-store";

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
  // The agencies go out with the statuses because the badge needs both: a
  // place can be marked with a hechsher the owner added, and without the list
  // the circle would have no name and no mark to draw.
  const [hechsherim, agencies] = await Promise.all([hechsherimFor(ids), listAgencies()]);
  return NextResponse.json({ hechsherim, agencies });
}
