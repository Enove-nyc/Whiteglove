import { NextRequest, NextResponse } from "next/server";
import { recordPayment } from "@/lib/account-store";
import { paymentsWebhookSecret } from "@/lib/stripe-connect";
import { verifyWebhook } from "@/lib/stripe";
import type { PaymentRecord } from "@/data/trip-payments";

export const dynamic = "force-dynamic";

/**
 * What Stripe tells us about a trip payment — the only place a payment is
 * ever recorded as succeeded. Mirrors app/api/billing/webhook/route.ts:
 * verifies the raw body against its OWN endpoint secret first and does
 * nothing else until it has, always answers 200 once the event is real (an
 * event this route does not care about is not a failure), and logs rather
 * than throws on anything unexpected so Stripe never retry-storms a real bug.
 *
 * IDEMPOTENT BY THE LEDGER ITSELF, not by tracking event ids here.
 * recordPayment (lib/account-store.ts) checks whether a payment with this
 * exact PaymentIntent id is already on the trip before appending — a
 * replayed or duplicated webhook delivery changes nothing the second time.
 *
 * METADATA IS WHERE EVERYTHING COMES FROM. createDestinationPaymentIntent
 * (lib/stripe-connect.ts) puts ownerEmail/tripId/unitKey/scheduleItemId on
 * the PaymentIntent when it is created; Stripe hands metadata back on every
 * event for it untouched, so this route never has to guess which trip or
 * which family a payment belongs to.
 */
function receiptNumber(paymentIntentId: string): string {
  return `WG-${paymentIntentId.replace(/^pi_/, "").slice(-10).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const secret = paymentsWebhookSecret();
  if (!secret) {
    console.error("[payments] webhook received but STRIPE_PAYMENTS_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  const raw = await request.text();
  const event = verifyWebhook(raw, request.headers.get("stripe-signature"), secret);
  if (!event) return NextResponse.json({ error: "Bad signature." }, { status: 400 });

  try {
    const object = event.data.object;
    if (event.type !== "payment_intent.succeeded" && event.type !== "payment_intent.payment_failed") {
      return NextResponse.json({ received: true });
    }

    const metadata = (object.metadata ?? {}) as Record<string, string>;
    const ownerEmail = metadata.ownerEmail;
    const tripId = metadata.tripId;
    const unitKey = metadata.unitKey;
    const paymentIntentId = typeof object.id === "string" ? object.id : "";
    if (!ownerEmail || !tripId || !unitKey || !paymentIntentId) {
      console.error("[payments] webhook event missing metadata to record it against:", { ownerEmail, tripId, unitKey, paymentIntentId });
      return NextResponse.json({ received: true });
    }

    const amountCents = typeof object.amount === "number" ? object.amount : 0;
    const currency = typeof object.currency === "string" ? object.currency.toUpperCase() : "USD";
    const now = new Date().toISOString();
    const record: PaymentRecord = {
      id: paymentIntentId,
      unitKey,
      amountCents,
      currency,
      status: event.type === "payment_intent.succeeded" ? "succeeded" : "failed",
      stripePaymentIntentId: paymentIntentId,
      scheduleItemId: metadata.scheduleItemId || undefined,
      receiptNumber: receiptNumber(paymentIntentId),
      createdAt: now,
      paidAt: event.type === "payment_intent.succeeded" ? now : undefined,
    };

    const ok = await recordPayment(ownerEmail, tripId, record);
    if (!ok) console.error("[payments] could not record a payment against its trip:", { ownerEmail, tripId, paymentIntentId });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[payments] webhook handler threw:", error);
    return NextResponse.json({ received: true });
  }
}
