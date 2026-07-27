"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import KosherNearby from "@/components/KosherNearby";
import ShareItineraryPanel from "@/components/ShareItineraryPanel";
import type { KeverResult } from "@/lib/kever-search";
import type { LodgingResult } from "@/lib/lodging-search";
import { directionsBetweenUrl } from "@/data/route-utils";
import { geocodeMissing } from "@/lib/geocode";
import { moveStop, planRoute } from "@/lib/route-plan";
import { fetchRoadTimes } from "@/lib/road-times";
import {
  buildDays,
  emptyItinerary,
  formatDuration,
  formatKm,
  nextDate,
  summarize,
  unscheduledActivities,
  type Itinerary,
  type ItinActivity,
  type ItinFlight,
  type ItinLodging,
  type LodgingType,
  type TravelLeg,
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
  const [planning, setPlanning] = useState(false);
  const [planNote, setPlanNote] = useState("");

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
  const unscheduled = useMemo(() => unscheduledActivities(itin), [itin]);
  const hasDates = Boolean(itin.startDate && itin.endDate);

  // Look up any missing locations, then arrange the trip: stops you gave a date
  // stay on that date, everything else is placed and ordered for the shortest
  // driving. Without locations we cannot measure anything, so geocode first.
  async function planMyRoute() {
    if (!hasDates) { setPlanNote("Set the trip start and end dates first."); return; }
    setPlanning(true);
    setPlanNote("Looking up locations…");
    let working = itin;
    const missing = itin.activities.filter((a) => !a.coordinates);
    if (missing.length) {
      const found = await geocodeMissing(missing.map((a) => ({ id: a.id, name: a.name, address: a.address, coordinates: a.coordinates })));
      if (Object.keys(found).length) {
        working = { ...working, activities: working.activities.map((a) => (found[a.id] ? { ...a, coordinates: found[a.id] } : a)) };
      }
    }
    setPlanNote("Planning the fastest route…");
    const result = planRoute(working);
    let planned = result.itinerary;

    // Replace the straight-line estimates with real road driving times.
    setPlanNote("Getting real driving times…");
    const chains = buildDays(planned)
      .map((d) => {
        const legs = d.travelLegs;
        if (!legs.length) return [];
        return [legs[0].fromCoordinates ?? "", ...legs.map((l) => l.toCoordinates ?? "")];
      })
      .filter((chain) => chain.length > 1 && chain.every(Boolean));
    const measured = await fetchRoadTimes(chains, planned.roadTimes ?? {});
    if (Object.keys(measured).length) planned = { ...planned, roadTimes: { ...(planned.roadTimes ?? {}), ...measured } };

    persist(planned);
    const stillMissing = result.unplaceable.length;
    setPlanning(false);
    setPlanNote(
      `Route planned${result.placed ? ` — ${result.placed} stop${result.placed > 1 ? "s" : ""} scheduled` : ""}.` +
        (Object.keys(measured).length ? " Driving times measured on real roads." : "") +
        (stillMissing ? ` ${stillMissing} stop${stillMissing > 1 ? "s" : ""} still need a location or a day.` : ""),
    );
    setTimeout(() => setPlanNote(""), 8000);
  }

  // Change any detail of a stop after it's on the route.
  const updateActivity = (updated: ItinActivity) => persist({ ...itin, activities: itin.activities.map((a) => (a.id === updated.id ? updated : a)) });

  const moveStopBy = (id: string, direction: -1 | 1) => persist(moveStop(itin, id, direction));
  const scheduleStop = (id: string, date: string) => persist({ ...itin, activities: itin.activities.map((a) => (a.id === id ? { ...a, date, order: undefined } : a)) });

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
          <button type="button" onClick={planMyRoute} disabled={planning} className="border border-[var(--gold)] bg-[var(--gold)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--navy)] hover:border-[var(--navy)] disabled:opacity-60">{planning ? "Planning…" : "⚡ Plan my route"}</button>
          {savedNote && <span className="text-xs font-semibold text-emerald-700">{savedNote}</span>}
          {planNote && <span className="text-xs font-semibold text-[var(--navy)]">{planNote}</span>}
        </div>
        {!hasDates && <p className="mt-3 border-l-4 border-[var(--gold)] bg-[var(--cream)] px-3 py-2 text-sm text-stone-700">Set your <strong>start and end dates</strong> above — the planner needs them to lay out the days and work out the route.</p>}
        <p className="mt-3 text-xs leading-5 text-stone-500">
          <strong>Plan my route</strong> keeps every stop you gave a date on that date, and arranges everything else around it — placing undated stops on the day that adds the least driving and putting each day in the fastest order. You can still reorder any day by hand.
        </p>

        {tab === "flight" && <FlightForm startDate={itin.startDate} onAdd={(f) => { addFlight(f); setTab(null); }} />}
        {tab === "hotel" && <LodgingForm startDate={itin.startDate} onAdd={(l) => { addLodging(l); setTab(null); }} />}
        {tab === "activity" && <ActivityForm startDate={itin.startDate} onAdd={(a) => { addActivity(a); setTab(null); }} />}
      </div>

      <ShareItineraryPanel />

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
            <Stat label="Driving (stops + transfers)" value={`${summary.travelHours} h`} />
            {summary.overpackedDays > 0 && <Stat label="Over-packed days" value={summary.overpackedDays} warn />}
            <div className="ml-auto flex gap-3">
              <Link href="/itinerary/print" target="_blank" className="border border-[var(--navy)] bg-[var(--navy)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">Print itinerary (PDF)</Link>
            </div>
          </div>

          {unscheduled.length > 0 && (
            <div className="mt-6 border border-dashed border-[var(--gold)] bg-[#fcfaf6] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Not scheduled yet ({unscheduled.length})</p>
              <p className="mt-1 text-sm text-stone-600">Give a stop a date to pin it to that day, or press <strong>Plan my route</strong> and we&apos;ll place it on the day that adds the least driving.</p>
              <ul className="mt-3 space-y-2">
                {unscheduled.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gold-light)] pt-2 first:border-t-0 first:pt-0">
                    <span className="min-w-0">
                      <span className="font-semibold text-[var(--navy)]">{a.name}</span>
                      {!a.coordinates && <span className="ml-2 text-xs text-amber-800">no location yet</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <select value="" onChange={(e) => e.target.value && scheduleStop(a.id, e.target.value)} className="rounded-md border border-[var(--gold-light)] bg-white px-2 py-1 text-xs text-[var(--navy)]">
                        <option value="">Put on a day…</option>
                        {days.map((d) => <option key={d.date} value={d.date}>Day {d.index + 1} — {d.label}</option>)}
                      </select>
                      <button type="button" onClick={() => removeActivity(a.id)} className="text-xs text-stone-400 hover:text-red-700">✕</button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 space-y-6">
            {days.map((day) => <DayCard key={day.date} day={day} onMove={moveStopBy} onUpdate={updateActivity} onRemove={removeActivity} allDates={days.map((d) => ({ date: d.date, label: d.label }))} />)}
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

function DayCard({ day, onMove, onUpdate, onRemove, allDates }: {
  day: ReturnType<typeof buildDays>[number];
  onMove: (id: string, direction: -1 | 1) => void;
  onUpdate: (a: ItinActivity) => void;
  onRemove: (id: string) => void;
  allDates: Array<{ date: string; label: string }>;
}) {
  const [nearby, setNearby] = useState<Array<{ name: string; href: string; km: number }> | null>(null);
  const [ai, setAi] = useState<{ text?: string; reason?: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const anchor = day.activities.find((a) => a.coordinates) || (day.lodging?.coordinates ? { coordinates: day.lodging.coordinates } : null);
  const canSuggest = Boolean(anchor?.coordinates);
  const hasFreeTime = (day.freeHours ?? 0) >= 3;

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
        <p className="text-sm font-semibold text-stone-500">
          {day.label}
          {day.travelHours > 0 ? <span className="ml-3 text-xs font-normal text-stone-400">≈{day.travelHours} h driving between stops</span> : null}
        </p>
      </div>

      {day.warnings.map((w, i) => (
        <p key={i} className={`mt-3 border-l-4 px-3 py-2 text-sm ${w.startsWith("No place") ? "border-red-400 bg-red-50 text-red-800" : "border-[var(--gold)] bg-[var(--cream)] text-stone-700"}`}>{w}</p>
      ))}

      <div className="mt-4 space-y-3">
        {day.flightsArriving.map((f) => <p key={`a-${f.id}`} className="text-sm text-[var(--navy)]">✈️ Arrive {f.to}{f.arriveTime ? ` at ${f.arriveTime}` : ""} — {f.from} → {f.to}{f.airline ? ` (${f.airline})` : ""}</p>)}
        <TransferLine leg={day.travelLegs.find((l) => l.kind === "arrive-airport" || l.kind === "from-lodging")} />
        {day.activities.map((a, i) => (
          <div key={a.id} className="border-t border-[var(--gold-light)] pt-3 first:border-t-0 first:pt-0">
            {a.distanceFromPrev !== null && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                ↓ {formatKm(a.distanceFromPrev)} · {a.travelIsMeasured ? "" : "≈"}{formatDuration(a.travelMinutesFromPrev)} drive from previous stop{" "}
                <a
                  href={directionsBetweenUrl({ address: day.activities[i - 1]?.address, coordinates: day.activities[i - 1]?.coordinates }, { address: a.address, coordinates: a.coordinates })}
                  target="_blank"
                  rel="noreferrer"
                  className="normal-case tracking-normal text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
                >
                  exact time →
                </a>
              </p>
            )}
            <div className="flex items-start justify-between gap-3">
              <p className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
                <span className="mr-2 text-sm font-bold text-[var(--gold)]">{i + 1}.</span>
                {a.startTime ? <span className="mr-2 text-sm font-semibold text-[var(--gold)]">{a.startTime}</span> : null}
                {a.name}
                {a.yiddishName ? <span className="ml-2 text-base text-stone-500">{a.yiddishName}</span> : null}
              </p>
              <span className="flex shrink-0 items-center gap-1">
                {day.activities.length > 1 && (
                  <>
                    <button type="button" onClick={() => onMove(a.id, -1)} disabled={i === 0} aria-label={`Move ${a.name} earlier`} className="border border-[var(--gold-light)] px-2 py-0.5 text-xs text-[var(--navy)] transition hover:bg-[var(--cream-deep)] disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => onMove(a.id, 1)} disabled={i === day.activities.length - 1} aria-label={`Move ${a.name} later`} className="border border-[var(--gold-light)] px-2 py-0.5 text-xs text-[var(--navy)] transition hover:bg-[var(--cream-deep)] disabled:opacity-30">↓</button>
                  </>
                )}
                <button type="button" onClick={() => setEditingId(editingId === a.id ? null : a.id)} className="border border-[var(--gold)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">
                  {editingId === a.id ? "Close" : "Edit"}
                </button>
              </span>
            </div>
            {editingId === a.id && (
              <EditStopForm
                activity={a}
                allDates={allDates}
                onSave={(updated) => { onUpdate(updated); setEditingId(null); }}
                onRemove={() => { onRemove(a.id); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
              />
            )}
            {a.address && <p className="text-sm text-stone-600">{a.address}</p>}
            {(a.phone || a.href) && (
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {a.phone && <a href={`tel:${a.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">📞 {a.phone}</a>}
                {a.href && (a.href.startsWith("/") ? <Link href={a.href} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">Details →</Link> : <a href={a.href} target="_blank" rel="noreferrer" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">Link →</a>)}
              </p>
            )}
            {a.notes && <p className="mt-1 text-sm text-stone-500">{a.notes}</p>}
          </div>
        ))}
        <TransferLine leg={day.travelLegs.find((l) => l.kind === "to-lodging" || l.kind === "depart-airport")} />
        {day.flightsDeparting.map((f) => <p key={`d-${f.id}`} className="text-sm text-[var(--navy)]">✈️ Depart {f.from}{f.departTime ? ` at ${f.departTime}` : ""} — {f.from} → {f.to}{f.airline ? ` (${f.airline})` : ""}</p>)}
      </div>

      <p className="mt-4 border-t border-[var(--gold-light)] pt-3 text-sm">
        <span className={caption}>Tonight</span>{" "}
        {day.lodging ? (
          <span className="text-[var(--navy)]">🛏️ {day.lodging.type === "overnight-transit" ? `Overnight ${day.lodging.name || "bus/flight"}` : day.lodging.name}{day.lodging.address ? ` — ${day.lodging.address}` : ""}{day.lodging.phone ? <> · <a href={`tel:${day.lodging.phone.replace(/[^\d+]/g, "")}`} className="underline decoration-[var(--gold)] underline-offset-2">📞 {day.lodging.phone}</a></> : null}</span>
        ) : (
          <span className="text-stone-400">— not set —</span>
        )}
      </p>

      {(canSuggest || hasFreeTime) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {hasFreeTime && <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--gold)]">Free time — fill it?</span>}
          {canSuggest && <button type="button" onClick={showNearby} className="border border-[var(--gold-light)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">What&apos;s nearby?</button>}
          <button type="button" onClick={askAi} disabled={loadingAi} className="border border-[var(--gold-light)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)] disabled:opacity-60">{loadingAi ? "Getting ideas…" : "Ideas for free time"}</button>
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
        <div className="mt-3 border border-[var(--gold-light)] bg-white text-sm text-stone-700">
          {/* Scrolls rather than clipping when the assistant gives several ideas. */}
          <div className="max-h-72 overflow-y-auto overscroll-contain p-3">
            {ai.text ? <p className="whitespace-pre-line">{ai.text}</p> : <p className="text-stone-500">{ai.reason}</p>}
          </div>
        </div>
      )}
      {anchor?.coordinates && (
        <div className="mt-4">
          <KosherNearby coordinates={anchor.coordinates} radiusKm={12} showAddToTrip heading="Kosher food near this day's stops" />
        </div>
      )}
    </article>
  );
}

// ---- Small pieces -----------------------------------------------------

// Change anything about a stop that is already on the route — how long you
// stay, the time, a phone number, the address, or which day it belongs to.
function EditStopForm({ activity, allDates, onSave, onRemove, onCancel }: {
  activity: ItinActivity;
  allDates: Array<{ date: string; label: string }>;
  onSave: (a: ItinActivity) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<ItinActivity>({ ...activity });
  return (
    <div className="mt-3 rounded-md border border-[var(--gold)] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--gold)]">Edit this stop</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name"><input className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Address"><AddressAutocomplete value={f.address ?? ""} onChange={(address, coords) => setF({ ...f, address, coordinates: coords || f.coordinates })} className={inputClass} placeholder="Start typing the address…" /></Field>
        <Field label="Coordinates"><input className={inputClass} value={f.coordinates ?? ""} onChange={(e) => setF({ ...f, coordinates: e.target.value })} placeholder="lat, lng — needed for travel time" /></Field>
        <Field label="Day"><select className={inputClass} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value, order: undefined })}><option value="">Not scheduled</option>{allDates.map((d, i) => <option key={d.date} value={d.date}>Day {i + 1} — {d.label}</option>)}</select></Field>
        <Field label="Start time"><input type="time" className={inputClass} value={f.startTime ?? ""} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></Field>
        <Field label="How long (minutes)"><input type="number" min={0} step={15} className={inputClass} value={f.durationMins ?? ""} onChange={(e) => setF({ ...f, durationMins: Number(e.target.value) || undefined })} placeholder="90" /></Field>
        <Field label="Phone"><input type="tel" className={inputClass} value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Link"><input type="url" className={inputClass} value={f.href ?? ""} onChange={(e) => setF({ ...f, href: e.target.value })} /></Field>
        <Field label="Notes"><input className={inputClass} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => onSave(f)} className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">Save changes</button>
        <button type="button" onClick={onCancel} className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Cancel</button>
        <button type="button" onClick={onRemove} className="ml-auto text-xs text-stone-400 hover:text-red-700">Remove this stop</button>
      </div>
    </div>
  );
}

// A transfer to/from the hotel or the airport — travel that also eats the day.
function TransferLine({ leg }: { leg?: TravelLeg }) {
  if (!leg) return null;
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
      🚗 {leg.label} — {formatKm(leg.km)} · {leg.measured ? "" : "≈"}{formatDuration(leg.minutes)}{" "}
      <a
        href={directionsBetweenUrl({ coordinates: leg.fromCoordinates }, { coordinates: leg.toCoordinates })}
        target="_blank"
        rel="noreferrer"
        className="normal-case tracking-normal text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
      >
        exact time →
      </a>
    </p>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
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
      <Field label="From *"><AirportAutocomplete value={f.from ?? ""} onChange={(v) => setF({ ...f, from: v })} className={inputClass} placeholder="City or airport — e.g. New York, JFK" /></Field>
      <Field label="To *"><AirportAutocomplete value={f.to ?? ""} onChange={(v) => setF({ ...f, to: v })} className={inputClass} placeholder="City or airport — e.g. Kyiv, KBP" /></Field>
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

  function pickLodging(g: LodgingResult) {
    setL((prev) => ({ ...prev, name: g.name, address: g.address ?? prev.address, phone: g.phone ?? prev.phone, notes: prev.notes || g.notes }));
  }

  // You cannot check out on or before the day you check in.
  const checkOutTooEarly = Boolean(!overnight && l.checkIn && l.checkOut && l.checkOut <= l.checkIn);
  const minCheckOut = l.checkIn ? nextDate(l.checkIn) : undefined;

  return (
    <FormShell
      title="Add lodging / where you sleep"
      error={checkOutTooEarly ? "Check-out has to be at least the day after check-in." : ""}
      onSubmit={() => {
        if (checkOutTooEarly) return;
        if ((overnight || l.name) && l.checkIn) {
          onAdd({ id: uid(), type: (l.type as LodgingType) || "hotel", name: l.name || (overnight ? "bus/flight" : ""), address: l.address, coordinates: l.coordinates, phone: l.phone, checkIn: l.checkIn, checkOut: overnight ? nextDate(l.checkIn) : l.checkOut || nextDate(l.checkIn), notes: l.notes, bookedOnSite: false });
        }
      }}
    >
      {!overnight && (
        <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-[var(--gold-light)] bg-[#faf7ef] p-3">
          <span className={caption}>Pick from lodging we&apos;ve researched near the kevarim</span>
          <LodgingPicker onPick={pickLodging} />
          <p className="mt-2 text-[11px] text-stone-500">Kosher-friendly guesthouses and hotels we&apos;ve gathered — confirm rates and availability directly. Or just type your own below.</p>
        </div>
      )}
      <Field label="Type"><select className={inputClass} defaultValue="hotel" onChange={(e) => setL({ ...l, type: e.target.value as LodgingType })}><option value="hotel">Hotel / guesthouse</option><option value="overnight-transit">Overnight bus / flight (sleep in transit)</option><option value="other">Other (family, apartment…)</option></select></Field>
      {!overnight && <Field label="Name *"><input className={inputClass} value={l.name ?? ""} onChange={(e) => setL({ ...l, name: e.target.value })} /></Field>}
      {overnight && <Field label="Bus or flight?"><input className={inputClass} value={l.name ?? ""} placeholder="e.g. overnight bus to Uman" onChange={(e) => setL({ ...l, name: e.target.value })} /></Field>}
      {!overnight && <Field label="Address"><AddressAutocomplete value={l.address ?? ""} onChange={(address, coords) => setL({ ...l, address, coordinates: coords || l.coordinates })} className={inputClass} placeholder="Start typing the hotel address…" /></Field>}
      {!overnight && <Field label="Phone"><input type="tel" className={inputClass} value={l.phone ?? ""} onChange={(e) => setL({ ...l, phone: e.target.value })} placeholder="Front desk / host" /></Field>}
      <Field label={overnight ? "Night of *" : "Check-in *"}><input type="date" className={inputClass} defaultValue={startDate} onChange={(e) => setL({ ...l, checkIn: e.target.value })} /></Field>
      {!overnight && <Field label="Check-out *"><input type="date" className={inputClass} min={minCheckOut} value={l.checkOut ?? ""} onChange={(e) => setL({ ...l, checkOut: e.target.value })} /></Field>}
    </FormShell>
  );
}

// Search-and-pick lodging from the site's researched accommodations.
function LodgingPicker({ onPick }: { onPick: (g: LodgingResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<LodgingResult[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setResults([]); return; }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lodging/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (active) setResults(data.results ?? []);
      } catch {
        if (active) setResults([]);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [q]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative mt-1">
      <input
        className={inputClass}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search by place or city — e.g. Uman, Lizhensk, guesthouse…"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 max-h-72 overflow-auto border border-[var(--gold-light)] bg-white shadow-lg">
          {results.map((g, i) => (
            <li key={`${g.name}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onPick(g); setQ(""); setResults([]); setOpen(false); }}
                className="block w-full px-3 py-2 text-left hover:bg-[var(--cream)]"
              >
                <span className="text-sm font-semibold text-[var(--navy)]">{g.name}</span>
                <span className="block text-xs text-stone-500">{g.city}{g.phone ? ` · ${g.phone}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityForm({ startDate, onAdd }: { startDate: string; onAdd: (a: ItinActivity) => void }) {
  const [a, setA] = useState<Partial<ItinActivity>>({ date: startDate });

  function pickKever(k: KeverResult) {
    setA((prev) => ({
      ...prev,
      name: k.name,
      yiddishName: k.yiddishName,
      address: k.address,
      coordinates: k.coordinates || prev.coordinates,
      href: k.href,
      phone: k.phone ?? prev.phone,
      keverSlug: k.slug,
      notes: prev.notes || k.notes,
    }));
  }

  return (
    <FormShell title="Add an activity / stop" onSubmit={() => { if (a.name) onAdd({ id: uid(), name: a.name, yiddishName: a.yiddishName, address: a.address, coordinates: a.coordinates, date: a.date ?? "", startTime: a.startTime, durationMins: a.durationMins, href: a.href, phone: a.phone, keverSlug: a.keverSlug, notes: a.notes, bookedOnSite: false }); }}>
      <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-[var(--gold-light)] bg-[#faf7ef] p-3">
        <span className={caption}>Add a kever from our list — we&apos;ll fill in the rest</span>
        <KeverPicker onPick={pickKever} />
        {a.keverSlug && <p className="mt-2 text-xs font-semibold text-emerald-700">Filled from our directory: {a.name}. Edit anything below if you like.</p>}
      </div>
      <Field label="Name *"><input className={inputClass} value={a.name ?? ""} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder="Kever, museum, meal…" /></Field>
      <Field label="Address"><AddressAutocomplete value={a.address ?? ""} onChange={(address, coords) => setA({ ...a, address, coordinates: coords || a.coordinates })} className={inputClass} placeholder="Start typing the address…" /></Field>
      <Field label="Coordinates"><input className={inputClass} value={a.coordinates ?? ""} placeholder="Auto-filled from the address" onChange={(e) => setA({ ...a, coordinates: e.target.value })} /></Field>
      <Field label="Phone"><input type="tel" className={inputClass} value={a.phone ?? ""} onChange={(e) => setA({ ...a, phone: e.target.value })} placeholder="Contact number for this stop" /></Field>
      <Field label="Link"><input type="url" className={inputClass} value={a.href ?? ""} onChange={(e) => setA({ ...a, href: e.target.value })} placeholder="https://… (map, booking, our kever page)" /></Field>
      <Field label="Date (leave empty to let the planner place it)"><input type="date" className={inputClass} value={a.date ?? ""} onChange={(e) => setA({ ...a, date: e.target.value })} /></Field>
      <Field label="Time"><input type="time" className={inputClass} value={a.startTime ?? ""} onChange={(e) => setA({ ...a, startTime: e.target.value })} /></Field>
      <Field label="Duration (min)"><input type="number" min={0} className={inputClass} value={a.durationMins ?? ""} onChange={(e) => setA({ ...a, durationMins: Number(e.target.value) || undefined })} /></Field>
      <Field label="Notes"><input className={inputClass} value={a.notes ?? ""} onChange={(e) => setA({ ...a, notes: e.target.value })} /></Field>
    </FormShell>
  );
}

// Search-and-pick a kever from the site's own directory; fills the whole form.
function KeverPicker({ onPick }: { onPick: (k: KeverResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<KeverResult[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setResults([]); return; }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kevarim/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (active) setResults(data.results ?? []);
      } catch {
        if (active) setResults([]);
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [q]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative mt-1">
      <input
        className={inputClass}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search a kever, city, or tzaddik — e.g. Uman, Lizhensk, Baba Sali…"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 max-h-72 overflow-auto border border-[var(--gold-light)] bg-white shadow-lg">
          {results.map((k) => (
            <li key={k.slug}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onPick(k); setQ(""); setResults([]); setOpen(false); }}
                className="block w-full px-3 py-2 text-left hover:bg-[var(--cream)]"
              >
                <span className="text-sm font-semibold text-[var(--navy)]">{k.name}</span>
                {k.yiddishName ? <span className="ml-2 text-sm text-stone-500">{k.yiddishName}</span> : null}
                <span className="block text-xs text-stone-500">{[k.city, k.country].filter(Boolean).join(", ")}{k.coordinates ? "" : " · location — confirm locally"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormShell({ title, children, onSubmit, error }: { title: string; children: React.ReactNode; onSubmit: () => void; error?: string }) {
  return (
    <div className="mt-5 border-t border-[var(--gold-light)] pt-5">
      <p className="text-sm font-bold text-[var(--navy)]">{title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <button type="button" onClick={onSubmit} disabled={Boolean(error)} className="mt-4 border border-[var(--navy)] bg-[var(--navy)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-50">Add</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className={caption}>{label}</span>{children}</label>;
}
