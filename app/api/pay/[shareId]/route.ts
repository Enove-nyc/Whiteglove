import { NextRequest, NextResponse } from "next/server";
import { getSharedItineraryByShareId, getSharedTraveler } from "@/lib/account-store";
import { getBalance } from "@/lib/account-store";
import { getConnectAccount } from "@/lib/stripe-connect-store";
import { canAcceptPayments, createDestinationPaymentIntent } from "@/lib/stripe-connect";
import { emptyItinerary, travelerUnitKey, unitsOf } from "@/data/itinerary";
import { emptyTripBalance, nextDueFor, OPEN_BALANCE_UNIT_KEY, paidCentsFor, remainingCentsFor } from "@/data/trip-payments";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * A traveler's own view of what they owe, and the door to actually pay it.
 *
 * PUBLIC — a client holds a share link, not an account, the same as every
 * other client-facing route. Resolves the SAME two share tokens the app
 * itself opens (a traveler-scoped /t/ link, or the whole-trip /i/ link) and
 * never trusts a unit id from the request — which unit this is paying is
 * always read off the share token, exactly the way the app decides what a
 * viewer may see.
 *
 * A WHOLE-TRIP LINK MAY ONLY PAY WHEN THE TRIP HAS EXACTLY ONE UNIT. A link
 * that is not scoped to one family has no way to know which family's balance
 * it should be paying, so a multi-family trip's own Pay button only ever
 * appears on a per-traveler link — see canPay below.
 */
async function resolve(shareId: string): Promise<{ ownerEmail: string; tripId: string; unitKey: string; label: string; canPay: boolean } | null> {
  const traveler = await getSharedTraveler(shareId);
  if (traveler) {
    return {
      ownerEmail: traveler.ownerEmail,
      tripId: traveler.tripId,
      unitKey: travelerUnitKey(traveler.traveler),
      label: traveler.traveler.family?.trim() || traveler.traveler.name,
      canPay: true,
    };
  }
  const shared = await getSharedItineraryByShareId(shareId);
  if (!shared || !shared.tripId) return null;
  const units = unitsOf({ ...emptyItinerary(), ...shared.itinerary });
  if (units.length !== 1) return null; // ambiguous — see the file note above
  return { ownerEmail: shared.ownerEmail, tripId: shared.tripId, unitKey: units[0].unitKey, label: units[0].label, canPay: true };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const flood = await rateLimit(`pay-read:${shareId}`, { limit: 60, windowSeconds: 3600 });
  if (!flood.ok) return NextResponse.json({ error: "Try again shortly." }, { status: 429 });

  const resolved = await resolve(shareId);
  if (!resolved) return NextResponse.json({ available: false });
  const balance = (await getBalance(resolved.ownerEmail, resolved.tripId)) ?? emptyTripBalance();
  // An "open" balance has one shared pot everybody contributes toward,
  // rather than a personal share — see OPEN_BALANCE_UNIT_KEY.
  const payKey = balance.splitMode === "open" ? OPEN_BALANCE_UNIT_KEY : resolved.unitKey;
  const assignment = balance.assignments.find((a) => a.unitKey === payKey);
  if (!assignment) return NextResponse.json({ available: false });

  const paidCents = paidCentsFor(balance, payKey);
  const remainingCents = remainingCentsFor(balance, payKey);
  const nextDue = nextDueFor(balance, payKey);
  const connect = await getConnectAccount(resolved.ownerEmail);

  return NextResponse.json({
    available: true,
    label: resolved.label,
    currency: balance.currency,
    totalCents: balance.showTotalToTravelers ? balance.totalCents : undefined,
    yourShareCents: assignment.amountCents,
    paidCents,
    remainingCents,
    nextDue: nextDue ? { label: nextDue.label, amountCents: nextDue.amountCents, dueDate: nextDue.dueDate } : null,
    canPay: resolved.canPay && remainingCents > 0 && canAcceptPayments() && Boolean(connect?.chargesEnabled),
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const { shareId } = await params;
  const flood = await rateLimit(`pay-action:${shareId}`, { limit: 20, windowSeconds: 3600 });
  if (!flood.ok) return NextResponse.json({ error: "Too many attempts — try again shortly." }, { status: 429 });

  const resolved = await resolve(shareId);
  if (!resolved) return NextResponse.json({ error: "This payment link isn't available." }, { status: 404 });
  if (!canAcceptPayments()) return NextResponse.json({ error: "Payments aren't set up on this trip yet." }, { status: 503 });

  const connect = await getConnectAccount(resolved.ownerEmail);
  if (!connect?.chargesEnabled) return NextResponse.json({ error: "This trip isn't ready to accept payment yet." }, { status: 503 });

  const balance = (await getBalance(resolved.ownerEmail, resolved.tripId)) ?? emptyTripBalance();
  const payKey = balance.splitMode === "open" ? OPEN_BALANCE_UNIT_KEY : resolved.unitKey;
  const remainingCents = remainingCentsFor(balance, payKey);
  if (remainingCents <= 0) return NextResponse.json({ error: "Nothing is owed." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { scheduleItemId?: string; amountCents?: number } | null;
  // Never trust a client-supplied amount past what is actually still owed —
  // the request may ask for less (a partial payment) but never more.
  const requested = typeof body?.amountCents === "number" && body.amountCents > 0 ? Math.round(body.amountCents) : remainingCents;
  const amountCents = Math.min(requested, remainingCents);

  const result = await createDestinationPaymentIntent({
    amountCents,
    currency: balance.currency,
    destinationAccountId: connect.accountId,
    ownerEmail: resolved.ownerEmail,
    tripId: resolved.tripId,
    unitKey: payKey,
    scheduleItemId: body?.scheduleItemId,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ clientSecret: result.clientSecret });
}
