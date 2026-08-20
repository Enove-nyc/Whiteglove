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
  /** Who the trip is for. Business accounts only; "" for everybody else. */
  client: string;
  /** The advisor on the trip — the agent the client is dealing with. */
  advisor: string;
  active: boolean;
  stops: number;
  places: number;
  days: number;
  startDate: string;
  endDate: string;
  shared: boolean;
  /** The public token when shared, so the client's app link can be built. */
  shareId?: string;
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
  // Naming the client is part of a Business account. Asked once, from the same
  // endpoint the branding panel uses, and the buttons simply are not drawn for
  // anybody else — a greyed-out control advertising an upgrade has no place in
  // the middle of somebody's planning.
  const [mayNameClient, setMayNameClient] = useState(false);
  const [clientFor, setClientFor] = useState<string | null>(null);
  const [draftClient, setDraftClient] = useState("");
  // The agent on the trip, edited the same way as the client name.
  const [advisorFor, setAdvisorFor] = useState<string | null>(null);
  const [draftAdvisor, setDraftAdvisor] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  // This site's own origin, so the client link is absolute and copyable. This
  // panel only ever renders after its trips have loaded on the client, so
  // window is always here by the time the link is drawn — no effect needed.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
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

  useEffect(() => {
    let live = true;
    fetch("/api/account/branding", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setMayNameClient(Boolean(d?.allowed)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const act = useCallback(
    async (action: string, payload: { id?: string; name?: string; client?: string; advisor?: string } = {}, reload = false) => {
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
        setClientFor(null);
        setAdvisorFor(null);
        if (reload) onSwitched?.();
      } catch {
        setError("Could not reach the server.");
      } finally {
        setBusy(false);
      }
    },
    [onSwitched],
  );

  // Copy the code (or the link) and flash "Copied!" on that one control.
  const copy = useCallback((key: string, text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(key);
        setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
      })
      .catch(() => undefined);
  }, []);

  // Not signed in, or the account store is not connected. Say nothing.
  if (!trips) return null;

  const active = trips.find((t) => t.active);

  return (
    <section className="mt-6 border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">Your trips</p>
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
              ) : clientFor === trip.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act("client", { id: trip.id, client: draftClient });
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <input
                    value={draftClient}
                    onChange={(e) => setDraftClient(e.target.value)}
                    aria-label="Who this trip is for"
                    placeholder="The Friedman family"
                    maxLength={60}
                    autoFocus
                    className="min-h-[36px] rounded-md border border-[var(--gold-light)] bg-white px-3 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none"
                  />
                  <button type="submit" disabled={busy} className={smallButton}>
                    Save
                  </button>
                  <button type="button" onClick={() => setClientFor(null)} className={smallButton}>
                    Cancel
                  </button>
                </form>
              ) : advisorFor === trip.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act("advisor", { id: trip.id, advisor: draftAdvisor });
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <input
                    value={draftAdvisor}
                    onChange={(e) => setDraftAdvisor(e.target.value)}
                    aria-label="The advisor on this trip"
                    placeholder="Sarah Klein"
                    maxLength={60}
                    autoFocus
                    className="min-h-[36px] rounded-md border border-[var(--gold-light)] bg-white px-3 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none"
                  />
                  <button type="submit" disabled={busy} className={smallButton}>
                    Save
                  </button>
                  <button type="button" onClick={() => setAdvisorFor(null)} className={smallButton}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <p className="font-semibold text-[var(--navy)]">
                    {trip.name}
                    {trip.active && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">Open</span>
                    )}
                  </p>
                  {trip.client && (
                    <p className="text-xs font-semibold text-[var(--gold-ink)]">For {trip.client}</p>
                  )}
                  {trip.advisor && (
                    <p className="text-xs text-stone-500">Advisor: {trip.advisor}</p>
                  )}
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

            {renaming !== trip.id && clientFor !== trip.id && advisorFor !== trip.id && (
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
                {mayNameClient && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setClientFor(trip.id);
                      setDraftClient(trip.client);
                    }}
                    className={smallButton}
                  >
                    {trip.client ? "Change who it is for" : "Who it is for"}
                  </button>
                )}
                {mayNameClient && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setAdvisorFor(trip.id);
                      setDraftAdvisor(trip.advisor);
                    }}
                    className={smallButton}
                  >
                    {trip.advisor ? "Change advisor" : "Advisor"}
                  </button>
                )}
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

            {/* The client's per-trip code — Business only, one code per trip.
                Send the client the code and they enter it on the app's front
                page; the link is the same thing pre-opened. Either opens THIS
                trip as the app on the client's phone, no account needed. Other
                trips are never reachable from it. */}
            {mayNameClient && renaming !== trip.id && clientFor !== trip.id && advisorFor !== trip.id && (
              <div className="mt-1 w-full">
                {trip.shareId ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">Client code</span>
                      <input
                        readOnly
                        value={trip.shareId}
                        onFocus={(e) => e.currentTarget.select()}
                        className="min-w-0 flex-1 rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-xs font-semibold tracking-[0.14em] text-[var(--navy)]"
                      />
                      <button type="button" onClick={() => copy(`${trip.id}-code`, trip.shareId!)} className={smallButton}>
                        {copied === `${trip.id}-code` ? "Copied!" : "Copy code"}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">or link</span>
                      <input
                        readOnly
                        value={`${origin}/i/${trip.shareId}/app`}
                        onFocus={(e) => e.currentTarget.select()}
                        className="min-w-0 flex-1 rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-xs text-[var(--navy)]"
                      />
                      <button type="button" onClick={() => copy(`${trip.id}-link`, `${origin}/i/${trip.shareId}/app`)} className={smallButton}>
                        {copied === `${trip.id}-link` ? "Copied!" : "Copy link"}
                      </button>
                      <button type="button" disabled={busy} onClick={() => void act("unshare", { id: trip.id })} className={smallButton}>
                        Stop
                      </button>
                    </div>
                    <p className="text-[11px] leading-4 text-stone-500">
                      Send your client the code — they enter it on the app&rsquo;s front page — or the link, which opens their trip directly.
                    </p>
                  </div>
                ) : (
                  <button type="button" disabled={busy} onClick={() => void act("share", { id: trip.id })} className={smallButton}>
                    Create a client code
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
