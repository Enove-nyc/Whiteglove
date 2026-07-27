import { NextRequest, NextResponse } from "next/server";
import { nearbyPlaces } from "@/lib/nearby";

export const dynamic = "force-dynamic";

// Nearby kever/cemetery suggestions for a coordinate, from the site's listings.
export async function GET(request: NextRequest) {
  const coordinates = request.nextUrl.searchParams.get("coordinates") || "";
  const exclude = (request.nextUrl.searchParams.get("exclude") || "").split("|").map((s) => s.trim()).filter(Boolean);
  if (!coordinates) return NextResponse.json({ suggestions: [] });
  return NextResponse.json({ suggestions: nearbyPlaces(coordinates, { excludeNames: exclude }) });
}
