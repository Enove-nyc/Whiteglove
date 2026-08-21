import "server-only";

import { getBalance } from "@/lib/account-store";
import { getConnectAccount } from "@/lib/stripe-connect-store";
import { canAcceptPayments } from "@/lib/stripe-connect";
import { emptyTripBalance, nextDueFor, OPEN_BALANCE_UNIT_KEY, paidCentsFor, remainingCentsFor } from "@/data/trip-payments";
import type { CompanionPayment } from "@/data/companion-demo";

/**
 * The ONE place a CompanionPayment is computed — called both by the app
 * pages (app/i/[shareId]/app, app/t/[shareId]/app) when building the trip a
 * viewer sees, and by app/api/pay/[shareId]/route.ts when that viewer
 * actually pays. Same numbers either way, because it is the same function —
 * including which unit's assignment this viewer is actually paying against:
 * an "open" balance has one shared pot everybody contributes toward, so a
 * viewer's own unitKey is only used when the split is NOT open.
 *
 * Returns undefined rather than a payment with nothing in it when the
 * planner hasn't assigned this unit a share — the caller shows no Payments
 * card at all rather than one that says "$0 due".
 */
export async function paymentForUnit(
  ownerEmail: string,
  tripId: string,
  unitKey: string,
  label: string,
  shareId: string,
): Promise<CompanionPayment | undefined> {
  const balance = (await getBalance(ownerEmail, tripId)) ?? emptyTripBalance();
  const payKey = balance.splitMode === "open" ? OPEN_BALANCE_UNIT_KEY : unitKey;
  const assignment = balance.assignments.find((a) => a.unitKey === payKey);
  if (!assignment) return undefined;

  const connect = await getConnectAccount(ownerEmail);
  const nextDue = nextDueFor(balance, payKey);

  return {
    shareId,
    label,
    currency: balance.currency,
    totalCents: balance.showTotalToTravelers ? balance.totalCents : undefined,
    yourShareCents: assignment.amountCents,
    paidCents: paidCentsFor(balance, payKey),
    remainingCents: remainingCentsFor(balance, payKey),
    nextDue: nextDue ? { label: nextDue.label, amountCents: nextDue.amountCents, dueDate: nextDue.dueDate } : null,
    canPay: remainingCentsFor(balance, payKey) > 0 && canAcceptPayments() && Boolean(connect?.chargesEnabled),
  };
}
