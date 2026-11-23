import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, ensureTravelerShare, getCurrentAccountData, resolveBusinessOwner } from "@/lib/account-store";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const owner = await resolveBusinessOwner(account.email);
  const body = (await request.json().catch(() => null)) as { tripId?: unknown; travelerId?: unknown } | null;
  const tripId = typeof body?.tripId === "string" ? body.tripId.trim() : "";
  const travelerId = typeof body?.travelerId === "string" ? body.travelerId.trim() : "";
  if (!tripId || !travelerId) return NextResponse.json({ error: "Choose a saved trip and traveler." }, { status: 400 });
  const allowed = await rateLimit(`traveler-share:${account.email}`, { limit: 30, windowSeconds: 60 });
  if (!allowed.ok) return NextResponse.json({ error: "Please wait a moment before making another code." }, { status: 429 });

  const shareId = await ensureTravelerShare(owner, tripId, travelerId);
  if (!shareId) return NextResponse.json({ error: "Could not create that link." }, { status: 503 });
  return NextResponse.json({ shareId }, { headers: { "Cache-Control": "private, no-store" } });
}
