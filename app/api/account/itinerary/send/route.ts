import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { mayBrandOwnItinerary } from "@/lib/account-limits";
import { PLAN_LABELS } from "@/lib/account-plans";
import { getPlan } from "@/lib/account-plan-store";
import { accountCookieName, ensureItineraryShare, getCurrentAccountData, getTripItinerary, resolveBusinessOwner } from "@/lib/account-store";
import { printBrandFor } from "@/lib/business-brand";
import { readBrand } from "@/lib/business-brand-store";
import { sendItineraryToClient } from "@/lib/email";
import { rateLimit, tooManyMessage } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";
import { siteOrigin } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";

export const dynamic = "force-dynamic";

/**
 * Sending a finished itinerary to the client it was planned for.
 *
 * THIS ROUTE SENDS EMAIL TO AN ADDRESS SOMEBODY TYPED IN, WHICH IS THE SHAPE OF
 * EVERY SPAM RELAY EVER BUILT. So it is fenced in on four sides, and the fences
 * matter more than the feature:
 *
 *   · Advisor Pro only, checked against the plan on the server.
 *   · The only link it can send is this account's own share link for their own
 *     trip. There is no url in the request and no way to put one there.
 *   · The only free text is a short note, which appears under the business's
 *     own name — so anything written in it is written as them, to somebody who
 *     is expecting to hear from them.
 *   · Rate limited per account. An agent sends a handful of these a day; a
 *     script would want thousands, and the number below is the difference.
 *
 * IT NEEDS A BRAND, DELIBERATELY. The whole message is "your itinerary from
 * <business>", and without a name to put there it would arrive from nobody
 * about nothing. Somebody who has not set up their letterhead is told to, which
 * is a better answer than an email signed "White Glove" that their client did
 * not expect.
 */

/** Per account, per day. A working agent is nowhere near this. */
const SEND_LIMIT = { limit: 30, windowSeconds: 24 * 60 * 60 };

const MAX_NOTE = 600;

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  // The trip, the brand and the plan gate are the business's — a staff login
  // sends the SAME trip the owner would. Who the client actually replies to
  // (below) stays the person who clicked send, not the business's owner.
  const owner = await resolveBusinessOwner(account.email);

  const plan = await getPlan(owner);
  if (!mayBrandOwnItinerary(plan)) {
    return NextResponse.json({ error: `Sending an itinerary to a client is part of ${PLAN_LABELS.pro}.` }, { status: 403 });
  }

  const brand = printBrandFor(await readBrand(owner), true);
  if (!brand) {
    return NextResponse.json(
      { error: "Set up your business name first — the email goes out as you, and it needs a name to go out as." },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => null)) as { to?: string; note?: string; tripId?: string } | null;
  const to = body?.to?.trim().toLowerCase() ?? "";
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Enter your client's email address." }, { status: 400 });
  }
  const note = body?.note?.trim().slice(0, MAX_NOTE) || undefined;

  const limited = await rateLimit(`itinerary-send:${account.email.toLowerCase()}`, SEND_LIMIT);
  if (!limited.ok) return NextResponse.json({ error: tooManyMessage(limited.retryAfter) }, { status: 429 });

  const trip = await getTripItinerary(owner, body?.tripId);
  if (!trip) return NextResponse.json({ error: "There is no trip to send." }, { status: 404 });

  // The share link is made here if it does not exist. Sending somebody a link
  // and asking them to press "share" first would be a step that exists only
  // because the code was written in the wrong order.
  const shareId = await ensureItineraryShare(owner);
  if (!shareId) return NextResponse.json({ error: "Could not make the link to send. Try again." }, { status: 503 });

  const origin = siteOrigin()?.origin || request.nextUrl.origin;
  const result = await sendItineraryToClient({
    to,
    from: brand.name,
    replyTo: account.email,
    tripTitle: trip.itinerary?.title || trip.tripName || "your trip",
    note,
    url: `${origin}/i/${shareId}`,
    siteBrand: await currentBrand(),
  });

  if (!result.ok) {
    console.error("[itinerary send] failed:", result.error);
    return NextResponse.json({ error: "That could not be sent just now. Try again shortly." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, to, url: `${origin}/i/${shareId}` });
}
