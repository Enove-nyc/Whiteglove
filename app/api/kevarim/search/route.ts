import { NextRequest, NextResponse } from "next/server";
import { searchKevarim } from "@/lib/kever-search";

export const dynamic = "force-dynamic";

// Search the site's kever listings for the itinerary planner's kever picker.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  return NextResponse.json({ results: searchKevarim(q) });
}
