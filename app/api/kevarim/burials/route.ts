import { NextRequest, NextResponse } from "next/server";
import { burialsForSlugs } from "@/lib/kever-search";

export const dynamic = "force-dynamic";

// Who is buried at each beis hachaim on an itinerary.
//
// The planner and the printed itinerary both ask for this by slug rather than
// storing the names on the stop, so a trip saved months ago still shows a kever
// we have added to that beis hachaim since.
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slugs") || "";
  const slugs = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200);
  return NextResponse.json({ burials: burialsForSlugs(slugs) });
}
