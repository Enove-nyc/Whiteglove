// Itinerary model + pure planning helpers (shared by the builder, the print
// view, and the account store). No DB or browser APIs here.

import { coordinatesToPoint } from "@/data/route-utils";

export type LodgingType = "hotel" | "overnight-transit" | "other";

export type ItinLodging = {
  id: string;
  type: LodgingType;
  name: string;
  address?: string;
  coordinates?: string;
  phone?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD (for overnight-transit, the morning after)
  notes?: string;
  bookedOnSite?: boolean;
};

export type ItinFlight = {
  id: string;
  airline?: string;
  flightNo?: string;
  from: string;
  to: string;
  date: string; // YYYY-MM-DD (departure date)
  departTime?: string; // HH:MM
  arriveTime?: string; // HH:MM
  arriveDate?: string; // YYYY-MM-DD if it lands the next day (red-eye)
  notes?: string;
  bookedOnSite?: boolean;
};

export type ItinActivity = {
  id: string;
  name: string;
  yiddishName?: string;
  address?: string;
  coordinates?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  durationMins?: number;
  href?: string; // link (our kever page, a booking page, a map…)
  phone?: string; // contact number for this stop
  keverSlug?: string; // set when picked from our kever directory
  notes?: string;
  bookedOnSite?: boolean;
};

export type Itinerary = {
  title: string;
  travelerName?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  flights: ItinFlight[];
  lodging: ItinLodging[];
  activities: ItinActivity[];
  notes?: string;
  updatedAt?: string;
};

export function emptyItinerary(): Itinerary {
  return { title: "My trip", travelerName: "", startDate: "", endDate: "", flights: [], lodging: [], activities: [], notes: "" };
}

// ---- Date helpers (UTC-noon to dodge DST/timezone drift) --------------

