// A planner's suppliers — pure data model + pure transforms, the same
// discipline data/clients.ts keeps for the same reason.
//
// A SUPPLIER IS NOT ITS OWN RECORD, THE SAME WAY A CLIENT ISN'T. It is the
// name already typed onto a commission record (CommissionRecord.supplier in
// data/trip-commission.ts) — matched case/whitespace-insensitive, grouped
// across every trip that booking through them appears on. There is nothing
// to keep in sync, because there is nothing kept twice: log a booking with
// a new supplier and the directory reads it back next time, the same way
// the client roster reads a renamed client back.
//
// NOT A REAL MARKETPLACE. A genuine supplier/API marketplace — searching
// and booking live inventory through third-party partner APIs — needs real
// contracted supplier integrations this codebase has none of; inventing one
// would be a page pretending to book something it can't. What this is
// instead: a rollup of the suppliers the agency already actually works
// with, and how much business has actually gone through each — real data,
// not a mocked-up storefront.

import { expectedCommissionCents, receivedCommissionCents, tripRevenueCents, type CommissionRecord } from "@/data/trip-commission";

export function supplierKey(name: string): string {
  return name.trim().toLowerCase();
}

export type SupplierSummary = {
  key: string;
  /** As most recently logged — the same name shown everywhere else. */
  name: string;
  tripCount: number;
  bookingCount: number;
  /** The first record's own currency — assumes one currency per supplier,
   *  the same assumption the agency-wide Commissions totals make; summing
   *  mismatched currencies as if they were the same money would be wrong. */
  currency: string;
  revenueCents: number;
  expectedCommissionCents: number;
  receivedCommissionCents: number;
  outstandingCommissionCents: number;
};

/** One trip's commission ledger, the minimum this needs — the same shape
 *  listCommissionSummaries() in lib/account-store.ts already returns. */
export type TripCommissions = { tripId: string; records: CommissionRecord[] };

/**
 * Every distinct supplier across these trips' commission ledgers, busiest
 * (by trip count) first. A supplier with three bookings on one trip is
 * still one trip counted once; a supplier who appears on ten different
 * trips is ten.
 */
export function suppliersFromCommissions(trips: TripCommissions[]): SupplierSummary[] {
  const byKey = new Map<string, SupplierSummary>();
  for (const trip of trips) {
    const seenOnThisTrip = new Set<string>();
    for (const record of trip.records) {
      const name = record.supplier.trim();
      if (!name) continue;
      const key = supplierKey(name);
      const existing = byKey.get(key) ?? {
        key,
        name,
        tripCount: 0,
        bookingCount: 0,
        currency: record.currency,
        revenueCents: 0,
        expectedCommissionCents: 0,
        receivedCommissionCents: 0,
        outstandingCommissionCents: 0,
      };
      existing.name = name;
      existing.bookingCount += 1;
      existing.revenueCents += tripRevenueCents([record]);
      existing.expectedCommissionCents += expectedCommissionCents([record]);
      existing.receivedCommissionCents += receivedCommissionCents([record]);
      if (!seenOnThisTrip.has(key)) {
        existing.tripCount += 1;
        seenOnThisTrip.add(key);
      }
      byKey.set(key, existing);
    }
  }
  for (const s of byKey.values()) {
    s.outstandingCommissionCents = Math.max(0, s.expectedCommissionCents - s.receivedCommissionCents);
  }
  return [...byKey.values()].sort((a, b) => b.tripCount - a.tripCount || b.revenueCents - a.revenueCents);
}
