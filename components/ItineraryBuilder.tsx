"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import DateField from "@/components/DateField";
import KosherNearby from "@/components/KosherNearby";
import ShareItineraryPanel from "@/components/ShareItineraryPanel";
import TripSwitcher from "@/components/TripSwitcher";
import type { KeverResult } from "@/lib/kever-search";
import type { LodgingResult } from "@/lib/lodging-search";
import { directionsBetweenUrl, placeDirectionsUrl } from "@/data/route-utils";
import { geocodeMissing } from "@/lib/geocode";
import { moveStop, planRoute } from "@/lib/route-plan";
import { correctedEnd, earliestEnd, rangeIsBackwards } from "@/lib/date-range";
import { useViewer } from "@/lib/use-signed-in";
import { fetchRoadTimes } from "@/lib/road-times";
import { burialSummary, useKeverBurials } from "@/lib/use-kever-burials";
import {
  buildDays,
  emptyItinerary,
  flightArrivalDate,
  flightRouteLabel,
  formatDuration,
  formatKm,
  layoverMinutes,
  nextDate,
  readOvernightFlight,
  summarize,
  travelersOf,
  unscheduledActivities,
  type Itinerary,
  type ItinActivity,
  type ItinFlight,
  type FlightStop,
  type ItinLodging,
  type ItinTraveler,
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
  // Which flight the top form is editing, if any. Null means adding a new one.
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [planning, setPlanning] = useState(false);
  const [planNote, setPlanNote] = useState("");
  // Bumped when the traveler opens a different trip, so the loader runs again.
  const [reloadKey, setReloadKey] = useState(0);

  // Load: account first, then localStorage.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/account/itinerary", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!active) return;
          // Signed in — the account is the answer, even when the answer is an
          // empty trip. Falling through to localStorage here would drag the
          // last trip's stops into a newly started one.
          setItin(data?.itinerary ? { ...emptyItinerary(), ...data.itinerary } : emptyItinerary());
          setLoaded(true);
          return;
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
  }, [reloadKey]);

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
  // Editing keeps the id, so the flight is changed rather than swapped for a
  // new one — its connections and its booking reference come with it.
  const updateFlight = (next: ItinFlight) => persist({ ...itin, flights: itin.flights.map((x) => (x.id === next.id ? next : x)) });
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
  // Who is buried at each beis hachaim on the trip, looked up by slug.
  const burials = useKeverBurials(itin.activities);
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
        working = {
          ...working,
          activities: working.activities.map((a) =>
            found[a.id] ? { ...a, coordinates: found[a.id].coordinates, country: a.country || found[a.id].country } : a,
          ),
        };
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
    const measured = await fetchRoadTimes(chains, planned.roadTimes ?? {}, planned.startDate);
    const measuredCount = Object.keys(measured.times).length;
    if (measuredCount) {
      planned = {
        ...planned,
        roadTimes: { ...(planned.roadTimes ?? {}), ...measured.times },
        roadTimeSources: { ...(planned.roadTimeSources ?? {}), ...measured.sources },
      };
    }

    persist(planned);
    const stillMissing = result.unplaceable.length;
    setPlanning(false);
    // Say which engine answered. A Google time is the number Maps would give;
    // an OSRM one assumes empty roads, and a traveler deserves to know which
    // of those they are looking at before they build a day around it.
    const timesNote = !measuredCount
      ? measured.partial
        ? " Driving times could not be looked up just now, so the times shown are our own estimates."
        : ""
      : measured.engine === "google"
        ? " Driving times taken from Google Maps for an ordinary day's traffic."
        : " Driving times measured on real roads (no traffic allowance — treat them as a floor).";
    setPlanNote(
      `Route planned${result.placed ? ` — ${result.placed} stop${result.placed > 1 ? "s" : ""} scheduled` : ""}.` +
        timesNote +
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
      <div className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-4 shadow-[0_8px_26px_rgba(23,45,82,.06)] sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <label className="block"><span className={caption}>Trip name</span><input className={inputClass} value={itin.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block"><span className={caption}>Start date</span><DateField ariaLabel="Trip start date" className={inputClass} value={itin.startDate} onChange={(startDate) => {
              // Moving the start past the end takes the end with it, rather
              // than leaving a trip that finishes before it begins.
              set({ startDate, endDate: correctedEnd(startDate, itin.endDate) });
            }} /></label>
            <label className="block"><span className={caption}>End date</span><DateField ariaLabel="Trip end date" className={inputClass} min={earliestEnd(itin.startDate)} value={itin.endDate} onChange={(endDate) => set({ endDate: correctedEnd(itin.startDate, endDate) })} /></label>
            <label className="block"><span className={caption} title="What time you set off each morning. Arrival times are worked out from this.">Day starts</span><input type="time" className={inputClass} value={itin.dayStartTime ?? "08:00"} onChange={(e) => set({ dayStartTime: e.target.value })} /></label>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setEditingFlightId(null); setTab(tab === "flight" ? null : "flight"); }} className="border border-[var(--gold-light)] px-3 py-2 text-xs font-bold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">+ Flight</button>
          <button type="button" onClick={() => setTab(tab === "hotel" ? null : "hotel")} className="border border-[var(--gold-light)] px-3 py-2 text-xs font-bold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">+ Hotel</button>
          <button type="button" onClick={() => setTab(tab === "activity" ? null : "activity")} className="border border-[var(--gold-light)] px-3 py-2 text-xs font-bold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">+ Stop</button>
          <button type="button" onClick={importSavedRoute} className="border border-[var(--gold-light)] px-3 py-2 text-xs font-bold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">Import saved route</button>
          <button type="button" onClick={planMyRoute} disabled={planning} className="ml-auto border border-[var(--navy)] bg-[var(--navy)] px-4 py-2 text-xs font-bold text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60">{planning ? "Planning…" : "Plan route"}</button>
          {savedNote && <span className="text-xs font-semibold text-emerald-700">{savedNote}</span>}
          {planNote && <span className="text-xs font-semibold text-[var(--navy)]">{planNote}</span>}
        </div>
        {!hasDates && <p className="mt-3 text-xs font-semibold text-[var(--gold)]">Choose start and end dates to begin.</p>}

        {tab === "flight" && (() => {
          const editing = itin.flights.find((x) => x.id === editingFlightId);
          return (
            <FlightForm
              key={editing?.id ?? "new"}
              startDate={itin.startDate}
              initial={editing}
              onAdd={(f) => {
                if (editing) updateFlight(f);
                else addFlight(f);
                setEditingFlightId(null);
                setTab(null);
              }}
              onRemove={editing ? () => { removeFlight(editing.id); setEditingFlightId(null); setTab(null); } : undefined}
              onCancel={() => { setEditingFlightId(null); setTab(null); }}
            />
          );
        })()}
        {tab === "hotel" && <LodgingForm startDate={itin.startDate} onAdd={(l) => { addLodging(l); setTab(null); }} />}
        {tab === "activity" && <ActivityForm startDate={itin.startDate} onAdd={(a) => { addActivity(a); setTab(null); }} />}
      </div>

      <TravelersPanel
        travelers={travelersOf(itin)}
        onChange={(travelers) => set({ travelers, travelerName: travelers[0]?.name ?? "" })}
        bookingFor={itin.bookingFor}
        onBookingFor={(bookingFor, traveler) => {
          const travelers = traveler ? [...travelersOf(itin), traveler] : travelersOf(itin);
          set({ bookingFor, travelers, travelerName: travelers[0]?.name ?? "" });
        }}
      />

      <BookFlightsPanel itin={itin} />

      <TripSwitcher onSwitched={() => setReloadKey((k) => k + 1)} />

      <ShareItineraryPanel />

      {/* Bookings summary + print */}
      {(itin.flights.length + itin.lodging.length + itin.activities.length) > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <BookingList
            title="Flights"
            items={itin.flights.map((f) => {
              // A red-eye reads as leaving and landing on the same day unless
              // the list says otherwise, which is how a night in the air went
              // missing from the plan.
              const night = readOvernightFlight(f);
              const lands = night.arrivalDate > f.date ? ` → lands ${night.arrivalDate}` : "";
              return {
                id: f.id,
                label: `${f.from} → ${f.to}`,
                sub: `${f.date}${f.departTime ? " · " + f.departTime : ""}${lands}${night.overnight ? " · overnight" : ""}`,
              };
            })}
            onRemove={removeFlight}
            onEdit={(id) => { setEditingFlightId(id); setTab("flight"); }}
          />
          <BookingList title="Lodging" items={itin.lodging.map((l) => ({ id: l.id, label: l.type === "overnight-transit" ? `Overnight ${l.name || "transit"}` : l.name, sub: `${l.checkIn} → ${l.checkOut}` }))} onRemove={removeLodging} />
          <BookingList title="Activities" items={itin.activities.map((a) => ({ id: a.id, label: a.name, sub: `${a.date}${a.startTime ? " · " + a.startTime : ""}` }))} onRemove={removeActivity} />
        </div>
      )}

      {/* Analysis + day-by-day */}
      {loaded && days.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-4 border border-[var(--gold-light)] bg-[var(--cream-deep)] p-5">
            <Stat label="Nights" value={summary.nights} />
            <Stat label="Missing lodging" value={summary.nightsWithoutLodging} warn={summary.nightsWithoutLodging > 0} />
            <Stat label="Empty days" value={summary.emptyDays} warn={summary.emptyDays > 0} />
            <Stat label="Driving" value={`${summary.travelHours} h`} />
            {summary.overpackedDays > 0 && <Stat label="Over-packed days" value={summary.overpackedDays} warn />}
            <div className="ml-auto flex gap-3">
              <Link href="/itinerary/print" target="_blank" className="border border-[var(--navy)] bg-[var(--navy)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">Print itinerary (PDF)</Link>
            </div>
          </div>

          {unscheduled.length > 0 && (
            <div className="mt-6 border border-dashed border-[var(--gold)] bg-[#fcfaf6] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Not scheduled yet ({unscheduled.length})</p>
              <p className="mt-1 text-sm text-stone-600">Choose a day, or use <strong>Plan route</strong>.</p>
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
            {days.map((day) => (
              <DayCard
                key={day.date}
                day={day}
                burials={burials}
                onMove={moveStopBy}
                onUpdate={updateActivity}
                onRemove={removeActivity}
                onAddStop={addActivity}
                onAddLodging={addLodging}
                onAddFlight={addFlight}
                onUpdateFlight={updateFlight}
                onRemoveFlight={removeFlight}
                allDates={days.map((d) => ({ date: d.date, label: d.label }))}
              />
            ))}
          </div>
        </>
      )}

      {loaded && days.length === 0 && (
        <div className="mt-8 border border-dashed border-[var(--gold-light)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Choose your dates to begin.</p>
          <p className="mt-2 text-sm text-stone-600">Then add flights, hotels, and stops.</p>
        </div>
      )}
    </div>
  );
}

