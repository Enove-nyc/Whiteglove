import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, acknowledgeAlert, getCurrentAccountData } from "@/lib/account-store";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * Dismissing a live-travel alert (data/trip-alerts.ts) — the trip owner's own
 * side only. A client viewing the trip sees the same alert but has no
 * control to dismiss it, the same way they have no control over anything
 * else on the Changes screen; keeping the client app simple means it only
 * ever shows information, never asks it to manage state.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { tripId?: string; alertId?: string } | null;
  const tripId = body?.tripId?.trim();
  const alertId = body?.alertId?.trim();
  if (!tripId || !alertId) return NextResponse.json({ error: "Which trip, and which alert?" }, { status: 400 });

  const ok = await acknowledgeAlert(account.email, tripId, alertId);
  if (!ok) return NextResponse.json({ error: "Could not dismiss that." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
