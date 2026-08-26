import { NextRequest, NextResponse } from "next/server";
import { getPublicCemeteryList } from "@/lib/cemeteries-view";
import { listAllHeritageCemeteries } from "@/lib/heritage-cemeteries";
import { isOrder, MAX_PAGE, PAGE, searchCemeteryList, type Order } from "@/data/cemetery-list";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * The batei hachaim directory's search.
 *
 * WHY THE PAGE ASKS THE SERVER. It used to hold both sets in the browser to
 * search and merge them there — 242 guides with every name buried in each, and
 * 1,952 located grounds, 576KB of JSON — to draw cards showing a town and a
 * country. See data/cemetery-list.ts.
 *
 * NO KEY, NO NETWORK, NO COST — it walks lists already in the bundle, same as
 * /api/near, /api/kosher/search and /api/things-to-do/list, and is rate
 * limited for the same reason.
 */

const LIMIT = { limit: 120, windowSeconds: 60 };

export async function GET(request: NextRequest) {
  const flood = await rateLimit(`cemeteries:${requesterKey(request.headers)}`, LIMIT);
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

  const rawOrder = params.get("order") ?? "";
  const order: Order | undefined = isOrder(rawOrder) ? rawOrder : undefined;

  const [guides, heritage] = await Promise.all([getPublicCemeteryList(), listAllHeritageCemeteries()]);

  return NextResponse.json(
    searchCemeteryList(
      { guides, heritage },
      {
        query: params.get("q") ?? "",
        country: params.get("country") ?? "",
        order,
        offset: number("offset"),
        limit: Math.min(number("limit") ?? PAGE, MAX_PAGE),
      },
    ),
  );
}
