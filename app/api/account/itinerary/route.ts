import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, getTripItinerary, resolveBusinessOwner, saveAccountItinerary } from "@/lib/account-store";
import type { Itinerary } from "@/data/itinerary";

export const dynamic = "force-dynamic";

// Read one of the signed-in traveler's itineraries. Without ?trip= it is the
// one they have open, which is what the builder asks for on load.
//
// A staff login reads and writes the business it's linked to, not its own
// (otherwise empty) account — see lib/account-store.ts's
// resolveBusinessOwner. An account with no team just resolves to itself.
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const owner = await resolveBusinessOwner(account.email);
  const wanted = request.nextUrl.searchParams.get("trip") ?? undefined;
  const trip = await getTripItinerary(owner, wanted);
  return NextResponse.json({
    itinerary: trip?.itinerary ?? null,
    tripId: trip?.tripId ?? null,
    tripName: trip?.tripName ?? null,
    /** Who it is for, when a Business account planned it for somebody. */
    client: trip?.client ?? "",
  });
}

// Save the traveler's itinerary into a trip — the open one unless told which.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { itinerary?: Itinerary; tripId?: string } | null;
  if (!body?.itinerary) return NextResponse.json({ error: "Provide an itinerary." }, { status: 400 });
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const owner = await resolveBusinessOwner(account.email);
  const saved = await saveAccountItinerary(owner, body.itinerary, body.tripId);
  if (!saved) return NextResponse.json({ error: "Could not save the itinerary." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
