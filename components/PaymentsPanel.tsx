"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collectedCents,
  formatCents,
  outstandingCents,
  paidCentsFor,
  remainingCentsFor,
  type PaymentScheduleItem,
  type PaymentSplitMode,
  type TripBalance,
} from "@/data/trip-payments";

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const caption = "text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500";

type ConnectAccount = { accountId: string; chargesEnabled: boolean; payoutsEnabled: boolean };
type Unit = { unitKey: string; label: string };

function dollarsInput(cents: number | undefined): string {
  return typeof cents === "number" ? (cents / 100).toFixed(2) : "";
}
function toCents(dollars: string): number {
  const n = Number(dollars);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
}

/**
 * The planner's own side of Payments — connecting a Stripe account, and
 * setting up the trip in the planner right now: a total, a way to split it,
 * an optional deposit/installment schedule, and the ledger of what has
 * actually come in. Reads/writes app/api/account/payments/route.ts.
 */
export default function PaymentsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connect, setConnect] = useState<ConnectAccount | null>(null);
  const [canConnect, setCanConnect] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [tripName, setTripName] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [balance, setBalance] = useState<TripBalance | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/account/payments", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok || !data) {
          setError(data?.error || "Could not load payments.");
          return;
        }
        setCanConnect(Boolean(data.canConnect));
        setCanAccept(Boolean(data.canAcceptPayments));
        setConnect(data.connect);
        setTripId(data.tripId);
        setTripName(data.tripName || "");
        setUnits(data.units || []);
        setBalance(data.balance);
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

  async function connectStripe() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", origin: window.location.origin }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setError(data?.error || "Could not start onboarding.");
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  }

  async function refreshStatus() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh-status" }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.connect) setConnect(data.connect);
    } finally {
      setBusy(false);
    }
  }

  async function saveBalance(patch: Partial<TripBalance>) {
    if (!tripId || !balance) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/account/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-balance", tripId, ...patch }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.balance) {
        setError(data?.error || "Could not save that.");
        return;
      }
      setBalance(data.balance);
      setNote("Saved.");
      setTimeout(() => setNote(""), 1500);
    } finally {
      setBusy(false);
    }
  }

  const collected = useMemo(() => (balance ? collectedCents(balance) : 0), [balance]);
  const outstanding = useMemo(() => (balance ? outstandingCents(balance) : 0), [balance]);

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (!tripId) {
    return <p className="text-sm leading-6 text-stone-600">Build a trip in the planner first — payments are set up on the trip you have open.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {!canConnect && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Payments aren&apos;t configured on this deployment yet.
        </div>
      )}

      {canConnect && (
        <section className="rounded-2xl border border-[var(--gold-light)] bg-white p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Your Stripe account</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Trip payments go straight into your own Stripe account — White Glove never holds a client&apos;s money.
          </p>
          {!connect ? (
            <button type="button" onClick={connectStripe} disabled={busy} className="mt-4 rounded-full bg-[var(--navy)] px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60">
              Connect Stripe
            </button>
          ) : connect.chargesEnabled ? (
            <p className="mt-3 text-sm font-semibold text-emerald-700">Connected and ready to accept payment.</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-stone-600">Stripe still needs a bit more from you to finish onboarding.</p>
              <button type="button" onClick={connectStripe} disabled={busy} className="rounded-full border border-[var(--navy)] px-4 py-2 text-xs font-bold text-[var(--navy)]">
                Finish onboarding
              </button>
              <button type="button" onClick={refreshStatus} disabled={busy} className="text-xs font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
                Check status
              </button>
            </div>
          )}
          {!canAccept && connect?.chargesEnabled && (
            <p className="mt-3 text-xs text-stone-500">The webhook that confirms a payment isn&apos;t configured yet, so Pay is still off for travelers.</p>
          )}
        </section>
      )}

      {balance && (
        <section className="rounded-2xl border border-[var(--gold-light)] bg-white p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{tripName || "This trip"}&apos;s balance</h2>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label>
              <span className={caption}>Trip total</span>
              <input
                type="number"
                min="0"
                step="0.01"
                defaultValue={dollarsInput(balance.totalCents)}
                onBlur={(e) => saveBalance({ totalCents: toCents(e.target.value) })}
                className={inputClass}
              />
            </label>
            <label>
              <span className={caption}>Split</span>
              <select
                value={balance.splitMode}
                onChange={(e) => saveBalance({ splitMode: e.target.value as PaymentSplitMode })}
                className={inputClass}
              >
                <option value="equal">Equally, across everyone</option>
                <option value="custom">Custom, per family/traveler</option>
                <option value="open">Open — anyone can contribute</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                checked={balance.showTotalToTravelers}
                onChange={(e) => saveBalance({ showTotalToTravelers: e.target.checked })}
              />
              <span className="text-xs font-semibold text-stone-600">Let travelers see the overall trip total</span>
            </label>
            {note && <span className="text-xs font-semibold text-emerald-700">{note}</span>}
          </div>

          {balance.splitMode === "custom" && units.length > 0 && (
            <div className="mt-5 flex flex-col gap-2">
              <span className={caption}>Each family/traveler&apos;s share</span>
              {units.map((u) => {
                const current = balance.assignments.find((a) => a.unitKey === u.unitKey);
                return (
                  <div key={u.unitKey} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-sm font-semibold text-[var(--navy)]">{u.label}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={dollarsInput(current?.amountCents)}
                      onBlur={(e) => {
                        const others = balance.assignments.filter((a) => a.unitKey !== u.unitKey);
                        saveBalance({ assignments: [...others, { unitKey: u.unitKey, label: u.label, amountCents: toCents(e.target.value) }] });
                      }}
                      className={`${inputClass} max-w-32`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {balance.splitMode === "equal" && balance.assignments.length > 0 && (
            <div className="mt-5 flex flex-col gap-1">
              <span className={caption}>Each family/traveler&apos;s share</span>
              {balance.assignments.map((a) => (
                <p key={a.unitKey} className="text-sm text-stone-600">
                  {a.label} — {formatCents(a.amountCents, balance.currency)}
                </p>
              ))}
            </div>
          )}

          {balance.assignments.length > 0 && (
            <div className="mt-6 grid gap-3 border-t border-[var(--gold-light)] pt-5 sm:grid-cols-2">
              <div>
                <p className={caption}>Collected</p>
                <p className="text-xl font-bold text-emerald-700">{formatCents(collected, balance.currency)}</p>
              </div>
              <div>
                <p className={caption}>Outstanding</p>
                <p className="text-xl font-bold text-[var(--navy)]">{formatCents(outstanding, balance.currency)}</p>
              </div>
            </div>
          )}

          {balance.assignments.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {balance.assignments.map((a) => (
                <div key={a.unitKey} className="flex items-center justify-between border-t border-[var(--gold-light)] pt-2 text-sm">
                  <span className="font-semibold text-[var(--navy)]">{a.label}</span>
                  <span className="text-stone-600">
                    {formatCents(paidCentsFor(balance, a.unitKey), balance.currency)} paid · {formatCents(remainingCentsFor(balance, a.unitKey), balance.currency)} remaining
                  </span>
                </div>
              ))}
            </div>
          )}

          <ScheduleEditor schedule={balance.schedule} currency={balance.currency} onSave={(schedule) => saveBalance({ schedule })} />

          {balance.payments.length > 0 && (
            <div className="mt-6 border-t border-[var(--gold-light)] pt-4">
              <p className={caption}>Payment history</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {[...balance.payments].reverse().map((p) => (
                  <p key={p.id} className="text-xs text-stone-600">
                    {p.receiptNumber} — {formatCents(p.amountCents, p.currency)} — {p.status}
                    {p.paidAt ? ` — ${new Date(p.paidAt).toLocaleDateString()}` : ""}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}

function ScheduleEditor({ schedule, currency, onSave }: { schedule: PaymentScheduleItem[]; currency: string; onSave: (s: PaymentScheduleItem[]) => void }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  function add() {
    if (!label.trim() || !amount) return;
    onSave([...schedule, { id: `sched-${Date.now().toString(36)}`, label: label.trim(), amountCents: toCents(amount), dueDate: dueDate || undefined }]);
    setLabel("");
    setAmount("");
    setDueDate("");
  }
  function remove(id: string) {
    onSave(schedule.filter((s) => s.id !== id));
  }

  return (
    <div className="mt-6 border-t border-[var(--gold-light)] pt-4">
      <p className={caption}>Payment schedule (optional)</p>
      {schedule.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {schedule.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <span>
                {s.label} — {formatCents(s.amountCents, currency)}{s.dueDate ? ` — due ${s.dueDate}` : ""}
              </span>
              <button type="button" onClick={() => remove(s.id)} className="text-xs text-stone-400 hover:text-red-700">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label>
          <span className={caption}>Label</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Deposit" className={`${inputClass} max-w-40`} />
        </label>
        <label>
          <span className={caption}>Amount</span>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} max-w-32`} />
        </label>
        <label>
          <span className={caption}>Due date</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputClass} max-w-40`} />
        </label>
        <button type="button" onClick={add} className="rounded-full border border-[var(--navy)] px-4 py-2 text-xs font-bold text-[var(--navy)]">
          + Add
        </button>
      </div>
    </div>
  );
}
