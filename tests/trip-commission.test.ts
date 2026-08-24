import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  expectedCommissionCents,
  outstandingCommissionCents,
  receivedCommissionCents,
  supplierCostCents,
  tripRevenueCents,
  type CommissionRecord,
} from "@/data/trip-commission";

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

describe("summing a trip's commission ledger", () => {
  it("sums trip revenue across every supplier booking", () => {
    assert.equal(tripRevenueCents([record({ revenueCents: 1000 }), record({ revenueCents: 500 })]), 1500);
  });

  it("sums supplier cost across every booking", () => {
    assert.equal(supplierCostCents([record({ costCents: 700 }), record({ costCents: 300 })]), 1000);
  });

  it("sums what's expected across every booking", () => {
    assert.equal(expectedCommissionCents([record({ expectedCommissionCents: 100 }), record({ expectedCommissionCents: 50 })]), 150);
  });

  it("sums what's actually arrived, independent of what was expected", () => {
    assert.equal(
      receivedCommissionCents([record({ expectedCommissionCents: 100, receivedCommissionCents: 40 }), record({ expectedCommissionCents: 50, receivedCommissionCents: 60 })]),
      100,
    );
  });
});

describe("what's still outstanding", () => {
  it("is expected minus received", () => {
    assert.equal(outstandingCommissionCents([record({ expectedCommissionCents: 100, receivedCommissionCents: 30 })]), 70);
  });

  it("is never negative, even if one booking's supplier overpaid", () => {
    const records = [
      record({ id: "a", expectedCommissionCents: 100, receivedCommissionCents: 150 }),
      record({ id: "b", expectedCommissionCents: 50, receivedCommissionCents: 0 }),
    ];
    assert.equal(outstandingCommissionCents(records), 0);
  });

  it("is zero for an empty ledger", () => {
    assert.equal(outstandingCommissionCents([]), 0);
  });
});

describe("commission tracking is Business-only, the same door as clients and payments", () => {
  const ROUTE = readFileSync("app/api/account/commissions/route.ts", "utf8");

  it("is gated on mayServeCompanionClients", () => {
    assert.match(ROUTE, /mayServeCompanionClients/);
  });

  it("resolves the signed-in identity through resolveBusinessOwner — a staff login sees the agency's own commissions", () => {
    assert.match(ROUTE, /resolveBusinessOwner/);
  });

  it("checks same-origin before any write", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
    assert.ok(post.indexOf("sameOrigin") < post.indexOf("saveCommissionRecord"));
  });
});
