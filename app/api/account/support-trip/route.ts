import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, createSupportTripCode, getCurrentAccountData, revokeSupportTripCode } from "@/lib/account-store";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This request must come from White Glove." }, { status: 403 });
  const jar = await cookies();
  const account = await getCurrentAccountData(jar.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ error: "Log in to share a saved itinerary." }, { status: 401 });
  const gate = await rateLimit(`support-trip:${account.email}`, { limit: 20, windowSeconds: 3600 });
  if (!gate.ok) return NextResponse.json({ error: "Try again later." }, { status: 429 });

  const body = await request.json().catch(() => null);
  if (typeof body?.revoke === "string") {
    return await revokeSupportTripCode(account.email, body.revoke)
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Could not revoke that code." }, { status: 400 });
  }
  if (typeof body?.tripId !== "string") return NextResponse.json({ error: "Choose a saved itinerary." }, { status: 400 });
  const code = await createSupportTripCode(account.email, body.tripId);
  if (!code) return NextResponse.json({ error: "Save this itinerary before sharing it with support." }, { status: 409 });
  return NextResponse.json({ code }, { headers: { "Cache-Control": "private, no-store" } });
}
