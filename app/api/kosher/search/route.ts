import { NextRequest, NextResponse } from "next/server";
import { kosherEateries } from "@/data/kosher-eateries";
import { MAX_PAGE, searchEateries } from "@/data/eatery-search";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Searching the kosher listings, for the /kosher page's own search box.
 *
 * WHY THE PAGE ASKS THE SERVER NOW. It used to hold all 1,466 listings in the
 * browser and filter them there, which is a megabyte of data sent to draw
 * sixty cards. The matching moved to the server (data/eatery-search.ts) and
 * only what is drawn is sent.
 *
 * NO KEY, NO NETWORK, NO COST — it walks a file already in the bundle, same as
 * /api/near. Rate limited for the same reason that one is: an open endpoint
 * that scans 1,466 records per call is a free way to make the server work.
 * Generous enough that typing a city name a letter at a time never reaches it.
 *
 * What comes back is titles, addresses and links — the same things the page
 * has always shown, and the same things the sitemap shows.
 */

const LIMIT = { limit: 120, windowSeconds: 60 };

export async function GET(request: NextRequest) {
  const flood = await rateLimit(`kosher-search:${requesterKey(request.headers)}`, LIMIT);
  if (!flood.ok) {
    return NextResponse.json({ error: tooManyMessage(flood.retryAfter) }, { status: 429 });
  }

  const params = request.nextUrl.searchParams;
  /**
   * A number, or undefined when the parameter is absent — and ABSENT IS NOT
   * ZERO, which is the trap this fell into: Number(null) is 0, not NaN, so an
   * omitted limit read as a perfectly valid zero, clamped up to one, and
   * /api/kosher/search?q=dinitz answered with a single row and "there is more".
   * The page never saw it because the page always sends a limit.
   */
  const number = (name: string) => {
    const raw = params.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.trunc(value) : undefined;
  };

  // searchEateries clamps the limit itself (MAX_PAGE); named here so the cap is
  // visible at the edge rather than only in the data layer.
  const results = searchEateries(kosherEateries, {
    query: params.get("q") ?? "",
    country: params.get("country") ?? "",
    kind: params.get("kind") ?? "",
    offset: number("offset"),
    limit: Math.min(number("limit") ?? 60, MAX_PAGE),
  });

  return NextResponse.json(results);
}
