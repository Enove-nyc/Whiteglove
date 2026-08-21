import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, ensureTravelerShare, getCurrentAccountData } from "@/lib/account-store";
import { getPlan } from "@/lib/account-plan-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * A traveler's own door into the trip app — for a family or group trip where
 * one person (or one family, sharing a `family` label — data/itinerary.ts)
 * gets a link scoped to just them, rather than the one trip-wide link every
 * traveler would otherwise be handed alike. Business-only, same door as
 * handing the whole trip to a client at all.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!mayServeCompanionClients(await getPlan(account.email))) {
    return NextResponse.json({ error: "Handing a trip to a client is part of a Business account." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { tripId?: string; travelerId?: string } | null;
  const tripId = body?.tripId?.trim();
  const travelerId = body?.travelerId?.trim();
  if (!tripId || !travelerId) return NextResponse.json({ error: "Which trip, and which traveler?" }, { status: 400 });

  const shareId = await ensureTravelerShare(account.email, tripId, travelerId);
  if (!shareId) return NextResponse.json({ error: "Could not create that link." }, { status: 503 });
  return NextResponse.json({ shareId });
}
