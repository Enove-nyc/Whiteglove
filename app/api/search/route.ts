import { NextRequest, NextResponse } from "next/server";
import { searchEverything } from "@/lib/site-search";

export const dynamic = "force-dynamic";

// The one search endpoint. The navbar bar asks this rather than carrying the
// site's data into the browser to search it — see lib/site-search.ts for why.
//
// Middleware lets /api/ through the site lock, which is correct for the site's
// own search box: the bar is on the /access page's chrome too, and a visitor
// who cannot search cannot find the page they are being asked to unlock. What
// comes back here is titles and links, the same things the sitemap shows.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const raw = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 25) : 8;
  return NextResponse.json({ results: await searchEverything(q, limit) });
}
