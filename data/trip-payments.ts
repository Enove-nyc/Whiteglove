// A trip's payment balance — pure data model + pure transforms, the same
// discipline data/itinerary.ts and data/proposal.ts keep. No Stripe, no
// Node, no browser API here; lib/stripe-connect.ts is where money actually
// moves.
//
// AMOUNTS ARE WHOLE CENTS, ALWAYS. "$4,000" is stored as 400000. Floating
// point dollars is how real systems get a family charged $0.01 more or less
// than what the planner typed; integers don't have that problem. Every
// function here takes and returns cents — only a display layer ever divides
// by 100.
//
// A UNIT IS A FAMILY, OR ONE SOLO TRAVELER. Matches the same grouping
// data/itinerary.ts's travelerUnitKey() already uses for privacy — a trip's
// payment split and its privacy split are the same units on purpose, so
// "the Smith family" means one thing everywhere on the trip, not two.

export type PaymentSplitMode = "equal" | "custom" | "open";

export type PaymentUnitAssignment = {
  /** Matches data/itinerary.ts's travelerUnitKey() — "family:smith family" or "solo:<travelerId>". */
  unitKey: string;
  /** "Smith family", or a solo traveler's name — for display only. */
  label: string;
  amountCents: number;
};

export type PaymentScheduleItem = {
  id: string;
  /** "Deposit", "Second payment", "Final balance" — whatever the planner calls it. */
  label: string;
  amountCents: number;
  dueDate?: string; // YYYY-MM-DD
};

export type PaymentStatus = "succeeded" | "failed" | "refunded";

/**
 * One real attempt to pay — the ledger. Append-only: a payment is never
 * edited or deleted once recorded, only ever followed by a new row (a
 * refund is its own row, not an edit to the original). This is the "proper
 * transaction ledger/audit history" the brief asked for.
 */
export type PaymentRecord = {
  id: string;
  unitKey: string;
  amountCents: number;
  currency: string; // ISO 4217, uppercase — e.g. "USD"
  status: PaymentStatus;
  stripePaymentIntentId: string;
  scheduleItemId?: string;
  /** A short reference to show on the receipt — not the Stripe id itself. */
  receiptNumber: string;
  createdAt: string; // ISO timestamp — when the attempt was recorded
  paidAt?: string; // ISO timestamp — when it actually succeeded
};

export type TripBalance = {
  /** Absent until the planner sets one up. */
  totalCents?: number;
  currency: string; // default "USD"
  splitMode: PaymentSplitMode;
  assignments: PaymentUnitAssignment[];
  schedule: PaymentScheduleItem[];
  /** "A traveler may see the overall trip total only when the planner chooses to expose it." */
  showTotalToTravelers: boolean;
  payments: PaymentRecord[];
};

/**
 * The one assignment an "open" balance has — no personal shares, every
 * traveler contributes toward the same remaining amount. Used as the single
 * entry in `assignments` when splitMode is "open", and as the unitKey every
 * payment against an open balance is recorded under, regardless of which
 * family actually paid — see app/api/pay/[shareId]/route.ts.
 */
export const OPEN_BALANCE_UNIT_KEY = "open";

export function assignOpen(totalCents: number): PaymentUnitAssignment[] {
  return [{ unitKey: OPEN_BALANCE_UNIT_KEY, label: "Open balance", amountCents: totalCents }];
}

export function emptyTripBalance(): TripBalance {
  return { currency: "USD", splitMode: "equal", assignments: [], schedule: [], showTotalToTravelers: false, payments: [] };
}

/** Whether a balance has actually been set up — an empty one is "no balance yet", not "$0 due". */
export function hasBalance(balance: TripBalance): boolean {
  return typeof balance.totalCents === "number" && balance.assignments.length > 0;
}

/** Split a total evenly across units, to the cent — nobody's cent goes missing to rounding. */
export function splitEqually(totalCents: number, units: Array<{ unitKey: string; label: string }>): PaymentUnitAssignment[] {
  if (units.length === 0) return [];
  const base = Math.floor(totalCents / units.length);
  let remainder = totalCents - base * units.length;
  return units.map((u) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return { unitKey: u.unitKey, label: u.label, amountCents: base + extra };
  });
}

/** Every successful payment recorded against this unit. */
function succeededFor(balance: TripBalance, unitKey: string): PaymentRecord[] {
  return balance.payments.filter((p) => p.unitKey === unitKey && p.status === "succeeded");
}

/** What this unit has actually paid — refunds subtract back out. */
export function paidCentsFor(balance: TripBalance, unitKey: string): number {
  const paid = succeededFor(balance, unitKey).reduce((sum, p) => sum + p.amountCents, 0);
  const refunded = balance.payments.filter((p) => p.unitKey === unitKey && p.status === "refunded").reduce((sum, p) => sum + p.amountCents, 0);
  return Math.max(0, paid - refunded);
}

/** What this unit still owes — never negative, even if they overpaid. */
export function remainingCentsFor(balance: TripBalance, unitKey: string): number {
  const assigned = balance.assignments.find((a) => a.unitKey === unitKey)?.amountCents ?? 0;
  return Math.max(0, assigned - paidCentsFor(balance, unitKey));
}

/** Every unit's assignment, together — for the planner's own dashboard. */
export function collectedCents(balance: TripBalance): number {
  return balance.assignments.reduce((sum, a) => sum + paidCentsFor(balance, a.unitKey), 0);
}

export function outstandingCents(balance: TripBalance): number {
  return balance.assignments.reduce((sum, a) => sum + remainingCentsFor(balance, a.unitKey), 0);
}

/** The next schedule line this unit hasn't fully paid off yet, earliest due date first. */
export function nextDueFor(balance: TripBalance, unitKey: string): PaymentScheduleItem | null {
  if (balance.schedule.length === 0) return null;
  const paidTowardSchedule = new Set(
    balance.payments.filter((p) => p.unitKey === unitKey && p.status === "succeeded" && p.scheduleItemId).map((p) => p.scheduleItemId),
  );
  const open = balance.schedule.filter((s) => !paidTowardSchedule.has(s.id));
  if (open.length === 0) return null;
  return [...open].sort((a, b) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"))[0];
}

export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
