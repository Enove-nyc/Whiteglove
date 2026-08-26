import { NextRequest, NextResponse } from "next/server";
import { getAttractionList } from "@/lib/attractions-view";
import { heritageAsAttractions } from "@/lib/heritage-attractions";
import { attractionBySlug, MAX_PAGE, PAGE, searchAttractionList } from "@/data/attraction-list";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * The things-to-do directory's own search, and its anchor lookup.
 *
 * WHY THE PAGE ASKS THE SERVER. It used to hold all 781 attractions in the
 * browser to filter them there and draw 24 — the heaviest page on the site
 * for three per cent of what it carried. See data/attraction-list.ts.
 *
 * `slug` answers the other half: a fragment never reaches the server, so
 * /things-to-do#polin-museum arrives here as an ordinary page load and the
 * entry has to be asked for once the page is running.
 *
 * NO KEY, NO NETWORK, NO COST — it walks a list already in the bundle, same as
 * /api/near and /api/kosher/search, and is rate limited for the same reason.
 */

const LIMIT = { limit: 120, windowSeconds: 60 };

async function everything() {
  return [...(await getAttractionList()), ...heritageAsAttractions()];
}

export async function GET(request: NextRequest) {
  const flood = await rateLimit(`things-to-do:${requesterKey(request.headers)}`, LIMIT);
  if (!flood.ok) {
    return NextResponse.json({ error: tooManyMessage(flood.retryAfter) }, { status: 429 });
  }

  const params = request.nextUrl.searchParams;
  // Absent is not zero: Number(null) is 0, which would read as a valid limit.
  const number = (name: string) => {
    const raw = params.get(name);
    if (raw === null || raw.trim() === "") return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.trunc(value) : undefined;
  };

  const all = await everything();

  const slug = (params.get("slug") ?? "").trim();
  if (slug) {
    const row = attractionBySlug(all, slug);
    return NextResponse.json({ rows: row ? [row] : [], more: false });
  }

  return NextResponse.json(
    searchAttractionList(all, {
      query: params.get("q") ?? "",
      country: params.get("country") ?? "",
      kind: params.get("kind") ?? "",
      city: params.get("city") ?? "",
      offset: number("offset"),
      limit: Math.min(number("limit") ?? PAGE, MAX_PAGE),
    }),
  );
}
