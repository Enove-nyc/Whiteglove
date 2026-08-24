import { NextRequest, NextResponse } from "next/server";
import { searchHotelPlaces } from "@/lib/hotel-places";
import { bucketTag, rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// The general hotel lookup (lib/hotel-places.ts) — any hotel, anywhere, via
// Google Places. Separate from /api/lodging/search, which is the site's own
// researched lodging and costs nothing to ask.
//
// RATE LIMITED FOR THE SAME REASON THE AI ASSISTANT IS (app/api/itinerary/ai/
// route.ts): this is a metered key with "free for now" as the whole budget.
// A per-visitor limit stops one runaway form; the site-wide ceiling stops a
// script that rotates its address, so the worst case stays a number the
// owner has agreed to rather than whatever a loop can spend overnight.
const VISITOR_LIMIT = { limit: 15, windowSeconds: 60 };
const SITE_CEILING = [
  { key: "hotel-places:all:minute", limit: 60, windowSeconds: 60 },
  { key: "hotel-places:all:day", limit: 1500, windowSeconds: 86_400 },
];

export async function GET(request: NextRequest) {
  const who = requesterKey(request.headers);
  const bucket = `hotel-places:${who}`;
  const flood = await rateLimit(bucket, VISITOR_LIMIT);
  const limitHeaders: Record<string, string> = {
    "x-ratelimit-limit": String(VISITOR_LIMIT.limit),
    "x-ratelimit-remaining": String(Math.max(0, flood.remaining)),
    "x-ratelimit-store": flood.store,
    "x-ratelimit-bucket": bucketTag(bucket),
  };

  if (!flood.ok) {
    return NextResponse.json(
      { results: [], reason: tooManyMessage(flood.retryAfter) },
      { status: 429, headers: { ...limitHeaders, "retry-after": String(Math.max(1, flood.retryAfter)) } },
    );
  }

  for (const ceiling of SITE_CEILING) {
    const room = await rateLimit(ceiling.key, ceiling);
    if (!room.ok) {
      console.warn("[hotel-places] site-wide ceiling reached", ceiling.key, `retry in ${room.retryAfter}s`);
      return NextResponse.json(
        { results: [], reason: "Hotel search is busy right now. Please try again in a few minutes." },
        { status: 429, headers: { ...limitHeaders, "x-ratelimit-scope": "site", "retry-after": String(Math.max(1, room.retryAfter)) } },
      );
    }
  }

  const q = request.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 3) return NextResponse.json({ results: [] }, { headers: limitHeaders });

  return NextResponse.json({ results: await searchHotelPlaces(q) }, { headers: limitHeaders });
}
