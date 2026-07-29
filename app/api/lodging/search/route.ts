import { NextRequest, NextResponse } from "next/server";
import { searchLodging } from "@/lib/lodging-search";

export const dynamic = "force-dynamic";

// Search the site's researched lodging for the itinerary planner's hotel picker.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  return NextResponse.json({ results: await searchLodging(q) });
}
