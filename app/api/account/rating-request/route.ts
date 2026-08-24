import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, getTripItinerary, markRatingRequestSent, resolveBusinessOwner } from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { readBrand } from "@/lib/business-brand-store";
import { sendRatingRequestEmail } from "@/lib/email";
import { rateHref } from "@/lib/experience-ratings";
import { rateLimit, tooManyMessage } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";
import { siteOrigin } from "@/lib/seo";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Per account, per day — the same fence app/api/account/itinerary/send/route.ts
 *  already keeps on the same shape of request (an address somebody typed in,
 *  emailed through the shared sender). A working advisor sends a handful of
 *  these a day; a script would want thousands. */
const SEND_LIMIT = { limit: 30, windowSeconds: 24 * 60 * 60 };

/**
 * Post-trip automation: send the client a request to rate how White Glove
 * did on a trip that's ended — see data/trip-reminders.ts's
 * trip_completed_no_rating_sent, which is what surfaces this on the
 * pipeline in the first place. BUSINESS ONLY, the same gate as the
 * pipeline it's reached from.
 *
 * THIS ROUTE SENDS EMAIL TO AN ADDRESS SOMEBODY TYPED IN — the same shape
 * as app/api/account/itinerary/send/route.ts, fenced the same way: rate
 * limited per account, and its one link is always this site's own
 * (siteOrigin(), not a header a request can spoof) pointing at the
 * existing /rate form — never a url the caller supplies.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const owner = await resolveBusinessOwner(account.email);
  if (!mayServeCompanionClients(await getPlan(owner))) {
    return NextResponse.json({ error: "Sending a rating request is part of a Business account." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { tripId?: string; clientEmail?: string } | null;
  const tripId = body?.tripId?.trim();
  const clientEmail = body?.clientEmail?.trim();
  if (!tripId) return NextResponse.json({ error: "Which trip?" }, { status: 400 });
  if (!clientEmail || !EMAIL.test(clientEmail)) return NextResponse.json({ error: "Enter the client's email address." }, { status: 400 });

  const limited = await rateLimit(`rating-request:${owner}`, SEND_LIMIT);
  if (!limited.ok) return NextResponse.json({ error: tooManyMessage(limited.retryAfter) }, { status: 429 });

  const trip = await getTripItinerary(owner, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  const brand = await readBrand(owner);
  const from = brand?.enabled && brand.name ? brand.name : "White Glove";
  const origin = siteOrigin()?.origin || request.nextUrl.origin;
  const url = new URL(rateHref({ kind: "trip", ref: trip.tripId, label: trip.tripName || "Your trip" }), origin).toString();

  const result = await sendRatingRequestEmail({ to: clientEmail, from, replyTo: owner, tripTitle: trip.tripName || trip.itinerary.title, url });
  if (!result.ok) return NextResponse.json({ error: "Could not send that email right now." }, { status: 502 });

  await markRatingRequestSent(owner, tripId);
  return NextResponse.json({ ok: true });
}
