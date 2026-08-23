"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pipelineStats, TRIP_STAGE_LABEL, TRIP_STAGE_ORDER, type TripStage } from "@/data/trip-pipeline";
import { formatCents } from "@/data/trip-payments";

type Row = {
  id: string;
  name: string;
  client: string;
  advisor: string;
  startDate: string;
  endDate: string;
  stage: TripStage;
  needsAttention: boolean;
  shareId?: string;
  unread: boolean;
  updatedAt: string;
  /** What this trip still owes, when a balance has actually been set up. */
  outstandingCents?: number;
  currency?: string;
};

type View = "board" | "upcoming" | "traveling" | "awaiting_approval" | "attention" | "unread";

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "board", label: "Board" },
  { id: "upcoming", label: "Upcoming" },
  { id: "traveling", label: "Currently traveling" },
  { id: "awaiting_approval", label: "Awaiting approval" },
  { id: "attention", label: "Changes requiring attention" },
  { id: "unread", label: "Unread messages" },
];

const cardBase = "rounded-xl border border-[var(--gold-light)] bg-white p-4 text-sm";

function rowsFor(view: View, rows: Row[], today: string): Row[] {
  switch (view) {
    case "upcoming":
      return rows.filter((r) => r.stage === "confirmed" && r.startDate > today);
    case "traveling":
      return rows.filter((r) => r.stage === "traveling");
    case "awaiting_approval":
      return rows.filter((r) => r.stage === "awaiting_approval");
    case "attention":
      return rows.filter((r) => r.needsAttention);
    case "unread":
      return rows.filter((r) => r.unread);
    default:
      return rows;
  }
}

function RowCard({ row, onOpen, onStage }: { row: Row; onOpen: (path: string) => void; onStage?: (stage: "inquiry" | "planning") => void }) {
  return (
    <div className={cardBase}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--navy)]">{row.client || row.name}</p>
          {row.client && <p className="text-xs text-stone-500">{row.name}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {row.needsAttention && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              Changes requested
            </span>
          )}
          {row.unread && (
            <span className="rounded-full bg-[var(--navy)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Unread
            </span>
          )}
        </div>
      </div>
      {(row.startDate || row.endDate) && (
        <p className="mt-2 text-xs text-stone-500">
          {row.startDate} {row.endDate ? `→ ${row.endDate}` : ""}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen("/itinerary")} className="text-xs font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
          Open itinerary
        </button>
        <button type="button" onClick={() => onOpen("/proposal")} className="text-xs font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
          Proposal
        </button>
        {row.shareId && (
          <a href={`/app?trip=${row.id}`} className="text-xs font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
            Open in the app
          </a>
        )}
      </div>
      {onStage && (row.stage === "inquiry" || row.stage === "planning") && (
        <div className="mt-3 flex gap-2 border-t border-[var(--gold-light)] pt-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Mark as</span>
          <button
            type="button"
            onClick={() => onStage("inquiry")}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${row.stage === "inquiry" ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-stone-300 text-stone-500"}`}
          >
            Inquiry
          </button>
          <button
            type="button"
            onClick={() => onStage("planning")}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${row.stage === "planning" ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-stone-300 text-stone-500"}`}
          >
            Planning
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Every client trip, one row each. Reads /api/account/pipeline, which derives
 * each trip's stage from its own proposal status and dates rather than a
 * second status kept in sync by hand — see data/trip-pipeline.ts.
 *
 * OPENING A TRIP switches which trip is active for the account (the same
 * "switch" action the trip list already uses) and then goes to the page that
 * always works on the active trip — the itinerary builder and the proposal
 * builder do not yet take a trip id in the URL, so this is how a many-trip
 * business reaches trip #40's proposal without that plumbing existing twice.
 */
export default function PipelineDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [today, setToday] = useState("");
  // The business-at-a-glance strip is Advisor Pro — read off the same
  // response the rows already come from, not a second request.
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("board");
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/account/pipeline", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) {
          setError(data?.error || "Could not load the pipeline.");
        } else {
          setRows(data?.rows || []);
          setToday(data?.today || "");
          setShowAnalytics(Boolean(data?.showAnalytics));
        }
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

  const filtered = useMemo(() => rowsFor(view, rows, today), [view, rows, today]);
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, rowsFor(v.id, rows, today).length])), [rows, today]);

  // The business, at a glance — above the row-by-row board, not instead of
  // it. See pipelineStats in data/trip-pipeline.ts for the actual rules,
  // kept pure and tested there rather than inline here.
  const stats = useMemo(() => pipelineStats(rows, today), [rows, today]);

  async function openTrip(id: string, path: string) {
    setSwitching(id);
    try {
      await fetch("/api/account/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", id }),
      });
      router.push(path);
    } finally {
      setSwitching(null);
    }
  }

  async function setStage(id: string, stage: "inquiry" | "planning") {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, stage } : r)));
    await fetch("/api/account/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: id, stage }),
    }).catch(() => undefined);
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (error) return <p className="text-sm font-semibold text-red-700">{error}</p>;
  if (rows.length === 0) {
    return (
      <p className="text-sm leading-6 text-stone-600">
        No client trips yet. Once you plan a trip for a client — name them on a trip&apos;s Details — it shows up here.
      </p>
    );
  }

  return (
    <div>
      {showAnalytics && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cardBase}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Active client trips</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{stats.activeCount}</p>
          </div>
          <div className={cardBase}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Traveling now</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{counts.traveling}</p>
          </div>
          <div className={cardBase}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Departing in 30 days</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{stats.departingSoon}</p>
          </div>
          <div className={cardBase}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Outstanding</p>
            {stats.outstandingByCurrency.length === 0 ? (
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{formatCents(0)}</p>
            ) : (
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
                {stats.outstandingByCurrency.map(([currency, cents]) => formatCents(cents, currency)).join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-[var(--gold-light)] pb-4">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${
              view === v.id ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold-light)] bg-white text-[var(--navy)] hover:border-[var(--gold)]"
            }`}
          >
            {v.label}
            {v.id !== "board" && counts[v.id] > 0 ? ` (${counts[v.id]})` : ""}
          </button>
        ))}
      </div>

      {view === "board" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {TRIP_STAGE_ORDER.map((stage) => {
            const inStage = rows.filter((r) => r.stage === stage);
            if (inStage.length === 0) return null;
            return (
              <div key={stage} className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                  {TRIP_STAGE_LABEL[stage]} <span className="font-normal text-stone-400">({inStage.length})</span>
                </p>
                <div className="flex flex-col gap-3">
                  {inStage.map((row) => (
                    <RowCard
                      key={row.id}
                      row={row}
                      onOpen={(path) => (switching ? undefined : openTrip(row.id, path))}
                      onStage={(s) => setStage(row.id, s)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing here right now.</p>
          ) : (
            filtered.map((row) => (
              <RowCard key={row.id} row={row} onOpen={(path) => (switching ? undefined : openTrip(row.id, path))} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
