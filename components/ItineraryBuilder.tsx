"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildDays,
  emptyItinerary,
  formatKm,
  summarize,
  type Itinerary,
  type ItinActivity,
  type ItinFlight,
  type ItinLodging,
  type LodgingType,
} from "@/data/itinerary";
import type { SavedPlace } from "@/data/route-utils";

const LS_KEY = "whiteGloveItinerary";
const ROUTE_KEY = "whiteGloveMyRoute";

const inputClass = "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const caption = "text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500";
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

type Tab = "flight" | "hotel" | "activity" | null;

export default function ItineraryBuilder() {
  const [itin, setItin] = useState<Itinerary>(emptyItinerary());
  const [tab, setTab] = useState<Tab>(null);
  const [loaded, setLoaded] = useState(false);
  const [savedNote, setSavedNote] = useState("");

  // Load: account first, then localStorage.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/account/itinerary", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (active && data?.itinerary) {
            setItin({ ...emptyItinerary(), ...data.itinerary });
            setLoaded(true);
            return;
          }
        }
      } catch {
        /* not logged in / offline */
      }
      try {
        const local = localStorage.getItem(LS_KEY);
        if (active && local) setItin({ ...emptyItinerary(), ...JSON.parse(local) });
      } catch {
        /* ignore */
      }
      if (active) setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  function persist(next: Itinerary) {
    setItin(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    void fetch("/api/account/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itinerary: next }),
    })
      .then((r) => {
        if (r.ok) {
          setSavedNote("Saved to your account.");
          setTimeout(() => setSavedNote(""), 1500);
        }
      })
      .catch(() => undefined);
  }

  const set = (patch: Partial<Itinerary>) => persist({ ...itin, ...patch });
  const addFlight = (f: ItinFlight) => persist({ ...itin, flights: [...itin.flights, f] });
  const addLodging = (l: ItinLodging) => persist({ ...itin, lodging: [...itin.lodging, l] });
  const addActivity = (a: ItinActivity) => persist({ ...itin, activities: [...itin.activities, a] });
  const removeFlight = (id: string) => persist({ ...itin, flights: itin.flights.filter((x) => x.id !== id) });
  const removeLodging = (id: string) => persist({ ...itin, lodging: itin.lodging.filter((x) => x.id !== id) });
  const removeActivity = (id: string) => persist({ ...itin, activities: itin.activities.filter((x) => x.id !== id) });

  function importSavedRoute() {
    try {
      const saved = JSON.parse(localStorage.getItem(ROUTE_KEY) || "[]") as SavedPlace[];
      const existing = new Set(itin.activities.map((a) => a.name.toLowerCase()));
      const additions: ItinActivity[] = saved
        .filter((p) => !existing.has(p.name.toLowerCase()))
        .map((p) => ({ id: uid(), name: p.name, yiddishName: p.yiddishName, address: p.address, coordinates: p.coordinates, href: p.href, date: p.plannedDate || itin.startDate || "", bookedOnSite: true }));
      if (additions.length) persist({ ...itin, activities: [...itin.activities, ...additions] });
    } catch {
      /* ignore */
    }
  }

  const days = useMemo(() => (itin.startDate && itin.endDate ? buildDays(itin) : []), [itin]);
  const summary = useMemo(() => summarize(days), [days]);

  return (
    <div>
      {/* Trip header */}
      <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className={caption}>Trip name</span><input className={inputClass} value={itin.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <label className="block"><span className={caption}>Traveler name</span><input className={inputClass} value={itin.travelerName ?? ""} onChange={(e) => set({ travelerName: e.target.value })} placeholder="Shown on the printed itinerary" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={caption}>Start date</span><input type="date" className={inputClass} value={itin.startDate} onChange={(e) => set({ startDate: e.target.value })} /></label>
            <label className="block"><span className={caption}>End date</span><input type="date" className={inputClass} value={itin.endDate} onChange={(e) => set({ endDate: e.target.value })} /></label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setTab(tab === "flight" ? null : "flight")} className="border border-[var(--gold)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">+ Flight</button>
          <button type="button" onClick={() => setTab(tab === "hotel" ? null : "hotel")} className="border border-[var(--gold)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">+ Hotel / where you sleep</button>
          <button type="button" onClick={() => setTab(tab === "activity" ? null : "activity")} className="border border-[var(--gold)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">+ Activity / stop</button>
          <button type="button" onClick={importSavedRoute} className="border border-[var(--gold-light)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">Import my saved route</button>
          {savedNote && <span className="text-xs font-semibold text-emerald-700">{savedNote}</span>}
        </div>

        {tab === "flight" && <FlightForm startDate={itin.startDate} onAdd={(f) => { addFlight(f); setTab(null); }} />}
        {tab === "hotel" && <LodgingForm startDate={itin.startDate} onAdd={(l) => { addLodging(l); setTab(null); }} />}
        {tab === "activity" && <ActivityForm startDate={itin.startDate} onAdd={(a) => { addActivity(a); setTab(null); }} />}
      </div>

      {/* Bookings summary + print */}
      {(itin.flights.length + itin.lodging.length + itin.activities.length) > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <BookingList title="Flights" items={itin.flights.map((f) => ({ id: f.id, label: `${f.from} → ${f.to}`, sub: `${f.date}${f.departTime ? " · " + f.departTime : ""}` }))} onRemove={removeFlight} />
          <BookingList title="Lodging" items={itin.lodging.map((l) => ({ id: l.id, label: l.type === "overnight-transit" ? `Overnight ${l.name || "transit"}` : l.name, sub: `${l.checkIn} → ${l.checkOut}` }))} onRemove={removeLodging} />
          <BookingList title="Activities" items={itin.activities.map((a) => ({ id: a.id, label: a.name, sub: `${a.date}${a.startTime ? " · " + a.startTime : ""}` }))} onRemove={removeActivity} />
        </div>
      )}

      {/* Analysis + day-by-day */}
      {loaded && days.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-4 border border-[var(--gold-light)] bg-[var(--cream-deep)] p-5">
            <Stat label="Nights" value={summary.nights} />
            <Stat label="Nights without lodging" value={summary.nightsWithoutLodging} warn={summary.nightsWithoutLodging > 0} />
            <Stat label="Empty days" value={summary.emptyDays} warn={summary.emptyDays > 0} />
            <div className="ml-auto flex gap-3">
              <Link href="/itinerary/print" target="_blank" className="border border-[var(--navy)] bg-[var(--navy)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">Print itinerary (PDF)</Link>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {days.map((day) => <DayCard key={day.date} day={day} />)}
          </div>
        </>
      )}

      {loaded && days.length === 0 && (
        <div className="mt-8 border border-dashed border-[var(--gold-light)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Set your start and end dates to build the day-by-day plan.</p>
          <p className="mt-2 text-sm text-stone-600">Then add your flights, hotels, and stops above — we&apos;ll lay them out and flag anything missing.</p>
        </div>
      )}
    </div>
  );
}

