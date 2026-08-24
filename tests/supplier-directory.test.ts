import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { supplierKey, suppliersFromCommissions, type TripCommissions } from "@/data/supplier-directory";
import type { CommissionRecord } from "@/data/trip-commission";

function record(over: Partial<CommissionRecord> = {}): CommissionRecord {
  return {
    id: "r1",
    supplier: "Hotel Bristol",
    revenueCents: 0,
    costCents: 0,
    expectedCommissionCents: 0,
    receivedCommissionCents: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("a supplier's matching key", () => {
  it("is case- and whitespace-insensitive", () => {
    assert.equal(supplierKey("  Hotel Bristol "), supplierKey("hotel bristol"));
  });
});

describe("deriving the supplier directory fresh from commission ledgers", () => {
  it("groups differently-cased, differently-spaced names as one supplier", () => {
    const trips: TripCommissions[] = [
      { tripId: "a", records: [record({ id: "r1", supplier: "Hotel Bristol" })] },
      { tripId: "b", records: [record({ id: "r2", supplier: "  hotel bristol  " })] },
    ];
    const out = suppliersFromCommissions(trips);
    assert.equal(out.length, 1);
    assert.equal(out[0].tripCount, 2);
    assert.equal(out[0].bookingCount, 2);
  });

  it("counts a trip with several bookings from the same supplier as one trip", () => {
    const trips: TripCommissions[] = [
      { tripId: "a", records: [record({ id: "r1" }), record({ id: "r2" })] },
    ];
    const out = suppliersFromCommissions(trips);
    assert.equal(out[0].tripCount, 1);
    assert.equal(out[0].bookingCount, 2);
  });

  it("sums revenue and commission across every booking", () => {
    const trips: TripCommissions[] = [
      {
        tripId: "a",
        records: [
          record({ id: "r1", revenueCents: 1000, expectedCommissionCents: 100, receivedCommissionCents: 40 }),
          record({ id: "r2", revenueCents: 500, expectedCommissionCents: 50, receivedCommissionCents: 50 }),
        ],
      },
    ];
    const out = suppliersFromCommissions(trips);
    assert.equal(out[0].revenueCents, 1500);
    assert.equal(out[0].expectedCommissionCents, 150);
    assert.equal(out[0].receivedCommissionCents, 90);
    assert.equal(out[0].outstandingCommissionCents, 60);
  });

  it("outstanding is never negative, even if one booking's supplier overpaid", () => {
    const trips: TripCommissions[] = [
      { tripId: "a", records: [record({ id: "r1", expectedCommissionCents: 100, receivedCommissionCents: 150 })] },
    ];
    assert.equal(suppliersFromCommissions(trips)[0].outstandingCommissionCents, 0);
  });

  it("leaves out a record with no supplier name at all", () => {
    const trips: TripCommissions[] = [{ tripId: "a", records: [record({ supplier: "  " })] }];
    assert.deepEqual(suppliersFromCommissions(trips), []);
  });

  it("sorts busiest (most trips) first", () => {
    const trips: TripCommissions[] = [
      { tripId: "a", records: [record({ id: "r1", supplier: "One-trip Supplier" })] },
      { tripId: "b", records: [record({ id: "r2", supplier: "Two-trip Supplier" })] },
      { tripId: "c", records: [record({ id: "r3", supplier: "Two-trip Supplier" })] },
    ];
    const out = suppliersFromCommissions(trips);
    assert.equal(out[0].name, "Two-trip Supplier");
  });
});

describe("suppliers is Business-only, the same door as Commissions", () => {
  const ROUTE = readFileSync("app/api/account/suppliers/route.ts", "utf8");

  it("is gated on mayServeCompanionClients", () => {
    assert.match(ROUTE, /mayServeCompanionClients/);
  });

  it("resolves the signed-in identity through resolveBusinessOwner", () => {
    assert.match(ROUTE, /resolveBusinessOwner/);
  });

  it("derives the directory fresh from listCommissionSummaries rather than a second stored list", () => {
    assert.match(ROUTE, /listCommissionSummaries/);
  });
});
