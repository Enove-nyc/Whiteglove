// Turns a planned day into the timeline the printed itinerary shows.
//
// The printed document reads as a single running schedule — a time, a kind, a
// place, a line of detail — rather than the separate flight / stop / lodging
// blocks the planner uses on screen. Everything here is derived from what the
// traveler already entered; nothing is invented, and an entry with no time
// simply sorts after the ones that have one.

import { flightRouteLabel, formatDuration, type ItineraryDay, type Itinerary } from "@/data/itinerary";

export type PrintEntry = {
  /** "8:00 AM" — empty when the traveler gave no time. */
  time: string;
  /** FLIGHT, CONNECTION, VISIT, DRIVE, EVENING … */
  kind: string;
  title: string;
  detail?: string;
  /** Minutes since midnight, for ordering. */
  sortKey: number;
};

const NO_TIME = 100000;

function toMins(t?: string): number | null {
  const m = t && /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 14:05 → "2:05 PM", the form the printed itinerary uses. */
export function clock(t?: string): string {
  const mins = toMins(t);
  if (mins === null) return "";
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function buildPrintTimeline(day: ItineraryDay): PrintEntry[] {
  const entries: PrintEntry[] = [];
  const add = (time: string | undefined, kind: string, title: string, detail?: string) => {
    if (!title) return;
    entries.push({ time: clock(time), kind, title, detail, sortKey: toMins(time) ?? NO_TIME });
  };

  // Departures, with each connection as its own line — a stopover is part of
  // the journey and belongs on the schedule the traveler is reading.
  for (const f of day.flightsDeparting) {
    const label = [f.airline, f.flightNo].filter(Boolean).join(" ") || flightRouteLabel(f);
    add(f.departTime, "Flight", label, `Depart ${f.from} for ${(f.stops ?? [])[0]?.airport ?? f.to}`);
    for (const stop of f.stops ?? []) {
      const wait = toMins(stop.arriveTime) !== null && toMins(stop.departTime) !== null
        ? formatDuration(((toMins(stop.departTime)! - toMins(stop.arriveTime)! + 1440) % 1440) || 1440)
        : null;
      add(stop.arriveTime, "Connection", stop.airport, [wait ? `${wait} layover` : null, stop.notes].filter(Boolean).join(" · ") || undefined);
    }
  }

  for (const f of day.flightsArriving) {
    add(f.arriveTime, "Arrival", f.to, [f.airline, f.flightNo].filter(Boolean).join(" ") || undefined);
  }

  // A drive is timed by when you SET OFF, not when you arrive — that is the
  // number a traveler is reading the page for. Leaving it untimed sent every
  // drive to the bottom of the day, below the evening.
  const opening = day.travelLegs.find((l) => l.kind === "arrive-airport" || l.kind === "from-lodging");
  if (opening && day.activities[0]) {
    add(day.startTime, "Drive", day.activities[0].name, formatDuration(opening.minutes) ?? undefined);
  }

  day.activities.forEach((a, i) => {
    if (i > 0 && a.travelMinutesFromPrev) {
      add(day.activities[i - 1].departureTime, "Drive", a.name, formatDuration(a.travelMinutesFromPrev) ?? undefined);
    }
    add(a.arrivalTime ?? a.startTime, "Visit", a.name, a.notes || a.address || undefined);
  });

  if (day.lodging && day.lodging.type !== "overnight-transit") {
    add(day.endTime, "Evening", day.lodging.name || "Overnight", "Overnight stay");
  } else if (day.overnightFlight) {
    add(day.overnightFlight.departTime, "Overnight", flightRouteLabel(day.overnightFlight), "Night spent in transit");
  }

  // Drive lines describe getting TO the stop that follows, so a drive and its
  // arrival share a time; the drive is listed first.
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.sortKey - b.e.sortKey || a.i - b.i)
    .map((x) => x.e);
}

/**
 * "Kraków → Bardejov → Leżajsk" — the places this day passes through.
 *
 * Towns, not airport codes. A day that lands at KRK and drives to Kraków reads
 * as Kraków; the code belongs on the arrival line in the schedule, not in the
 * title. Airports only name the day when there is nothing else on it.
 */
export function dayRouteTitle(day: ItineraryDay): string {
  const places: string[] = [];
  const push = (name?: string) => {
    const clean = (name ?? "").trim();
    if (clean && places[places.length - 1] !== clean) places.push(clean);
  };
  for (const a of day.activities) push(a.name);
  if (day.lodging && day.lodging.type !== "overnight-transit" && !places.length) push(day.lodging.name);
  if (!places.length) {
    for (const f of day.flightsDeparting) {
      push(f.from);
      push(f.to);
    }
    for (const f of day.flightsArriving) push(f.to);
  }
  return places.slice(0, 4).join(" → ") || "A day to plan";
}

/** "POLAND · UKRAINE" — the countries this day touches, when we know them. */
export function dayCountries(day: ItineraryDay): string {
  const seen: string[] = [];
  for (const a of day.activities) {
    const c = a.country?.trim();
    if (c && !seen.includes(c)) seen.push(c);
  }
  return seen.join(" · ").toUpperCase();
}

/** The countries the whole trip covers, for the cover page. */
export function tripCountries(itin: Itinerary): string {
  const seen: string[] = [];
  for (const a of itin.activities) {
    const c = a.country?.trim();
    if (c && !seen.includes(c)) seen.push(c);
  }
  return seen.join(" · ");
}

/** "AUGUST 2 — 6, 2026" for the cover. */
export function coverDates(startDate: string, endDate: string): string {
  const parse = (d: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)) : null;
  };
  const a = parse(startDate);
  const b = parse(endDate);
  if (!a || !b) return "";
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" }).toUpperCase();
  const day = (d: Date) => d.getUTCDate();
  if (month(a) === month(b) && a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${month(a)} ${day(a)} — ${day(b)}, ${b.getUTCFullYear()}`;
  }
  return `${month(a)} ${day(a)} — ${month(b)} ${day(b)}, ${b.getUTCFullYear()}`;
}
