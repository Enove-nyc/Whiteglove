import { NextRequest, NextResponse } from "next/server";
import { searchAttractions } from "@/lib/attraction-search";

export const dynamic = "force-dynamic";

// Search the site's things-to-do listings for the itinerary planner's picker,
// so a traveler drops in a place we already hold the address and position for
// instead of typing them. Reads through lib/attractions-view.ts, so an entry
// the owner added in the admin is here too.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  return NextResponse.json({ results: await searchAttractions(q) });
}
