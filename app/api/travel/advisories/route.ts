import { NextRequest, NextResponse } from "next/server";
import { advisoryFor, fetchAdvisories } from "@/lib/travel-advisories";

// Cache at the edge for an hour — the feed changes rarely.
export const revalidate = 3600;

// Live U.S. State Department travel advisories. ?country=Ukraine narrows it to
// one. Always reports availability honestly rather than returning stale levels.
export async function GET(request: NextRequest) {
  const result = await fetchAdvisories();
  if (!result.available) return NextResponse.json(result, { status: 200 });

  const country = request.nextUrl.searchParams.get("country");
  if (country) {
    return NextResponse.json({
      available: true,
      country,
      advisory: advisoryFor(result.advisories, country),
      fetchedAt: result.fetchedAt,
    });
  }
  return NextResponse.json(result);
}
