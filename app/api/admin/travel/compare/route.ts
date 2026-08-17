import { NextResponse, type NextRequest } from "next/server";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";
import { searchTravel } from "@/lib/travel/engine";
import { TRAVEL_CATEGORIES, type TravelCategory } from "@/lib/travel/types";

export const dynamic = "force-dynamic";

/**
 * The comparison tool's search — admin only, and guarded here rather than by
 * the absence of a link to it.
 *
 * Same rule as lib/duffel-guard.ts: taking a button off a page does not close
 * a door. This one spends real provider calls, so it answers 404 to anybody
 * without the admin cookie — 404 rather than 401, because a stranger has no
 * business learning that the endpoint exists.
 *
 * `audience: "admin"` is what lets a provider in Testing answer. That is the
 * ONLY place in the codebase that value is passed, and it is on a route no
 * visitor can reach.
 */
export async function POST(request: NextRequest) {
  if (!isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    category?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
  } | null;

  const category = String(body?.category ?? "") as TravelCategory;
  if (!TRAVEL_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Choose flights, hotels or cars." }, { status: 400 });
  }
  const destination = String(body?.destination ?? "").trim().slice(0, 120);
  if (!destination) return NextResponse.json({ error: "Enter somewhere to search." }, { status: 400 });

  const date = (value: unknown) => {
    const text = String(value ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  };
  const startDate = date(body?.startDate);
  if (!startDate) return NextResponse.json({ error: "Choose a start date." }, { status: 400 });
  const endDate = date(body?.endDate) || undefined;
  if (endDate && endDate < startDate) {
    return NextResponse.json({ error: "The second date is before the first." }, { status: 400 });
  }

  const outcome = await searchTravel(
    category,
    { destination, startDate, endDate },
    "admin",
    // Longer than a visitor would wait: here a slow honest answer is the thing
    // being measured. Not recorded either — measuring is not real traffic.
    { deadlineMs: 15000, record: false },
  );

  return NextResponse.json({
    partial: outcome.partial,
    tried: outcome.tried.map((attempt) => ({
      provider: attempt.provider,
      ok: attempt.ok,
      ms: attempt.ms,
      count: attempt.count,
      error: attempt.error,
      timedOut: attempt.timedOut,
    })),
    offers: outcome.offers.map((offer) => ({
      id: offer.id,
      headline: offer.headline,
      detail: offer.detail,
      price: offer.price,
      fulfilment: offer.fulfilment,
      provider: offer.meta.provider,
    })),
  });
}
