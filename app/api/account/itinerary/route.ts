import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getAccountData, getCurrentAccountData, saveAccountItinerary } from "@/lib/account-store";
import type { Itinerary } from "@/data/itinerary";

export const dynamic = "force-dynamic";

// Read the signed-in traveler's saved itinerary.
export async function GET() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const data = await getAccountData(account.email);
  return NextResponse.json({ itinerary: data.itinerary ?? null });
}

// Save the traveler's itinerary.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { itinerary?: Itinerary } | null;
  if (!body?.itinerary) return NextResponse.json({ error: "Provide an itinerary." }, { status: 400 });
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const saved = await saveAccountItinerary(account.email, body.itinerary);
  if (!saved) return NextResponse.json({ error: "Could not save the itinerary." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