// ---- Day card with checks + suggestions ------------------------------

function DayCard({ day }: { day: ReturnType<typeof buildDays>[number] }) {
  const [nearby, setNearby] = useState<Array<{ name: string; href: string; km: number }> | null>(null);
  const [ai, setAi] = useState<{ text?: string; reason?: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const anchor = day.activities.find((a) => a.coordinates) || (day.lodging?.coordinates ? { coordinates: day.lodging.coordinates } : null);
  const canSuggest = Boolean(anchor?.coordinates);

  async function showNearby() {
    if (!anchor?.coordinates) return;
    const exclude = day.activities.map((a) => a.name).join("|");
    const res = await fetch(`/api/itinerary/nearby?coordinates=${encodeURIComponent(anchor.coordinates)}&exclude=${encodeURIComponent(exclude)}`);
    const data = await res.json().catch(() => ({ suggestions: [] }));
    setNearby(data.suggestions ?? []);
  }
  async function askAi() {
    setLoadingAi(true);
    const location = day.activities[0]?.address || day.activities[0]?.name || day.lodging?.address || day.lodging?.name || "";
    const res = await fetch("/api/itinerary/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, date: day.label, freeHours: day.freeHours, alreadyPlanned: day.activities.map((a) => a.name) }),
    });
    const data = await res.json().catch(() => ({ available: false, reason: "Failed." }));
    setAi(data.available ? { text: data.text } : { reason: data.reason });
    setLoadingAi(false);
  }

  return (
    <article className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Day {day.index + 1}</h3>
        <p className="text-sm font-semibold text-stone-500">{day.label}</p>
      </div>

      {day.warnings.map((w, i) => (
        <p key={i} className={`mt-3 border-l-4 px-3 py-2 text-sm ${w.startsWith("No place") ? "border-red-400 bg-red-50 text-red-800" : "border-[var(--gold)] bg-[var(--cream)] text-stone-700"}`}>{w}</p>
      ))}

      <div className="mt-4 space-y-3">
        {day.flightsArriving.map((f) => <p key={`a-${f.id}`} className="text-sm text-[var(--navy)]">✈️ Arrive {f.to}{f.arriveTime ? ` at ${f.arriveTime}` : ""} — {f.from} → {f.to}{f.airline ? ` (${f.airline})` : ""}</p>)}
        {day.activities.map((a) => (
          <div key={a.id} className="border-t border-[var(--gold-light)] pt-3 first:border-t-0 first:pt-0">
            {a.distanceFromPrev !== null && <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">↓ {formatKm(a.distanceFromPrev)} from previous stop</p>}
            <p className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{a.startTime ? <span className="mr-2 text-sm font-semibold text-[var(--gold)]">{a.startTime}</span> : null}{a.name}{a.yiddishName ? <span className="ml-2 text-base text-stone-500">{a.yiddishName}</span> : null}</p>
            {a.address && <p className="text-sm text-stone-600">{a.address}</p>}
            {a.notes && <p className="mt-1 text-sm text-stone-500">{a.notes}</p>}
          </div>
        ))}
        {day.flightsDeparting.map((f) => <p key={`d-${f.id}`} className="text-sm text-[var(--navy)]">✈️ Depart {f.from}{f.departTime ? ` at ${f.departTime}` : ""} — {f.from} → {f.to}{f.airline ? ` (${f.airline})` : ""}</p>)}
      </div>

      <p className="mt-4 border-t border-[var(--gold-light)] pt-3 text-sm">
        <span className={caption}>Tonight</span>{" "}
        {day.lodging ? (
          <span className="text-[var(--navy)]">🛏️ {day.lodging.type === "overnight-transit" ? `Overnight ${day.lodging.name || "bus/flight"}` : day.lodging.name}{day.lodging.address ? ` — ${day.lodging.address}` : ""}</span>
        ) : (
          <span className="text-stone-400">— not set —</span>
        )}
      </p>

      {canSuggest && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={showNearby} className="border border-[var(--gold-light)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">What&apos;s nearby?</button>
          <button type="button" onClick={askAi} disabled={loadingAi} className="border border-[var(--gold-light)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)] disabled:opacity-60">{loadingAi ? "Asking AI…" : "Ask AI for ideas"}</button>
        </div>
      )}
      {nearby && (
        <div className="mt-3 text-sm text-stone-600">
          {nearby.length === 0 ? <p className="text-stone-400">No listed sites found within range.</p> : (
            <ul className="space-y-1">{nearby.map((n) => <li key={n.href}><Link href={n.href} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">{n.name}</Link> <span className="text-stone-400">· {formatKm(n.km)}</span></li>)}</ul>
          )}
        </div>
      )}
      {ai && (
        <div className="mt-3 border border-[var(--gold-light)] bg-white p-3 text-sm text-stone-700">
          {ai.text ? <p className="whitespace-pre-line">{ai.text}</p> : <p className="text-stone-500">{ai.reason}</p>}
        </div>
      )}
    </article>
  );
}

// ---- Small pieces -----------------------------------------------------

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <p className={`font-[family-name:var(--font-display)] text-3xl ${warn ? "text-red-700" : "text-[var(--navy)]"}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">{label}</p>
    </div>
  );
}

function BookingList({ title, items, onRemove }: { title: string; items: Array<{ id: string; label: string; sub: string }>; onRemove: (id: string) => void }) {
  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
      <p className={caption}>{title} ({items.length})</p>
      <ul className="mt-2 space-y-2">
        {items.length === 0 ? <li className="text-sm text-stone-400">None yet.</li> : items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-2 text-sm">
            <span className="min-w-0"><span className="font-semibold text-[var(--navy)]">{it.label}</span><br /><span className="text-xs text-stone-500">{it.sub}</span></span>
            <button type="button" onClick={() => onRemove(it.id)} className="shrink-0 text-xs text-stone-400 hover:text-red-700">✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FlightForm({ startDate, onAdd }: { startDate: string; onAdd: (f: ItinFlight) => void }) {
  const [f, setF] = useState<Partial<ItinFlight>>({ date: startDate });
  const [lookupNo, setLookupNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function runLookup() {
    const flightNumber = lookupNo.trim();
    if (!flightNumber) { setStatus("Enter a flight number to look up."); return; }
    const date = f.date || startDate;
    if (!date) { setStatus("Choose the flight date first."); return; }
    setBusy(true);
    setStatus("Looking up…");
    try {
      const res = await fetch("/api/flights/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flightNumber, date }),
      });
      const data = await res.json();
      if (data?.available && data.flight) {
        setF((prev) => ({ ...prev, ...data.flight }));
        setStatus(
          `Found: ${data.flight.airline || data.flight.flightNo} ${data.flight.from} → ${data.flight.to}` +
            (data.moreResults ? ` (+${data.moreResults} more — edit if needed)` : ""),
        );
      } else {
        setStatus(data?.reason || "Flight not found — enter the details by hand.");
      }
    } catch {
      setStatus("Lookup failed — enter the details by hand.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell title="Add a flight" onSubmit={() => { if (f.from && f.to && f.date) onAdd({ id: uid(), from: f.from, to: f.to, date: f.date, airline: f.airline, flightNo: f.flightNo, departTime: f.departTime, arriveTime: f.arriveTime, arriveDate: f.arriveDate, bookedOnSite: false }); }}>
      <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-[var(--gold-light)] bg-[#faf7ef] p-3">
        <span className={caption}>Auto-fill from a flight number</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input className={`${inputClass} mt-0 w-32`} value={lookupNo} onChange={(e) => setLookupNo(e.target.value)} placeholder="e.g. LY1" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void runLookup(); } }} />
          <button type="button" onClick={() => void runLookup()} disabled={busy} className="border border-[var(--navy)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white disabled:opacity-50">{busy ? "…" : "Look up"}</button>
          <span className="text-xs text-stone-600">Uses the date below.</span>
        </div>
        {status && <p className="mt-2 text-xs text-[var(--navy)]">{status}</p>}
      </div>
      <Field label="From *"><input className={inputClass} value={f.from ?? ""} onChange={(e) => setF({ ...f, from: e.target.value })} placeholder="e.g. JFK" /></Field>
      <Field label="To *"><input className={inputClass} value={f.to ?? ""} onChange={(e) => setF({ ...f, to: e.target.value })} placeholder="e.g. Kyiv (KBP)" /></Field>
      <Field label="Airline"><input className={inputClass} value={f.airline ?? ""} onChange={(e) => setF({ ...f, airline: e.target.value })} /></Field>
      <Field label="Flight #"><input className={inputClass} value={f.flightNo ?? ""} onChange={(e) => setF({ ...f, flightNo: e.target.value })} placeholder="e.g. LY1" /></Field>
      <Field label="Date *"><input type="date" className={inputClass} value={f.date ?? ""} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <Field label="Departs"><input type="time" className={inputClass} value={f.departTime ?? ""} onChange={(e) => setF({ ...f, departTime: e.target.value })} /></Field>
      <Field label="Arrives"><input type="time" className={inputClass} value={f.arriveTime ?? ""} onChange={(e) => setF({ ...f, arriveTime: e.target.value })} /></Field>
      <Field label="Lands next day?"><input type="date" className={inputClass} value={f.arriveDate ?? ""} onChange={(e) => setF({ ...f, arriveDate: e.target.value })} /></Field>
    </FormShell>
  );
}

function LodgingForm({ startDate, onAdd }: { startDate: string; onAdd: (l: ItinLodging) => void }) {
  const [l, setL] = useState<Partial<ItinLodging>>({ type: "hotel", checkIn: startDate });
  const overnight = l.type === "overnight-transit";
  return (
    <FormShell title="Add lodging / where you sleep" onSubmit={() => { if ((overnight || l.name) && l.checkIn) onAdd({ id: uid(), type: (l.type as LodgingType) || "hotel", name: l.name || (overnight ? "bus/flight" : ""), address: l.address, coordinates: l.coordinates, checkIn: l.checkIn, checkOut: l.checkOut || l.checkIn, notes: l.notes, bookedOnSite: false }); }}>
      <Field label="Type"><select className={inputClass} defaultValue="hotel" onChange={(e) => setL({ ...l, type: e.target.value as LodgingType })}><option value="hotel">Hotel / guesthouse</option><option value="overnight-transit">Overnight bus / flight (sleep in transit)</option><option value="other">Other (family, apartment…)</option></select></Field>
      {!overnight && <Field label="Name *"><input className={inputClass} onChange={(e) => setL({ ...l, name: e.target.value })} /></Field>}
      {overnight && <Field label="Bus or flight?"><input className={inputClass} placeholder="e.g. overnight bus to Uman" onChange={(e) => setL({ ...l, name: e.target.value })} /></Field>}
      {!overnight && <Field label="Address"><input className={inputClass} onChange={(e) => setL({ ...l, address: e.target.value })} /></Field>}
      <Field label={overnight ? "Night of *" : "Check-in *"}><input type="date" className={inputClass} defaultValue={startDate} onChange={(e) => setL({ ...l, checkIn: e.target.value })} /></Field>
      {!overnight && <Field label="Check-out *"><input type="date" className={inputClass} onChange={(e) => setL({ ...l, checkOut: e.target.value })} /></Field>}
    </FormShell>
  );
}

function ActivityForm({ startDate, onAdd }: { startDate: string; onAdd: (a: ItinActivity) => void }) {
  const [a, setA] = useState<Partial<ItinActivity>>({ date: startDate });
  return (
    <FormShell title="Add an activity / stop" onSubmit={() => { if (a.name && a.date) onAdd({ id: uid(), name: a.name, address: a.address, coordinates: a.coordinates, date: a.date, startTime: a.startTime, durationMins: a.durationMins, notes: a.notes, bookedOnSite: false }); }}>
      <Field label="Name *"><input className={inputClass} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder="Kever, museum, meal…" /></Field>
      <Field label="Address"><input className={inputClass} onChange={(e) => setA({ ...a, address: e.target.value })} /></Field>
      <Field label="Coordinates"><input className={inputClass} placeholder="50.05, 19.94 (for distances)" onChange={(e) => setA({ ...a, coordinates: e.target.value })} /></Field>
      <Field label="Date *"><input type="date" className={inputClass} defaultValue={startDate} onChange={(e) => setA({ ...a, date: e.target.value })} /></Field>
      <Field label="Time"><input type="time" className={inputClass} onChange={(e) => setA({ ...a, startTime: e.target.value })} /></Field>
      <Field label="Duration (min)"><input type="number" min={0} className={inputClass} onChange={(e) => setA({ ...a, durationMins: Number(e.target.value) || undefined })} /></Field>
      <Field label="Notes"><input className={inputClass} onChange={(e) => setA({ ...a, notes: e.target.value })} /></Field>
    </FormShell>
  );
}

function FormShell({ title, children, onSubmit }: { title: string; children: React.ReactNode; onSubmit: () => void }) {
  return (
    <div className="mt-5 border-t border-[var(--gold-light)] pt-5">
      <p className="text-sm font-bold text-[var(--navy)]">{title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      <button type="button" onClick={onSubmit} className="mt-4 border border-[var(--navy)] bg-[var(--navy)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">Add</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className={caption}>{label}</span>{children}</label>;
}
