import { NextRequest, NextResponse } from "next/server";
import { searchSiteAnchors, type NearAnchor } from "@/lib/near-anchors";
import { findPlaces } from "@/lib/place-lookup";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Where do you want to measure from?
 *
 * TWO SOURCES, THE FREE ONE FIRST. The site's own anchors — every airport,
 * every Jewish quarter, every thing to do that carries a position — are read
 * from files already in the bundle and cost nothing, so they answer first and
 * answer instantly. Only when they leave room does this ask OpenStreetMap,
 * which covers the rest of what somebody might type: a city with no quarter
 * listed, a street address, a postcode.
 *
 * NEITHER IS A LISTING. A result here is a point to hold a ruler against, not
 * White Glove saying a place is worth going to and not a place the site has
 * checked. Nothing is stored, and the reasoning is written out at the top of
 * lib/near-anchors.ts.
 *
 * NO GOOGLE KEY IS TOUCHED. The hotel lookup is metered and stays behind a
 * deliberate press on the page that needs it; this one is free either way, so
 * it can safely run while somebody types.
 */

const LIMIT = { limit: 30, windowSeconds: 60 };

/** Below this, ask the wider world too. Above it, the site already answered. */
const ENOUGH = 4;

export async function GET(request: NextRequest) {
  const flood = await rateLimit(`near-where:${requesterKey(request.headers)}`, LIMIT);
  if (!flood.ok) {
    return NextResponse.json({ results: [], error: tooManyMessage(flood.retryAfter) }, { status: 429 });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const site = searchSiteAnchors(q, 6);
  if (site.length >= ENOUGH || q.length < 3) return NextResponse.json({ results: site });

  const world = await findPlaces(q);
  const seen = new Set(site.map((anchor) => anchor.label.toLocaleLowerCase("en")));
  const extra: NearAnchor[] = [];
  for (const place of world) {
    const key = place.name.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    seen.add(key);
    extra.push({
      id: `place:${place.id}`,
      label: place.name,
      hint: place.country,
      at: `${place.latitude}, ${place.longitude}`,
      kind: "place",
    });
    if (site.length + extra.length >= 8) break;
  }

  return NextResponse.json({ results: [...site, ...extra] });
}
