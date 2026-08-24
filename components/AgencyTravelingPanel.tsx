"use client";

import { useEffect, useState } from "react";
import { useDeviceClock } from "@/components/TripProgressStrip";
import { followAlong, tripProgress, type FollowStop } from "@/lib/trip-progress";

/** One day of a traveling trip, as the agency-traveling API sends it — see TravelDay in lib/trip-travel-days.ts. */
type TravelDay = { date: string; activities: FollowStop[]; lodging?: { name: string; address?: string } };

type Row = {
  id: string;
  name: string;
  client: string;
  advisorAccount: string;
  startDate: string;
  endDate: string;
  travelDays: TravelDay[];
};

function RowCard({ row }: { row: Row }) {
  const { today, nowMinutes } = useDeviceClock();
  const progress = tripProgress({ startDate: row.startDate, endDate: row.endDate, today });
  const todayStops = progress.followDate ? row.travelDays.find((d) => d.date === progress.followDate) : undefined;
  const follow = todayStops ? followAlong({ stops: todayStops.activities, nowMinutes }) : null;

  return (
    <div className="rounded-xl border border-[var(--gold-light)] bg-white p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--navy)]">{row.client || row.name}</p>
          {row.client && <p className="text-xs text-stone-500">{row.name}</p>}
        </div>
        {progress.phase === "during" && (
          <span className="rounded-full bg-[var(--gold)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--gold-ink)]">
            Day {progress.dayNumber} of {progress.totalDays}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-stone-500">{row.advisorAccount}</p>
      {follow ? (
        <p className="mt-2 text-sm leading-6 text-stone-600">{follow.says}</p>
      ) : (
        <p className="mt-2 text-sm text-stone-500">
          {row.startDate} → {row.endDate}
        </p>
      )}
      {todayStops?.lodging && (
        <p className="mt-1 text-xs leading-5 text-stone-500">
          Tonight: {todayStops.lodging.name}
          {todayStops.lodging.address ? ` — ${todayStops.lodging.address}` : ""}
        </p>
      )}
    </div>
  );
}

/**
 * Every client currently traveling, across the whole agency — the owner's
 * own view, and nobody else's. Reads /api/account/agency/traveling, which
 * refuses anybody but the agency owner outright, so this component never
 * has to guess who is allowed to see it: a 403 here just means don't render.
 */
export default function AgencyTravelingPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/account/agency/traveling", { cache: "no-store" });
        if (!res.ok) return; // not the owner, or nothing to show — say nothing
        const data = await res.json().catch(() => null);
        if (active) setRows(data?.rows || []);
      } catch {
        // Quiet on purpose — this is a bonus view, not the agency panel itself.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="mt-8 border-t border-[var(--gold-light)] pt-6">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">Owner view</p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Traveling now, across the agency</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        Every client currently on a trip, whichever advisor is running it. Nobody else on the agency sees this — each
        advisor still only sees their own.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <RowCard key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}
