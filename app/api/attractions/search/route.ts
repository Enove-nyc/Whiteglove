import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/attraction-search";

export const dynamic = "force-dynamic";

// Search everything a day can hold — an attraction, a kosher place to eat, a
// shul, a mikvah — for the itinerary planner's picker, so a traveler drops in a
// place we already hold the address and position for instead of typing them.
// searchPlaces reads the same database the kosher site does, so an entry the
// owner added in the admin is here the moment it is saved. (Kevarim keep their
// own picker; see the builder.)
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  return NextResponse.json({ results: await searchPlaces(q) });
}
