"use client";

import { useCallback, useEffect, useState } from "react";
import { useDeviceClock } from "@/components/TripProgressStrip";
import { countdownPhrase, tripProgress } from "@/lib/trip-progress";

// The traveler's trips, and a way to move between them.
//
// One account used to mean one itinerary, so planning Poland in the spring and
// Ukraine in the autumn meant planning over the top of yourself. Each trip now
// keeps its own stops, its own days and its own share link.
//
// Nothing renders for a visitor who is not signed in: there is no account to
// hold a second trip in, and an empty panel offering trips they cannot have is
// worse than no panel at all.

type Trip = {
  id: string;
  name: string;
  active: boolean;
  stops: number;
  places: number;
  days: number;
  startDate: string;
  endDate: string;
  shared: boolean;
  updatedAt: string;
};

const smallButton =
  "min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)] disabled:opacity-50";

export default function TripSwitcher({ onSwitched }: { onSwitched?: () => void }) {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  // The traveler's own date, so a trip that starts tomorrow says so on the
  // list rather than only once it is opened.
  const { today } = useDeviceClock();

  useEffect(() => {
    let live = true;
    fetch("/api/account/trips", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d?.trips && setTrips(d.trips))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const act = useCallback(
    async (action: string, payload: { id?: string; name?: string } = {}, reload = false) => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/account/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setError(data?.error ?? "That did not work. Try again.");
          return;
        }
        setTrips(data.trips);
        setRenaming(null);
        if (reload) onSwitched?.();
      } catch {
        setError("Could not reach the server.");
      } finally {
        setBusy(false);
      }
    },
    [onSwitched],
  );

  // Not signed in, or the account store is not connected. Say nothing.
  if (!trips) return null;

  const active = trips.find((t) => t.active);

  return (
    <section className="mt-6 border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Your trips</p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
            {active?.name ?? "My trip"}
          </h3>
        </div>
        <button type="button" disabled={busy} onClick={() => void act("create", {}, true)} className={smallButton}>
          Start another trip
        </button>
      </div>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        Everything you plan below belongs to the trip that is open. The others are kept exactly as you left them.
      </p>

      <ul className="mt-4 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">
        {trips.map((trip) => (
          <li key={trip.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              {renaming === trip.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act("rename", { id: trip.id, name: draftName }, trip.active);
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    aria-label="Trip name"
                    autoFocus
                    className="min-h-[36px] rounded-md border border-[var(--gold-light)] bg-white px-3 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none"
                  />
                  <button type="submit" disabled={busy} className={smallButton}>
                    Save
                  </button>
                  <button type="button" onClick={() => setRenaming(null)} className={smallButton}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <p className="font-semibold text-[var(--navy)]">
                    {trip.name}
                    {trip.active && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold)]">Open</span>
                    )}
                  </p>
                  <p className="text-xs text-stone-500">
                    {[
                      `${trip.stops} ${trip.stops === 1 ? "stop" : "stops"}`,
                      trip.days ? `${trip.days} ${trip.days === 1 ? "day" : "days"}` : "no dates yet",
                      countdownPhrase(tripProgress({ startDate: trip.startDate, endDate: trip.endDate, today })),
                      trip.places ? `${trip.places} saved` : "",
                      trip.shared ? "shared" : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </>
              )}
            </div>

            {renaming !== trip.id && (
              <div className="flex flex-wrap gap-2">
                {!trip.active && (
                  <button type="button" disabled={busy} onClick={() => void act("switch", { id: trip.id }, true)} className={smallButton}>
                    Open
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRenaming(trip.id);
                    setDraftName(trip.name);
                  }}
                  className={smallButton}
                >
                  Rename
                </button>
                <button type="button" disabled={busy} onClick={() => void act("duplicate", { id: trip.id })} className={smallButton}>
                  Make a copy
                </button>
                {trips.length > 1 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Delete “${trip.name}”? Everything planned in it goes with it.`)) {
                        void act("delete", { id: trip.id }, trip.active);
                      }
                    }}
                    className="min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-400 hover:text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </section>
  );
}