function toUTC(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

export function eachDate(startDate: string, endDate: string): string[] {
  const start = toUTC(startDate);
  const end = toUTC(endDate);
  if (start === null || end === null || end < start) return [];
  const out: string[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let t = start; t <= end && out.length < 400; t += dayMs) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function formatDateLong(date: string): string {
  const t = toUTC(date);
  if (t === null) return date;
  return new Date(t).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function nextDate(date: string): string {
  const t = toUTC(date);
  if (t === null) return date;
  return new Date(t + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Straight-line distance (km) between two coordinate strings, or null.
export function kmBetween(a?: string, b?: string): number | null {
  const p = coordinatesToPoint(a);
  const q = coordinatesToPoint(b);
  if (!p || !q) return null;
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(q.lat - p.lat);
  const dLng = rad(q.lng - p.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(p.lat)) * Math.cos(rad(q.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatKm(km: number | null): string | null {
  if (km === null) return null;
  const miles = km * 0.621371;
  if (km < 1) return `${Math.round(km * 1000)} m · ${(miles).toFixed(1)} mi`;
  return `${Math.round(km)} km · ${Math.round(miles)} mi`;
}

// ---- Day-by-day assembly + checks ------------------------------------

export type DayActivity = ItinActivity & { distanceFromPrev: number | null };

export type ItineraryDay = {
  date: string;
  label: string;
  index: number;
  flightsDeparting: ItinFlight[];
  flightsArriving: ItinFlight[];
  lodging: ItinLodging | null; // where they sleep THIS night
  activities: DayActivity[];
  warnings: string[];
  freeHours: number | null;
};

const USABLE_DAY_HOURS = 14; // 8am–10pm planning window
const DEFAULT_ACTIVITY_HOURS = 1.5;
const FREE_HOURS_THRESHOLD = 4; // flag a day with this many free hours overall
const GAP_HOURS_THRESHOLD = 3; // flag an empty gap this long between two stops

function timeToMins(t?: string): number | null {
  const m = t && /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** The lodging covering the night that begins on `date` (you sleep here). */
export function lodgingForNight(itin: Itinerary, date: string): ItinLodging | null {
  // Hotels/other: checkIn <= date < checkOut.
  const stay = itin.lodging.find((l) => l.type !== "overnight-transit" && l.checkIn <= date && date < l.checkOut);
  if (stay) return stay;
  // Overnight transit: covers the night of its checkIn date.
  return itin.lodging.find((l) => l.type === "overnight-transit" && l.checkIn === date) ?? null;
}

export function buildDays(itin: Itinerary): ItineraryDay[] {
  const dates = eachDate(itin.startDate, itin.endDate);
  return dates.map((date, index) => {
    const dayActs = itin.activities
      .filter((a) => a.date === date)
      .sort((a, b) => (timeToMins(a.startTime) ?? 9999) - (timeToMins(b.startTime) ?? 9999));
    const withDistance: DayActivity[] = dayActs.map((a, i) => ({
      ...a,
      distanceFromPrev: i === 0 ? null : kmBetween(dayActs[i - 1].coordinates, a.coordinates),
    }));

    const flightsDeparting = itin.flights.filter((f) => f.date === date);
    const flightsArriving = itin.flights.filter((f) => (f.arriveDate ?? f.date) === date);
    const lodging = lodgingForNight(itin, date);
    const isLastDay = index === dates.length - 1;

    const warnings: string[] = [];
    // Missing place to sleep (skip the last day — you usually fly home).
    if (!lodging && !isLastDay && !flightsDeparting.some((f) => (f.arriveDate ?? f.date) !== f.date)) {
      warnings.push("No place to sleep this night — add a hotel, or mark an overnight bus/flight.");
    }
    const travelDay = flightsDeparting.length > 0 || flightsArriving.length > 0;
    const isEmpty = dayActs.length === 0 && !travelDay;

    // Free hours: usable window minus scheduled activity time. A completely
    // empty, non-travel day counts the whole usable window as open.
    const scheduled = dayActs.reduce((sum, a) => sum + (a.durationMins ? a.durationMins / 60 : DEFAULT_ACTIVITY_HOURS), 0);
    const freeHours = dayActs.length
      ? Math.max(0, Math.round((USABLE_DAY_HOURS - scheduled) * 10) / 10)
      : travelDay
        ? null
        : USABLE_DAY_HOURS;

    if (isEmpty) {
      warnings.push(`Nothing planned yet — about ${USABLE_DAY_HOURS} hours open. Add stops, or get ideas for the free time below.`);
    } else if (freeHours !== null && freeHours >= FREE_HOURS_THRESHOLD) {
      warnings.push(`About ${freeHours} free hours this day — room for another stop.`);
    }

    // Long empty gaps between timed stops (e.g. a free afternoon in the middle).
    const timed = dayActs.filter((a) => timeToMins(a.startTime) !== null);
    for (let i = 1; i < timed.length; i += 1) {
      const prevStart = timeToMins(timed[i - 1].startTime) ?? 0;
      const prevEnd = prevStart + (timed[i - 1].durationMins ?? DEFAULT_ACTIVITY_HOURS * 60);
      const nextStart = timeToMins(timed[i].startTime) ?? 0;
      const gapHours = Math.round(((nextStart - prevEnd) / 60) * 10) / 10;
      if (gapHours >= GAP_HOURS_THRESHOLD) {
        warnings.push(`About ${gapHours} free hours after ${timed[i - 1].name}, with nothing planned until ${timed[i].name} — room for another stop.`);
      }
    }

    return {
      date,
      label: formatDateLong(date),
      index,
      flightsDeparting,
      flightsArriving,
      lodging,
      activities: withDistance,
      warnings,
      freeHours,
    };
  });
}

export type ItinerarySummary = {
  nights: number;
  nightsWithoutLodging: number;
  emptyDays: number;
  totalWarnings: number;
};

export function summarize(days: ItineraryDay[]): ItinerarySummary {
  const nights = Math.max(0, days.length - 1);
  let nightsWithoutLodging = 0;
  let emptyDays = 0;
  let totalWarnings = 0;
  days.forEach((day) => {
    // Count the same nights the day cards flag (red-eye flights / overnight
    // transit already suppress the warning), so the summary stays consistent.
    if (day.warnings.some((w) => w.startsWith("No place to sleep"))) nightsWithoutLodging += 1;
    if (day.activities.length === 0 && day.flightsDeparting.length === 0 && day.flightsArriving.length === 0) emptyDays += 1;
    totalWarnings += day.warnings.length;
  });
  return { nights, nightsWithoutLodging, emptyDays, totalWarnings };
}
