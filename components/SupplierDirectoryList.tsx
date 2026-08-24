"use client";

import { useEffect, useState } from "react";
import type { SupplierSummary } from "@/data/supplier-directory";
import { formatCommissionCents } from "@/data/trip-commission";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SupplierDirectoryList() {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/account/suppliers", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) setError(data?.error || "Could not load your suppliers.");
        else setSuppliers(Array.isArray(data?.suppliers) ? data.suppliers : []);
      } catch {
        if (active) setError("Could not reach the account service.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (error) return <p className="text-sm font-semibold text-red-700">{error}</p>;
  if (suppliers.length === 0) {
    return (
      <EmptyState
        title="No suppliers logged yet"
        description="Log a supplier booking from a trip's Payments page (the commission section) and they show up here."
      />
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {suppliers.map((s) => (
        <li key={s.key} className="wg-card border border-[var(--gold-light)] bg-white p-4">
          <p className="font-semibold text-[var(--navy)]">{s.name}</p>
          <p className="mt-1 text-sm text-stone-600">
            {s.tripCount} {s.tripCount === 1 ? "trip" : "trips"} · {s.bookingCount} {s.bookingCount === 1 ? "booking" : "bookings"}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="font-bold uppercase tracking-wide text-stone-500">Revenue booked</dt>
              <dd className="text-[var(--navy)]">{formatCommissionCents(s.revenueCents, s.currency)}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-stone-500">Expected commission</dt>
              <dd className="text-[var(--navy)]">{formatCommissionCents(s.expectedCommissionCents, s.currency)}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-stone-500">Received</dt>
              <dd className="text-[var(--navy)]">{formatCommissionCents(s.receivedCommissionCents, s.currency)}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wide text-stone-500">Outstanding</dt>
              <dd className={s.outstandingCommissionCents > 0 ? "font-semibold text-red-700" : "text-[var(--navy)]"}>
                {formatCommissionCents(s.outstandingCommissionCents, s.currency)}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