// ---- Day card with checks + suggestions ------------------------------

function DayCard({ day, burials, onMove, onUpdate, onRemove, onAddStop, onAddLodging, onAddFlight, onUpdateFlight, onRemoveFlight, allDates }: {
  day: ReturnType<typeof buildDays>[number];
  burials: Record<string, string[]>;
  onMove: (id: string, direction: -1 | 1) => void;
  onUpdate: (a: ItinActivity) => void;
  onRemove: (id: string) => void;
  /** Add straight onto this day, so a gap is filled where it is noticed. */
  onAddStop: (a: ItinActivity) => void;
  onAddLodging: (l: ItinLodging) => void;
  onAddFlight: (f: ItinFlight) => void;
  onUpdateFlight: (f: ItinFlight) => void;
  onRemoveFlight: (id: string) => void;
  allDates: Array<{ date: string; label: string }>;
}) {
  const [adding, setAdding] = useState<"stop" | "hotel" | "flight" | null>(null);
  const [editingFlight, setEditingFlight] = useState<string | null>(null);
  const [nearby, setNearby] = useState<Array<{ name: string; href: string; km: number }> | null>(null);
  const [ai, setAi] = useState<{ text?: string; reason?: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const anchor = day.activities.find((a) => a.coordinates) || (day.lodging?.coordinates ? { coordinates: day.lodging.coordinates } : null);
  const canSuggest = Boolean(anchor?.coordinates);
  const hasFreeTime = (day.freeHours ?? 0) >= 3;

  /**
   * A day spent entirely in the air has no free time to fill.
   *
   * Not "there is a flight today" — a morning landing leaves the whole day.
   * It is a day with flights and nothing else possible on the ground: no
   * stops, nowhere to sleep but the plane, or a flight that takes off and
   * lands on different days. Offering to fill that day is offering something
   * nobody can use.
   */
  const flyingAllDay =
    (day.flightsDeparting.length > 0 || day.flightsArriving.length > 0) &&
    day.activities.length === 0 &&
    (Boolean(day.overnightFlight) ||
      day.flightsDeparting.some((f) => flightArrivalDate(f) !== f.date) ||
      day.flightsArriving.some((f) => flightArrivalDate(f) !== f.date));

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
    <article className="overflow-hidden border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <div className="flex flex-col gap-1 border-b border-[var(--gold-light)] pb-4 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Day {day.index + 1}</h3>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-stone-500">
          {day.label}
          {day.startTime && day.activities.length > 0 ? (
            <span className="text-xs font-normal text-stone-500">
              {day.startsFrom ? `From ${day.startsFrom}, ` : ""}{day.startTime}
              {day.endTime ? ` → ${day.endTime}` : ""}
            </span>
          ) : null}
          {day.travelHours > 0 ? (
            <span className="text-xs font-normal text-stone-400">
              {day.travelLegs.every((l) => l.measured) ? "" : "≈"}
              {day.travelHours} h driving
              {day.travelLegs.every((l) => l.source === "google") ? " (Google Maps)" : ""}
            </span>
          ) : null}
        </p>
      </div>

      {/* A warning that can be acted on carries the button to act on it, on
          the day it is about. Being told on day 4 that day 4 has nowhere to
          sleep, and then having to scroll back to the top of the page and pick
          the date again, is how a gap stays a gap. */}
      {day.warnings.map((w, i) => {
        const needsBed = w.startsWith("No place");
        const needsStops = w.startsWith("Nothing planned");
        return (
          <div key={i} className={`mt-3 border-l-4 px-3 py-2 text-sm ${needsBed ? "border-red-400 bg-red-50 text-red-800" : "border-[var(--gold)] bg-[var(--cream)] text-stone-700"}`}>
            <p>{w}</p>
            {(needsBed || needsStops) && (
              <button
                type="button"
                onClick={() => setAdding(needsBed ? "hotel" : "stop")}
                className="mt-2 border border-[var(--navy)] bg-[var(--navy)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
              >
                {needsBed ? "Add where you sleep" : "Add a stop to this day"}
              </button>
            )}
          </div>
        );
      })}

      <div className="mt-4 space-y-3">
        {day.flightsArriving.map((f) => (
          <div key={`a-${f.id}`}>
            <FlightLine flight={f} direction="arrive" onEdit={() => setEditingFlight(editingFlight === f.id ? null : f.id)} />
            {editingFlight === f.id && (
              <FlightForm
                startDate={day.date}
                initial={f}
                onAdd={(next) => { onUpdateFlight(next); setEditingFlight(null); }}
                onRemove={() => { onRemoveFlight(f.id); setEditingFlight(null); }}
                onCancel={() => setEditingFlight(null)}
              />
            )}
          </div>
        ))}
        <TransferLine leg={day.travelLegs.find((l) => l.kind === "arrive-airport" || l.kind === "from-lodging")} />
        {day.activities.map((a, i) => (
          <div key={a.id} className="border-t border-[var(--gold-light)] pt-3 first:border-t-0 first:pt-0">
            {a.distanceFromPrev !== null && (
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-5 text-stone-500">
                <span aria-hidden="true">↓</span>
                <span>{formatKm(a.distanceFromPrev)}</span>
                <span>·</span>
                <span>{a.travelIsMeasured ? "" : "≈"}{formatDuration(a.travelMinutesFromPrev)} from previous stop</span>
                <TimeSource source={a.travelSource} />{" "}
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
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <p className="min-w-0 font-[family-name:var(--font-display)] text-xl leading-snug text-[var(--navy)]">
                <span className="mr-2 text-sm font-bold text-[var(--gold)]">{i + 1}.</span>
                {a.arrivalTime ? (
                  <span className={`mr-2 text-sm font-semibold ${a.arrivesLate ? "text-red-700" : "text-[var(--gold)]"}`} title={a.arrivesLate ? `Scheduled for ${a.startTime}, but the driving does not allow it` : "Worked out from your start time and the driving"}>
                    {a.arrivalTime}
                    {a.departureTime ? <span className="font-normal text-stone-400">–{a.departureTime}</span> : null}
                  </span>
                ) : a.startTime ? (
                  <span className="mr-2 text-sm font-semibold text-[var(--gold)]">{a.startTime}</span>
                ) : null}
                {a.name}
                {a.yiddishName ? <span className="ml-2 text-base text-stone-500">{a.yiddishName}</span> : null}
              </p>
              <span className="flex flex-wrap items-center gap-1 sm:justify-end">
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
            {a.address && <p className="mt-2 break-words text-sm leading-6 text-stone-600">{a.address}</p>}
            {/* No location means no driving time and an overstated free day.
                Say it on the stop, with the way to fix it right there. */}
            {!a.coordinates && editingId !== a.id && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-amber-800">
                <span>No address yet, so the driving to it is not counted.</span>
                <button
                  type="button"
                  onClick={() => setEditingId(a.id)}
                  className="border border-[var(--gold)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
                >
                  Add the address
                </button>
              </p>
            )}
            {/* Who you are going to daven by. The reason for the stop belongs
                on the stop, not one click away on the cemetery page. */}
            {a.keverSlug && (burials[a.keverSlug]?.length ?? 0) > 0 && (
              <div className="mt-3 rounded-md bg-[var(--cream)] px-3 py-2 text-sm leading-6 text-stone-700">
                <span className="font-semibold text-[var(--gold)]">Buried here</span>
                <span className="mt-0.5 block break-words">{burials[a.keverSlug].join(" · ")}</span>
              </div>
            )}
            {(a.phone || a.href || a.address || a.coordinates) && (
              <p className="mt-3 flex flex-wrap gap-2 text-sm">
                {/* Every stop gets its own navigate link, including the first
                    one of the day. Leaving the destination alone lets Google
                    Maps route from wherever the traveler actually is, which is
                    the only sensible origin for the first stop — there is no
                    previous stop to start from. */}
                {(a.address || a.coordinates) && (
                  <a href={placeDirectionsUrl(a.address, a.coordinates)} target="_blank" rel="noreferrer" className="rounded-md border border-[var(--gold-light)] px-3 py-1.5 font-semibold text-[var(--navy)]">Navigate →</a>
                )}
                {a.phone && <a href={`tel:${a.phone.replace(/[^\d+]/g, "")}`} className="rounded-md border border-[var(--gold-light)] px-3 py-1.5 font-semibold text-[var(--navy)]">Call {a.phone}</a>}
                {a.href && (a.href.startsWith("/") ? <Link href={a.href} className="rounded-md border border-[var(--gold-light)] px-3 py-1.5 font-semibold text-[var(--navy)]">Details →</Link> : <a href={a.href} target="_blank" rel="noreferrer" className="rounded-md border border-[var(--gold-light)] px-3 py-1.5 font-semibold text-[var(--navy)]">Open link →</a>)}
              </p>
            )}
            {a.notes && <p className="mt-3 break-words text-sm leading-6 text-stone-500">{a.notes}</p>}
          </div>
        ))}
        <TransferLine leg={day.travelLegs.find((l) => l.kind === "to-lodging" || l.kind === "depart-airport")} />
        {day.flightsDeparting.map((f) => (
          <div key={`d-${f.id}`}>
            <FlightLine flight={f} direction="depart" onEdit={() => setEditingFlight(editingFlight === f.id ? null : f.id)} />
            {editingFlight === f.id && (
              <FlightForm
                startDate={day.date}
                initial={f}
                onAdd={(next) => { onUpdateFlight(next); setEditingFlight(null); }}
                onRemove={() => { onRemoveFlight(f.id); setEditingFlight(null); }}
                onCancel={() => setEditingFlight(null)}
              />
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-[var(--gold-light)] pt-3 text-sm">
        <span className={caption}>Tonight</span>{" "}
        {day.lodging ? (
          <span className="text-[var(--navy)]">🛏️ {day.lodging.type === "overnight-transit" ? `Overnight ${day.lodging.name || "bus/flight"}` : day.lodging.name}{day.lodging.address ? ` — ${day.lodging.address}` : ""}{day.lodging.phone ? <> · <a href={`tel:${day.lodging.phone.replace(/[^\d+]/g, "")}`} className="underline decoration-[var(--gold)] underline-offset-2">📞 {day.lodging.phone}</a></> : null}</span>
        ) : day.overnightFlight ? (
          <span className="text-[var(--navy)]">
            ✈️ On the flight — {flightRouteLabel(day.overnightFlight)}
            {day.overnightFlight.airline ? ` (${day.overnightFlight.airline}${day.overnightFlight.flightNo ? ` ${day.overnightFlight.flightNo}` : ""})` : ""}
            {day.overnightFlight.departTime ? `, departing ${day.overnightFlight.departTime}` : ""}
            <span className="ml-2 text-xs text-stone-500">no hotel needed tonight</span>
          </span>
        ) : (
          <span className="text-stone-400">— not set —</span>
        )}
      </p>

      {/* Filling the day in, on the day. Both forms open with this date
          already set, so nothing has to be chosen twice. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--gold-light)] pt-3">
        <span className={caption}>Add to this day</span>
        <button type="button" onClick={() => setAdding(adding === "stop" ? null : "stop")} className="border border-[var(--gold-light)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">
          {adding === "stop" ? "Close" : "+ Stop"}
        </button>
        <button type="button" onClick={() => setAdding(adding === "hotel" ? null : "hotel")} className="border border-[var(--gold-light)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">
          {adding === "hotel" ? "Close" : day.lodging ? "+ Change where you sleep" : "+ Where you sleep"}
        </button>
        <button type="button" onClick={() => setAdding(adding === "flight" ? null : "flight")} className="border border-[var(--gold-light)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">
          {adding === "flight" ? "Close" : "+ Flight"}
        </button>
      </div>

      {adding === "stop" && (
        <ActivityForm
          startDate={day.date}
          onAdd={(a) => {
            onAddStop({ ...a, date: a.date || day.date });
            setAdding(null);
          }}
        />
      )}
      {adding === "hotel" && (
        <LodgingForm
          startDate={day.date}
          onAdd={(l) => {
            onAddLodging(l);
            setAdding(null);
          }}
        />
      )}
      {/* The same form as the one at the top, so the flight-number lookup is
          here too — the day you are looking at is the day you have the
          booking email open for. */}
      {adding === "flight" && (
        <FlightForm
          startDate={day.date}
          onAdd={(f) => {
            onAddFlight(f);
            setAdding(null);
          }}
          onCancel={() => setAdding(null)}
        />
      )}

      {/* Free time is offered on every day, because a day with three stops
          still has an evening in it and the traveler is the one who knows.
          The single exception is a day spent in the air, where there is no
          free time to fill. */}
      {flyingAllDay ? (
        <p className="mt-4 border-t border-[var(--gold-light)] pt-3 text-xs leading-5 text-stone-500">
          In the air most of this day — nothing to fill.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--gold-light)] pt-3">
          <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${hasFreeTime ? "text-[var(--gold)]" : "text-stone-400"}`}>
            {hasFreeTime ? `Free time — about ${day.freeHours} h` : "Free time"}
          </span>
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

/**
 * Where a driving time came from. A traveler planning a day around a number
 * should be able to see whether it is Google's own answer for typical traffic,
 * an open-router figure that assumes the roads are empty, or our own estimate.
 */
function TimeSource({ source }: { source?: "google" | "osrm" }) {
  if (source === "google") {
    return <span className="normal-case tracking-normal text-emerald-700" title="From Google Maps, for an ordinary day's traffic">· Google Maps</span>;
  }
  if (source === "osrm") {
    return <span className="normal-case tracking-normal text-stone-400" title="Measured on real roads, but with no traffic allowance — treat it as a floor">· road routing, no traffic</span>;
  }
  return <span className="normal-case tracking-normal text-stone-400" title="Our own estimate — routing was not available for this leg">· estimate</span>;
}

// A transfer to/from the hotel or the airport — travel that also eats the day.
function TransferLine({ leg }: { leg?: TravelLeg }) {
  if (!leg) return null;
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
      🚗 {leg.label} — {formatKm(leg.km)} · {leg.measured ? "" : "≈"}{formatDuration(leg.minutes)} <TimeSource source={leg.source} />{" "}
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

function BookingList({ title, items, onRemove, onEdit }: {
  title: string;
  items: Array<{ id: string; label: string; sub: string }>;
  onRemove: (id: string) => void;
  /** Present when the entry can be opened and changed rather than only deleted. */
  onEdit?: (id: string) => void;
}) {
  return (
    <details className="group border border-[var(--gold-light)] bg-[#fcfaf6]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:content-none">
        <span className={caption}>{title} ({items.length})</span>
        <span aria-hidden="true" className="text-lg leading-none text-[var(--gold)] transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <ul className="space-y-2 border-t border-[var(--gold-light)] px-4 pb-4 pt-3">
        {items.length === 0 ? <li className="text-sm text-stone-400">None yet.</li> : items.map((it) => (
          <li key={it.id} className="flex items-start justify-between gap-2 text-sm">
            <span className="min-w-0"><span className="font-semibold text-[var(--navy)]">{it.label}</span><br /><span className="text-xs text-stone-500">{it.sub}</span></span>
            <span className="flex shrink-0 items-center gap-2">
              {onEdit && (
                <button type="button" onClick={() => onEdit(it.id)} className="border border-[var(--gold)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Edit</button>
              )}
              <button type="button" onClick={() => onRemove(it.id)} aria-label={`Remove ${it.label}`} className="text-xs text-stone-400 hover:text-red-700">✕</button>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Adding a flight, and editing one already on the trip.
 *
 * The same form does both on purpose. A flight that can only be deleted and
 * re-entered loses its connections and its booking reference, and a second
 * form built just for editing would drift away from this one — different
 * fields, a lookup on one and not the other.
 */
function FlightForm({ startDate, initial, onAdd, onRemove, onCancel }: {
  startDate: string;
  /** The flight being edited. Absent when adding a new one. */
  initial?: ItinFlight;
  onAdd: (f: ItinFlight) => void;
  onRemove?: () => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState<Partial<ItinFlight>>(initial ?? { date: startDate });
  const [lookupNo, setLookupNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  // A red-eye is worked out from the times rather than asked about — almost
  // nobody fills in an arrival date, and a flight landing the morning after is
  // the normal way to reach Europe. This shows what was worked out while the
  // times are being typed, so a wrong reading can be corrected on the spot
  // instead of quietly putting the landing on the wrong day.
  const overnight = useMemo(
    () =>
      f.date
        ? readOvernightFlight({
            id: "draft",
            from: f.from ?? "",
            to: f.to ?? "",
            date: f.date,
            departTime: f.departTime,
            arriveTime: f.arriveTime,
            arriveDate: f.arriveDate,
            stops: f.stops,
          })
        : null,
    [f],
  );

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
    <FormShell
      title={initial ? "Edit this flight" : "Add a flight"}
      submitLabel={initial ? "Save the flight" : "Add"}
      onRemove={onRemove}
      onCancel={onCancel}
      onSubmit={() => {
        if (!f.from || !f.to || !f.date) return;
        onAdd({
          // Keeping the id means editing changes the flight rather than
          // replacing it, so anything pointing at it still does.
          id: initial?.id ?? uid(),
          from: f.from,
          to: f.to,
          date: f.date,
          airline: f.airline,
          flightNo: f.flightNo,
          departTime: f.departTime,
          arriveTime: f.arriveTime,
          arriveDate: f.arriveDate,
          stops: (f.stops ?? []).filter((x) => x.airport.trim()),
          notes: f.notes,
          confirmation: f.confirmation,
          bookedOnSite: initial?.bookedOnSite ?? false,
        });
      }}
    >
      <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-[var(--gold-light)] bg-[#faf7ef] p-3">
        <span className={caption}>Auto-fill from a flight number</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input className={`${inputClass} mt-0 w-32`} value={lookupNo} onChange={(e) => setLookupNo(e.target.value)} placeholder="e.g. LY1" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void runLookup(); } }} />
          <button type="button" onClick={() => void runLookup()} disabled={busy} className="border border-[var(--navy)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white disabled:opacity-50">{busy ? "…" : "Look up"}</button>
          <span className="text-xs text-stone-600">Uses the date below.</span>
        </div>
        {status && <p className="mt-2 text-xs text-[var(--navy)]">{status}</p>}
      </div>
      <Field label="From *"><AirportAutocomplete required value={f.from ?? ""} onChange={(v) => setF({ ...f, from: v })} className={inputClass} placeholder="City or airport — e.g. New York, JFK" /></Field>
      <Field label="To *"><AirportAutocomplete required value={f.to ?? ""} onChange={(v) => setF({ ...f, to: v })} className={inputClass} placeholder="City or airport — e.g. Kyiv, KBP" /></Field>
      <Field label="Airline"><input className={inputClass} value={f.airline ?? ""} onChange={(e) => setF({ ...f, airline: e.target.value })} /></Field>
      <Field label="Flight #"><input className={inputClass} value={f.flightNo ?? ""} onChange={(e) => setF({ ...f, flightNo: e.target.value })} placeholder="e.g. LY1" /></Field>
      <Field label="Date *"><DateField ariaLabel="Flight date" required className={inputClass} value={f.date ?? ""} onChange={(date) => setF({ ...f, date })} /></Field>
      <Field label="Departs"><input type="time" className={inputClass} value={f.departTime ?? ""} onChange={(e) => setF({ ...f, departTime: e.target.value })} /></Field>
      <Field label="Arrives"><input type="time" className={inputClass} value={f.arriveTime ?? ""} onChange={(e) => setF({ ...f, arriveTime: e.target.value })} /></Field>
      <Field label="Landing date"><DateField ariaLabel="Landing date" className={inputClass} min={f.date} value={f.arriveDate ?? ""} onChange={(arriveDate) => setF({ ...f, arriveDate })} /></Field>
      <Field label="Booking reference"><input className={inputClass} value={f.confirmation ?? ""} onChange={(e) => setF({ ...f, confirmation: e.target.value })} placeholder="e.g. XR4K9T" /></Field>

      {overnight?.note && (
        <p className={`sm:col-span-2 lg:col-span-3 border-l-4 px-3 py-2 text-xs leading-5 ${overnight.detected ? "border-[var(--gold)] bg-[var(--cream)] text-[var(--navy)]" : "border-stone-300 bg-stone-50 text-stone-600"}`}>
          <strong>{overnight.detected ? "Overnight flight" : "Landing date"}</strong> — {overnight.note}
          {overnight.detected && " Leave the landing date empty and this is what will be used; fill it in only to correct it."}
        </p>
      )}

      {/* Connections belong to this one journey. Entering them as separate
          flights made the planner think the traveler had arrived, needed a bed
          in the connecting city, and had a free day there. */}
      <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-[var(--gold-light)] bg-[#faf7ef] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={caption}>Stops on the way (connections)</span>
          <button
            type="button"
            onClick={() => setF({ ...f, stops: [...(f.stops ?? []), { airport: "" }] })}
            className="border border-[var(--navy)] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
          >
            + Add a stop
          </button>
        </div>
        {(f.stops ?? []).length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-stone-600">
            Direct flight. If it connects somewhere, add the stop here rather than entering two flights — it is one journey,
            and the planner will not ask you for a hotel in the connecting city.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {(f.stops ?? []).map((stop, i) => (
              <div key={i} className="grid gap-2 border border-[var(--gold-light)] bg-white p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                <label className="block">
                  <span className={caption}>Stop {i + 1}</span>
                  <AirportAutocomplete
                    value={stop.airport}
                    onChange={(v) => setF({ ...f, stops: (f.stops ?? []).map((x, j) => (j === i ? { ...x, airport: v } : x)) })}
                    className={inputClass}
                    placeholder="Connecting airport"
                  />
                </label>
                <label className="block">
                  <span className={caption}>Lands</span>
                  <input type="time" className={inputClass} value={stop.arriveTime ?? ""} onChange={(e) => setF({ ...f, stops: (f.stops ?? []).map((x, j) => (j === i ? { ...x, arriveTime: e.target.value } : x)) })} />
                </label>
                <label className="block">
                  <span className={caption}>Leaves</span>
                  <input type="time" className={inputClass} value={stop.departTime ?? ""} onChange={(e) => setF({ ...f, stops: (f.stops ?? []).map((x, j) => (j === i ? { ...x, departTime: e.target.value } : x)) })} />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setF({ ...f, stops: (f.stops ?? []).filter((_, j) => j !== i) })}
                    aria-label={`Remove stop ${i + 1}`}
                    className="min-h-[38px] px-2 text-xs text-stone-400 transition hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <label className="block sm:col-span-4">
                  <span className={caption}>Notes for this stop</span>
                  <input className={inputClass} value={stop.notes ?? ""} onChange={(e) => setF({ ...f, stops: (f.stops ?? []).map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)) })} placeholder="Terminal change, long wait, whether you can leave the airport" />
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--navy)] sm:col-span-4">
                  <input type="checkbox" checked={Boolean(stop.overnight)} onChange={(e) => setF({ ...f, stops: (f.stops ?? []).map((x, j) => (j === i ? { ...x, overnight: e.target.checked } : x)) })} className="h-4 w-4 accent-[var(--navy)]" />
                  The onward flight leaves the next day
                </label>
                {/* Both times given is enough to say how long the wait is, and
                    a wait past eight hours is treated as a night in transit
                    without anybody having to tick the box. */}
                {(() => {
                  const wait = layoverMinutes(stop);
                  if (wait === null) return null;
                  const held = stop.overnight || wait >= 8 * 60;
                  return (
                    <p className={`sm:col-span-4 text-xs leading-5 ${held ? "font-semibold text-[var(--navy)]" : "text-stone-500"}`}>
                      {formatDuration(wait)} between flights
                      {held ? " — long enough that this counts as the night, so no hotel is asked for here." : "."}
                    </p>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </FormShell>
  );
}

function LodgingForm({ startDate, onAdd }: { startDate: string; onAdd: (l: ItinLodging) => void }) {
  const [l, setL] = useState<Partial<ItinLodging>>({ type: "hotel", checkIn: startDate });
  const overnight = l.type === "overnight-transit";

  function pickLodging(g: LodgingResult) {
    setL((prev) => ({ ...prev, name: g.name, address: g.address ?? prev.address, phone: g.phone ?? prev.phone, notes: prev.notes || g.notes }));
  }

  // A stay is a number of nights, so check-out is the next day at the
  // earliest — "exclusive" in lib/date-range.
  const checkIn = l.checkIn ?? startDate;
  const checkOutTooEarly = rangeIsBackwards(checkIn, l.checkOut ?? "", "exclusive");
  const minCheckOut = earliestEnd(checkIn, "exclusive");

  return (
    <FormShell
      title="Add lodging / where you sleep"
      error={checkOutTooEarly ? "Check-out has to be at least the day after check-in." : ""}
      onSubmit={() => {
        if (checkOutTooEarly) return;
        if ((overnight || l.name) && checkIn) {
          onAdd({ id: uid(), type: (l.type as LodgingType) || "hotel", name: l.name || (overnight ? "bus/flight" : ""), address: l.address, coordinates: l.coordinates, phone: l.phone, checkIn, checkOut: overnight ? nextDate(checkIn) : l.checkOut || nextDate(checkIn), notes: l.notes, bookedOnSite: false });
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
      {!overnight && <Field label="Name *"><input required className={inputClass} value={l.name ?? ""} onChange={(e) => setL({ ...l, name: e.target.value })} /></Field>}
      {overnight && <Field label="Bus or flight?"><input className={inputClass} value={l.name ?? ""} placeholder="e.g. overnight bus to Uman" onChange={(e) => setL({ ...l, name: e.target.value })} /></Field>}
      {!overnight && <Field label="Address"><AddressAutocomplete value={l.address ?? ""} onChange={(address, coords) => setL({ ...l, address, coordinates: coords || l.coordinates })} className={inputClass} placeholder="Start typing the hotel address…" /></Field>}
      {!overnight && <Field label="Phone"><input type="tel" className={inputClass} value={l.phone ?? ""} onChange={(e) => setL({ ...l, phone: e.target.value })} placeholder="Front desk / host" /></Field>}
      <Field label={overnight ? "Night of *" : "Check-in *"}><DateField ariaLabel="Check-in date" required className={inputClass} value={checkIn} onChange={(nextIn) => {
        // Pushing check-in past check-out carries check-out with it.
        setL({ ...l, checkIn: nextIn, checkOut: correctedEnd(nextIn, l.checkOut ?? "", "exclusive") });
      }} /></Field>
      {!overnight && <Field label="Check-out *"><DateField ariaLabel="Check-out date" required className={inputClass} min={minCheckOut} value={l.checkOut ?? ""} onChange={(checkOut) => setL({ ...l, checkOut: correctedEnd(checkIn, checkOut, "exclusive") })} /></Field>}
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
        <ul className="absolute left-0 right-0 top-full z-30 max-h-72 overflow-auto border border-[var(--gold)] bg-[#fcfaf6] shadow-[0_16px_36px_rgba(23,45,82,.14)]">
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
      country: k.country,
      notes: prev.notes || k.notes,
    }));
  }

  return (
    <FormShell title="Add an activity / stop" onSubmit={() => { if (a.name) onAdd({ id: uid(), name: a.name, yiddishName: a.yiddishName, address: a.address, coordinates: a.coordinates, date: a.date ?? "", startTime: a.startTime, durationMins: a.durationMins, href: a.href, phone: a.phone, keverSlug: a.keverSlug, country: a.country, notes: a.notes, bookedOnSite: false }); }}>
      <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-[var(--gold-light)] bg-[#faf7ef] p-3">
        <span className={caption}>Add a kever from our list — we&apos;ll fill in the rest</span>
        <KeverPicker onPick={pickKever} />
        {a.keverSlug && <p className="mt-2 text-xs font-semibold text-emerald-700">Filled from our directory: {a.name}. Edit anything below if you like.</p>}
      </div>
      <Field label="Name *"><input required className={inputClass} value={a.name ?? ""} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder="Kever, museum, meal…" /></Field>
      <Field label="Address"><AddressAutocomplete value={a.address ?? ""} onChange={(address, coords) => setA({ ...a, address, coordinates: coords || a.coordinates })} className={inputClass} placeholder="Start typing the address…" /></Field>
      <Field label="Coordinates"><input className={inputClass} value={a.coordinates ?? ""} placeholder="Auto-filled from the address" onChange={(e) => setA({ ...a, coordinates: e.target.value })} /></Field>
      <Field label="Phone"><input type="tel" className={inputClass} value={a.phone ?? ""} onChange={(e) => setA({ ...a, phone: e.target.value })} placeholder="Contact number for this stop" /></Field>
      <Field label="Link"><input type="url" className={inputClass} value={a.href ?? ""} onChange={(e) => setA({ ...a, href: e.target.value })} placeholder="https://… (map, booking, our kever page)" /></Field>
      <Field label="Date (leave empty to let the planner place it)"><DateField ariaLabel="Stop date" className={inputClass} value={a.date ?? ""} onChange={(date) => setA({ ...a, date })} /></Field>
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
        <ul className="absolute left-0 right-0 top-full z-30 max-h-72 overflow-auto border border-[var(--gold)] bg-[#fcfaf6] shadow-[0_16px_36px_rgba(23,45,82,.14)]">
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
                {k.burials?.length ? <span className="block text-xs text-[var(--gold)]">{burialSummary(k.burials)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The shell around "add a flight / a hotel / a stop".
 *
 * A real <form> with a real submit button, so the browser stops on a missing
 * required field and points at it. It used to be a div with a plain button
 * that checked the fields itself and simply did nothing when one was empty —
 * you pressed Add, nothing happened, and there was nothing to say why.
 */
function FormShell({ title, children, onSubmit, error, submitLabel = "Add", onRemove, onCancel }: {
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  error?: string;
  submitLabel?: string;
  /** Editing an existing entry: delete it, or back out without saving. */
  onRemove?: () => void;
  onCancel?: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="mt-5 border-t border-[var(--gold-light)] pt-5"
    >
      <p className="text-sm font-bold text-[var(--navy)]">{title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={Boolean(error)} className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-50">{submitLabel}</button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="border border-[var(--gold-light)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]">Cancel</button>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove} className="ml-auto px-3 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-stone-400 transition hover:text-red-700">Remove</button>
        )}
      </div>
    </form>
  );
}

/**
 * One labelled field. A label ending in "*" marks it required and colours the
 * star, so the promise on the label and the rule in the box are the same
 * thing rather than two things that can drift apart.
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const required = label.trim().endsWith("*");
  return (
    <label className="block">
      <span className={caption}>
        {required ? label.trim().slice(0, -1).trim() : label}
        {required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
      </span>
      {children}
    </label>
  );
}


// ---- Who is coming ---------------------------------------------------
// Adding your family to your own trip is not the same as sharing it with
// another account: a child has no login, and you still need their name on the
// printed itinerary and counted when you book rooms and seats.

const TRAVELER_KINDS: Array<{ value: NonNullable<ItinTraveler["kind"]>; label: string }> = [
  { value: "adult", label: "Adult" },
  { value: "child", label: "Child" },
  { value: "infant", label: "Infant" },
];

function TravelersPanel({
  travelers,
  onChange,
  bookingFor,
  onBookingFor,
}: {
  travelers: ItinTraveler[];
  onChange: (t: ItinTraveler[]) => void;
  bookingFor?: "self" | "someone-else";
  onBookingFor: (answer: "self" | "someone-else", traveler?: ItinTraveler) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<NonNullable<ItinTraveler["kind"]>>("adult");
  const viewer = useViewer();

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange([...travelers, { id: uid(), name: trimmed, kind }]);
    setName("");
    setKind("adult");
  }

  const update = (id: string, patch: Partial<ItinTraveler>) =>
    onChange(travelers.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => onChange(travelers.filter((t) => t.id !== id));

  const adults = travelers.filter((t) => (t.kind ?? "adult") === "adult").length;
  const children = travelers.filter((t) => t.kind === "child").length;
  const infants = travelers.filter((t) => t.kind === "infant").length;

  return (
    <section className="mt-5 border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Who&apos;s coming</h2>
        {travelers.length > 0 && (
          <p className="text-xs font-semibold text-stone-500">
            {travelers.length} {travelers.length === 1 ? "traveler" : "travelers"}
            {children || infants ? ` · ${adults} adult${adults === 1 ? "" : "s"}${children ? `, ${children} child${children === 1 ? "" : "ren"}` : ""}${infants ? `, ${infants} infant${infants === 1 ? "" : "s"}` : ""}` : ""}
          </p>
        )}
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        Everyone travelling with you. They appear on the printed itinerary and give you the head count for rooms and seats.
        This is separate from sharing the trip below — a child doesn&apos;t need an account to be on the list.
      </p>

      {/* Asked once, and only of somebody signed in — there is no name to add
          otherwise. Answering "I am going" puts them on the list straight
          away rather than making them type a name we already know. */}
      {viewer?.signedIn && !bookingFor && (
        <div className="mt-4 border-l-4 border-[var(--gold)] bg-[var(--cream)] px-4 py-3">
          <p className="font-semibold text-[var(--navy)]">Are you travelling on this trip, or arranging it for somebody else?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onBookingFor("self", { id: uid(), name: viewer.name?.trim() || viewer.id || "Me", kind: "adult" })
              }
              className="min-h-[40px] border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              I am travelling
            </button>
            <button
              type="button"
              onClick={() => onBookingFor("someone-else")}
              className="min-h-[40px] border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
            >
              I am arranging it for somebody else
            </button>
          </div>
        </div>
      )}

      {bookingFor === "someone-else" && (
        <p className="mt-4 text-sm leading-6 text-stone-600">
          You are arranging this for somebody else, so you are not on the list. Add the people who are actually going
          below.
        </p>
      )}

      {travelers.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {travelers.map((t) => (
            <li key={t.id} className="flex min-w-0 flex-wrap items-center gap-2 border border-[var(--gold-light)] bg-white px-3 py-2">
              <input
                value={t.name}
                onChange={(e) => update(t.id, { name: e.target.value })}
                aria-label="Traveler name"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-[var(--navy)] outline-none"
              />
              <select
                value={t.kind ?? "adult"}
                onChange={(e) => update(t.id, { kind: e.target.value as ItinTraveler["kind"] })}
                aria-label={`${t.name || "Traveler"} type`}
                className="border border-[var(--gold-light)] bg-[#fcfaf6] py-1 pl-2 text-xs text-[var(--navy)] outline-none"
              >
                {TRAVELER_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label={`Remove ${t.name || "traveler"}`}
                className="min-h-[32px] px-2 text-xs text-stone-400 transition hover:text-red-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className={caption}>Add a traveler</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="Name"
          />
        </label>
        <label>
          <span className={caption}>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as NonNullable<ItinTraveler["kind"]>)} className={inputClass}>
            {TRAVELER_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          className="min-h-[42px] border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-40"
        >
          + Add
        </button>
      </div>
    </section>
  );
}



/**
 * Book the flights, once you know who is going.
 *
 * The head count and the dates are the two things you need before you can look
 * at seats, and by this point in the page both are known — so the link carries
 * them rather than asking for them a second time on the other side.
 */
function BookFlightsPanel({ itin }: { itin: Itinerary }) {
  const people = travelersOf(itin);
  const flights = itin.flights.length;

  const params = new URLSearchParams();
  if (itin.startDate) params.set("depart", itin.startDate);
  if (itin.endDate) params.set("return", itin.endDate);
  // Where they are starting from and heading to, when a flight already says so.
  const first = itin.flights[0];
  if (first?.from) params.set("from", first.from);
  if (first?.to) params.set("to", first.to);
  const href = params.toString() ? `/book?${params.toString()}` : "/book";

  return (
    <section className="mt-5 border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Book the flights</h2>
        {people.length > 0 && (
          <p className="text-xs font-semibold text-stone-500">
            {people.length} {people.length === 1 ? "seat" : "seats"}
            {itin.startDate ? ` · ${itin.startDate}` : ""}
            {itin.endDate ? ` → ${itin.endDate}` : ""}
          </p>
        )}
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        {flights > 0
          ? `${flights} ${flights === 1 ? "flight is" : "flights are"} on this trip already. Add another, or compare fares and award seats for the dates above.`
          : "Compare fares and award seats for your dates, then add what you book straight back into this trip."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={href}
          className="min-h-[44px] border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
        >
          Book flights &amp; hotels
        </Link>
        <Link
          href="/flight-booking-assistance"
          className="min-h-[44px] border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
        >
          Have us book it
        </Link>
      </div>
    </section>
  );
}
/**
 * One journey on a day card — connections included.
 *
 * A flight with a stopover is one journey, so it reads as one line:
 * JFK → WAW → KRK, with the wait on the ground shown under it. Entering it as
 * two separate flights used to make the planner believe the traveler had
 * arrived, spent a day in the connecting city, and needed a hotel there.
 */
function FlightLine({ flight, direction, onEdit }: { flight: ItinFlight; direction: "arrive" | "depart"; onEdit?: () => void }) {
  const stops = flight.stops ?? [];
  const airline = [flight.airline, flight.flightNo].filter(Boolean).join(" ");
  return (
    <div className="text-sm text-[var(--navy)]">
      <p>
        ✈️{" "}
        {direction === "depart"
          ? <>Depart {flight.from}{flight.departTime ? ` at ${flight.departTime}` : ""}</>
          : <>Arrive {flight.to}{flight.arriveTime ? ` at ${flight.arriveTime}` : ""}</>}
        {" — "}
        <span className="font-semibold">{flightRouteLabel(flight)}</span>
        {airline ? ` (${airline})` : ""}
        {stops.length > 0 && (
          <span className="ml-2 text-xs font-semibold text-[var(--gold)]">
            {stops.length === 1 ? "1 stop" : `${stops.length} stops`}
          </span>
        )}
        {flight.confirmation && (
          <span className="ml-2 text-xs font-semibold text-stone-500">ref {flight.confirmation}</span>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="ml-2 border border-[var(--gold)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
          >
            Edit
          </button>
        )}
      </p>
      {stops.map((stop, i) => <LayoverLine key={`${stop.airport}-${i}`} stop={stop} />)}
    </div>
  );
}

function LayoverLine({ stop }: { stop: FlightStop }) {
  const mins = layoverMinutes(stop);
  const long = stop.overnight || (mins ?? 0) >= 8 * 60;
  const tight = mins !== null && mins < 60;
  return (
    <p className="ml-5 mt-0.5 text-xs leading-5 text-stone-500">
      ↳ Stop in {stop.airport}
      {stop.arriveTime && stop.departTime ? ` — in ${stop.arriveTime}, out ${stop.departTime}` : ""}
      {mins !== null && <span className={`ml-1 font-semibold ${tight ? "text-red-700" : long ? "text-amber-800" : "text-stone-500"}`}>({formatDuration(mins)}{long ? " · overnight in transit" : tight ? " · tight connection" : ""})</span>}
      {stop.notes ? <span className="ml-1">· {stop.notes}</span> : null}
    </p>
  );
}
