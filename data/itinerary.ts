// Itinerary model + pure planning helpers (shared by the builder, the print
// view, and the account store). No DB or browser APIs here.

import { AIRPORTS } from "@/data/airports";
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
  /** YYYY-MM-DD. Empty means "not scheduled yet" — the planner will place it. */
  date: string;
  startTime?: string; // HH:MM
  durationMins?: number;
  /** Position within the day. Lower comes first; set by reordering or planning. */
  order?: number;
  href?: string; // link (our kever page, a booking page, a map…)
  phone?: string; // contact number for this stop
  keverSlug?: string; // set when picked from our kever directory
  /** Country this stop is in, when we know it. Used to flag border crossings. */
  country?: string;
  notes?: string;
  bookedOnSite?: boolean;
};

/**
 * Someone travelling on this trip.
 *
 * Not the same thing as sharing the itinerary. A collaborator is another
 * account that can open and edit the plan; a traveler is a person who is
 * actually going — a child, a parent, a spouse — who may well have no account
 * at all. A family trip needs the second without needing the first.
 */
export type ItinTraveler = {
  id: string;
  name: string;
  kind?: "adult" | "child" | "infant";
  /** Passport notes, seat preference, dietary needs — whatever matters. */
  notes?: string;
};

export type Itinerary = {
  title: string;
  /** Superseded by `travelers`; kept so older saved trips still read. */
  travelerName?: string;
  travelers?: ItinTraveler[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  flights: ItinFlight[];
  lodging: ItinLodging[];
  activities: ItinActivity[];
  /**
   * Real road driving minutes per leg, keyed "fromCoords>toCoords", filled in
   * from the routing service. Used instead of the straight-line estimate.
   */
  roadTimes?: Record<string, number>;
  /**
   * Which engine produced each road time. "google" is a traffic-aware Google
   * Routes answer — the number Google Maps itself would give. "osrm" is the
   * open router, which assumes empty roads and so runs optimistic. Kept so the
   * planner can label the two differently instead of passing an estimate off
   * as a Maps time.
   */
  roadTimeSources?: Record<string, "google" | "osrm">;
  /** When the traveler gets going each morning, HH:MM. Drives arrival times. */
  dayStartTime?: string;
  notes?: string;
  updatedAt?: string;
};

/** Key for one leg of travel — matches lib/road-times.ts. */
export function travelLegKey(from?: string, to?: string): string {
  return `${(from ?? "").trim()}>${(to ?? "").trim()}`;
}

export function emptyItinerary(): Itinerary {
  return { title: "My trip", travelerName: "", travelers: [], startDate: "", endDate: "", flights: [], lodging: [], activities: [], notes: "" };
}

// ---- Travelers -------------------------------------------------------

/**
 * The people on this trip. Trips saved before the planner could hold more than
 * one name kept a single `travelerName`; that is read as the first traveler so
 * nobody's existing itinerary loses the name they typed.
 */
export function travelersOf(itin: Itinerary): ItinTraveler[] {
  if (itin.travelers?.length) return itin.travelers;
  const legacy = itin.travelerName?.trim();
  return legacy ? [{ id: "legacy-traveler", name: legacy, kind: "adult" }] : [];
}

export function travelerCount(itin: Itinerary): number {
  return travelersOf(itin).length;
}

/** "Sarah, Dovid and 2 children" — for the header and the printed itinerary. */
export function travelerSummary(itin: Itinerary): string {
  const people = travelersOf(itin);
  if (!people.length) return "";
  const adults = people.filter((p) => (p.kind ?? "adult") === "adult");
  const children = people.filter((p) => p.kind === "child");
  const infants = people.filter((p) => p.kind === "infant");
  const names = adults.map((p) => p.name).filter(Boolean);
  const parts: string[] = [];
  if (names.length === 1) parts.push(names[0]);
  else if (names.length > 1) parts.push(`${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);
  if (children.length) parts.push(`${children.length} ${children.length === 1 ? "child" : "children"}`);
  if (infants.length) parts.push(`${infants.length} ${infants.length === 1 ? "infant" : "infants"}`);
  return parts.join(", ");
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

export type DayActivity = ItinActivity & {
  distanceFromPrev: number | null;
  /** Travel time from the previous stop, in minutes. */
  travelMinutesFromPrev: number | null;
  /** True when the time came from real road routing, not the estimate. */
  travelIsMeasured?: boolean;
  /** Which engine produced it — see Itinerary.roadTimeSources. */
  travelSource?: "google" | "osrm";
  /** Worked-out clock time the traveler reaches this stop, HH:MM. */
  arrivalTime?: string;
  /** …and leaves it. */
  departureTime?: string;
  /** True when the schedule only works by arriving after the stated start time. */
  arrivesLate?: boolean;
};

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
  /** Estimated hours of ground travel this day (transfers + between stops). */
  travelHours: number;
  /** Every ground leg of the day, in order — airport/hotel transfers included. */
  travelLegs: TravelLeg[];
  /** Where the day begins — last night's hotel, or the airport you landed at. */
  startsFrom?: string;
  /** Clock time the day begins, HH:MM. */
  startTime?: string;
  /** Clock time the traveler is back at the hotel / at the airport. */
  endTime?: string;
  /** The flight the traveler spends this night on, if any. */
  overnightFlight?: ItinFlight | null;
};

const USABLE_DAY_HOURS = 14; // 8am–10pm planning window
const DEFAULT_ACTIVITY_HOURS = 1.5;
const DEFAULT_DAY_START_MINS = 8 * 60; // 08:00 unless the traveler says otherwise
const LATE_FINISH_MINS = 21 * 60; // a day ending after 21:00 is worth flagging
const FREE_HOURS_THRESHOLD = 4; // flag a day with this many free hours overall
const GAP_HOURS_THRESHOLD = 3; // flag an empty gap this long between two stops

// --- Travel-time estimate ---------------------------------------------
// The last-resort figure, used only when routing could not be reached at all.
// Roads are never straight, so scale the straight-line distance up, then apply
// a speed that reflects the trip type (short hops are slow town driving; long
// legs run closer to highway speed), plus a fixed allowance for parking and
// getting going.
//
// The speeds below are deliberately on the cautious side. An estimate that runs
// slightly long costs a traveler nothing; one that runs short hands them free
// hours that do not exist and a kever they arrive at after it has closed. Every
// number derived from this is shown with a "≈" and never called a Maps time.
const ROAD_DETOUR_FACTOR = 1.35;
const TRANSFER_OVERHEAD_MINS = 10;
// Beyond this, an airport isn't a ground transfer for the day — it's the other
// end of a flight (guards against "driving" from Krakow to JFK).
const MAX_AIRPORT_TRANSFER_KM = 300;

export function estimateTravelMinutes(straightLineKm: number | null): number | null {
  if (straightLineKm === null || !Number.isFinite(straightLineKm)) return null;
  if (straightLineKm <= 0.05) return 0; // same spot
  const roadKm = straightLineKm * ROAD_DETOUR_FACTOR;
  // Town crawl, rural road, cross-country road, motorway.
  const kmh = roadKm < 5 ? 22 : roadKm < 25 ? 38 : roadKm < 100 ? 58 : 88;
  return Math.round((roadKm / kmh) * 60 + TRANSFER_OVERHEAD_MINS);
}

/** "1 h 25 m" / "45 min" for a minute count. */
export function formatDuration(mins: number | null): string | null {
  if (mins === null || !Number.isFinite(mins)) return null;
  const total = Math.round(mins);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} m` : `${h} h`;
}

/** Coordinates for a flight's airport label ("New York (JFK)", "KBP", …). */
function airportCoordsFor(label?: string): string | null {
  if (!label) return null;
  const tokens = label.toUpperCase().match(/[A-Z]{3}/g) ?? [];
  for (const token of tokens) {
    const airport = AIRPORTS.find((a) => a.code === token);
    if (airport) return `${airport.lat}, ${airport.lng}`;
  }
  return null;
}

/** One leg of a day's travel — between stops, or to/from lodging or an airport. */
export type TravelLeg = {
  kind: "arrive-airport" | "from-lodging" | "stop" | "to-lodging" | "depart-airport";
  label: string;
  minutes: number;
  km: number | null;
  fromCoordinates?: string;
  toCoordinates?: string;
  /** True when the time is a real road time rather than an estimate. */
  measured?: boolean;
  /** Which engine produced it — see Itinerary.roadTimeSources. */
  source?: "google" | "osrm";
};

function timeToMins(t?: string): number | null {
  const m = t && /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minsToTime(mins: number): string {
  const wrapped = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

/**
 * The date a flight actually lands.
 *
 * `arriveDate` is optional and almost nobody fills it in, so a red-eye used to
 * be listed as arriving on the day it left. When the arrival time is at or
 * before the departure time the flight crossed midnight, and that is enough to
 * place it on the following day. A late departure with no arrival time is left
 * alone — we know the night is spent aboard, but not what day it lands, and
 * guessing a date would put the landing on the wrong page.
 */
export function flightArrivalDate(flight: ItinFlight): string {
  if (flight.arriveDate) return flight.arriveDate;
  const depart = timeToMins(flight.departTime);
  const arrive = timeToMins(flight.arriveTime);
  if (depart !== null && arrive !== null && arrive <= depart) return nextDate(flight.date);
  return flight.date;
}

/**
 * The flight that carries the traveler through the night that begins on
 * `date`, if there is one.
 *
 * A red-eye is a place to sleep. The planner used to notice this only when the
 * traveler had filled in an arrival DATE, which almost nobody does — so an
 * overnight flight still drew "No place to sleep this night". Now the arrival
 * time is enough: landing at or before the hour you left means you landed the
 * next day, and a departure late in the evening means the night is spent in
 * the air either way.
 */
export function overnightFlightFor(itin: Itinerary, date: string): ItinFlight | null {
  const LATE_DEPARTURE_MINS = 21 * 60; // 21:00
  for (const flight of itin.flights) {
    if (flight.date !== date) continue;
    // Stated outright: it lands on a later date.
    if (flight.arriveDate && flight.arriveDate > flight.date) return flight;
    const depart = timeToMins(flight.departTime);
    const arrive = timeToMins(flight.arriveTime);
    // Lands at or before the hour it left — it crossed midnight.
    if (depart !== null && arrive !== null && arrive <= depart) return flight;
    // Leaves late enough that the night is spent aboard.
    if (depart !== null && depart >= LATE_DEPARTURE_MINS) return flight;
  }
  return null;
}

/** The lodging covering the night that begins on `date` (you sleep here). */
export function lodgingForNight(itin: Itinerary, date: string): ItinLodging | null {
  // Hotels/other: checkIn <= date < checkOut.
  const stay = itin.lodging.find((l) => l.type !== "overnight-transit" && l.checkIn <= date && date < l.checkOut);
  if (stay) return stay;
  // Overnight transit: covers the night of its checkIn date.
  return itin.lodging.find((l) => l.type === "overnight-transit" && l.checkIn === date) ?? null;
}

/**
 * The order stops appear in a day: an explicit position first (set by
 * reordering or route planning), then by clock time, then as entered.
 */
export function sortDayActivities(acts: ItinActivity[]): ItinActivity[] {
  return acts
    .map((a, i) => ({ a, i }))
    .sort((x, y) => {
      const ox = x.a.order ?? Number.POSITIVE_INFINITY;
      const oy = y.a.order ?? Number.POSITIVE_INFINITY;
      if (ox !== oy) return ox - oy;
      const tx = timeToMins(x.a.startTime) ?? Number.POSITIVE_INFINITY;
      const ty = timeToMins(y.a.startTime) ?? Number.POSITIVE_INFINITY;
      if (tx !== ty) return tx - ty;
      return x.i - y.i;
    })
    .map((x) => x.a);
}

/** Stops that have no date yet — the planner can place these on a day. */
export function unscheduledActivities(itin: Itinerary): ItinActivity[] {
  return itin.activities.filter((a) => !a.date);
}

export function buildDays(itin: Itinerary): ItineraryDay[] {
  const dates = eachDate(itin.startDate, itin.endDate);
  return dates.map((date, index) => {
    const dayActs = sortDayActivities(itin.activities.filter((a) => a.date === date));
    // Prefer a real measured road time when we have one for this leg.
    const roadMinutes = (from?: string, to?: string) => itin.roadTimes?.[travelLegKey(from, to)];
    const roadSource = (from?: string, to?: string) => itin.roadTimeSources?.[travelLegKey(from, to)];
    const withDistance: DayActivity[] = dayActs.map((a, i) => {
      if (i === 0) return { ...a, distanceFromPrev: null, travelMinutesFromPrev: null };
      const prev = dayActs[i - 1];
      const distanceFromPrev = kmBetween(prev.coordinates, a.coordinates);
      const measured = roadMinutes(prev.coordinates, a.coordinates);
      return {
        ...a,
        distanceFromPrev,
        travelMinutesFromPrev: measured ?? estimateTravelMinutes(distanceFromPrev),
        travelIsMeasured: measured !== undefined,
        travelSource: roadSource(prev.coordinates, a.coordinates),
      };
    });

    const flightsDeparting = itin.flights.filter((f) => f.date === date);
    const flightsArriving = itin.flights.filter((f) => flightArrivalDate(f) === date);
    const lodging = lodgingForNight(itin, date);
    const isLastDay = index === dates.length - 1;

    // --- Every ground leg of the day, not just stop-to-stop ---------------
    // Morning: from the airport you land at, else from last night's hotel.
    // Evening: to the airport you fly out of, else back to tonight's hotel.
    const prevNightLodging = index > 0 ? lodgingForNight(itin, dates[index - 1]) : null;
    const firstStop = withDistance[0];
    const lastStop = withDistance[withDistance.length - 1];

    // A same-day flight appears as both arriving and departing, so an airport is
    // only a real ground transfer if it is actually near the day's stops —
    // otherwise we would "drive" from Krakow to JFK. Pick the nearest candidate
    // within a sane driving distance.
    const nearestAirportTo = (candidates: Array<string | undefined>, stopCoordinates?: string): string | null => {
      let best: { coords: string; km: number } | null = null;
      for (const label of candidates) {
        const coords = airportCoordsFor(label);
        const km = kmBetween(coords ?? undefined, stopCoordinates);
        if (coords && km !== null && km <= MAX_AIRPORT_TRANSFER_KM && (!best || km < best.km)) best = { coords, km };
      }
      return best?.coords ?? null;
    };
    const arrivalAirport = nearestAirportTo(flightsArriving.map((f) => f.to), firstStop?.coordinates);
    const departureAirport = nearestAirportTo(flightsDeparting.map((f) => f.from), lastStop?.coordinates);
    const arrivalAirportLabel = flightsArriving.find((f) => airportCoordsFor(f.to) === arrivalAirport)?.to;
    const departureAirportLabel = flightsDeparting.find((f) => airportCoordsFor(f.from) === departureAirport)?.from;

    const leg = (kind: TravelLeg["kind"], label: string, from?: string, to?: string): TravelLeg | null => {
      const km = kmBetween(from, to);
      const measured = roadMinutes(from, to);
      const minutes = measured ?? estimateTravelMinutes(km);
      if (km === null || minutes === null || minutes <= 0) return null;
      return { kind, label, minutes, km, fromCoordinates: from, toCoordinates: to, measured: measured !== undefined, source: roadSource(from, to) };
    };

    const travelLegs: TravelLeg[] = [];
    if (firstStop) {
      if (arrivalAirport) {
        const l = leg("arrive-airport", `Airport ${arrivalAirportLabel} → ${firstStop.name}`, arrivalAirport, firstStop.coordinates);
        if (l) travelLegs.push(l);
      } else if (prevNightLodging?.coordinates) {
        const l = leg("from-lodging", `${prevNightLodging.name || "Hotel"} → ${firstStop.name}`, prevNightLodging.coordinates, firstStop.coordinates);
        if (l) travelLegs.push(l);
      }
    }
    withDistance.forEach((a, i) => {
      if (i === 0 || a.travelMinutesFromPrev === null || a.travelMinutesFromPrev <= 0) return;
      travelLegs.push({
        kind: "stop",
        label: `${withDistance[i - 1].name} → ${a.name}`,
        minutes: a.travelMinutesFromPrev,
        km: a.distanceFromPrev,
        fromCoordinates: withDistance[i - 1].coordinates,
        toCoordinates: a.coordinates,
        measured: a.travelIsMeasured,
        source: a.travelSource,
      });
    });
    if (lastStop) {
      if (departureAirport) {
        const l = leg("depart-airport", `${lastStop.name} → airport ${departureAirportLabel}`, lastStop.coordinates, departureAirport);
        if (l) travelLegs.push(l);
      } else if (lodging?.coordinates && lodging.type !== "overnight-transit") {
        const l = leg("to-lodging", `${lastStop.name} → ${lodging.name || "hotel"}`, lastStop.coordinates, lodging.coordinates);
        if (l) travelLegs.push(l);
      }
    }

    // All of it is real time that isn't free.
    const travelMins = travelLegs.reduce((sum, l) => sum + l.minutes, 0);
    const travelHours = Math.round((travelMins / 60) * 10) / 10;

    // --- What time you actually get there --------------------------------
    // Roll a clock forward from the moment the day starts: leave the hotel (or
    // the airport you landed at), drive, arrive, spend time at the stop, drive
    // on. A stop with its own start time holds the clock until then — you wait
    // rather than arrive early — and if the drive means you cannot make it,
    // the arrival is marked late instead of being quietly moved.
    const startsFrom = arrivalAirport
      ? `airport ${arrivalAirportLabel ?? ""}`.trim()
      : prevNightLodging
        ? prevNightLodging.name || "last night's hotel"
        : undefined;
    // You cannot set off before you have landed. When the day begins at an
    // airport, it begins when the plane does — not at the traveler's usual
    // morning hour.
    const landedAt = arrivalAirport
      ? flightsArriving.map((f) => timeToMins(f.arriveTime)).filter((v): v is number => v !== null).sort((a, b) => a - b)[0] ?? null
      : null;
    const dayStart = Math.max(timeToMins(itin.dayStartTime) ?? DEFAULT_DAY_START_MINS, landedAt ?? 0);
    let clock = dayStart;
    const openingLeg = travelLegs.find((l) => l.kind === "arrive-airport" || l.kind === "from-lodging");
    if (openingLeg) clock += openingLeg.minutes;

    withDistance.forEach((a, i) => {
      if (i > 0) clock += a.travelMinutesFromPrev ?? 0;
      const stated = timeToMins(a.startTime);
      if (stated !== null) {
        a.arrivesLate = clock > stated;
        // Waiting is fine; being late is not, and pretending otherwise would
        // make every later stop on the day wrong too.
        clock = Math.max(clock, stated);
      }
      a.arrivalTime = minsToTime(clock);
      clock += a.durationMins ?? DEFAULT_ACTIVITY_HOURS * 60;
      a.departureTime = minsToTime(clock);
    });
    const closingLeg = travelLegs.find((l) => l.kind === "to-lodging" || l.kind === "depart-airport");
    if (closingLeg) clock += closingLeg.minutes;
    const dayEnd = clock;

    const warnings: string[] = [];
    // A red-eye IS the night's accommodation.
    const overnightFlight = overnightFlightFor(itin, date);
    // Missing place to sleep (skip the last day — you usually fly home).
    if (!lodging && !isLastDay && !overnightFlight) {
      warnings.push("No place to sleep this night — add a hotel, or mark an overnight bus/flight.");
    }
    if (landedAt !== null && withDistance.length) {
      // Deliberately not folded into the clock: how long a border, baggage and
      // a car-hire desk take varies far too much to put a number on, and an
      // invented one would be worse than none.
      warnings.push(
        `This day starts from the airport at ${minsToTime(dayStart)}, the moment the flight lands — it does not include clearing passport control, baggage, or collecting a car. Add that time yourself before relying on the arrival times below.`,
      );
    }
    if (withDistance.length) {
      const late = withDistance.filter((a) => a.arrivesLate);
      if (late.length) {
        warnings.push(
          `Running late: leaving at ${minsToTime(dayStart)} you reach ${late[0].name} after its ${late[0].startTime} start. Start earlier, drop a stop, or move it to another day.`,
        );
      } else if (dayEnd > LATE_FINISH_MINS) {
        warnings.push(
          `This day finishes around ${minsToTime(dayEnd)} — later than most kevarim and hotels expect. Consider starting earlier or moving a stop.`,
        );
      }
    }
    const travelDay = flightsDeparting.length > 0 || flightsArriving.length > 0;
    const isEmpty = dayActs.length === 0 && !travelDay;

    // Free hours: the usable window minus time at the stops AND the time it
    // takes to get between them. Ignoring the driving is what used to report a
    // packed, spread-out day as mostly free.
    const scheduled = dayActs.reduce((sum, a) => sum + (a.durationMins ? a.durationMins / 60 : DEFAULT_ACTIVITY_HOURS), 0);
    const committed = scheduled + travelHours;
    const freeHours = dayActs.length
      ? Math.max(0, Math.round((USABLE_DAY_HOURS - committed) * 10) / 10)
      : travelDay
        ? null
        : USABLE_DAY_HOURS;

    const hasTransfer = travelLegs.some((l) => l.kind !== "stop");
    const travelNote = travelHours >= 0.5 ? ` (after about ${travelHours} h of driving${hasTransfer ? ", including transfers" : " between stops"})` : "";

    // Per-leg checks first: a day whose timing already doesn't work must not
    // also be told it has room for another stop.
    const legWarnings: string[] = [];
    let hasTimingConflict = false;
    const timed = dayActs.filter((a) => timeToMins(a.startTime) !== null);
    for (let i = 1; i < timed.length; i += 1) {
      const prevStart = timeToMins(timed[i - 1].startTime) ?? 0;
      const prevEnd = prevStart + (timed[i - 1].durationMins ?? DEFAULT_ACTIVITY_HOURS * 60);
      const nextStart = timeToMins(timed[i].startTime) ?? 0;
      const legMins = roadMinutes(timed[i - 1].coordinates, timed[i].coordinates) ?? estimateTravelMinutes(kmBetween(timed[i - 1].coordinates, timed[i].coordinates)) ?? 0;
      const gapHours = Math.round(((nextStart - prevEnd - legMins) / 60) * 10) / 10;
      if (nextStart - prevEnd < legMins) {
        // Not enough time to make it there — a scheduling conflict, not free time.
        hasTimingConflict = true;
        legWarnings.push(`Tight timing: leaving ${timed[i - 1].name} and driving roughly ${formatDuration(legMins)} does not leave enough time before ${timed[i].name} starts at ${timed[i].startTime}.`);
      } else if (gapHours >= GAP_HOURS_THRESHOLD) {
        // A "gap" that is really a long drive is not offered as free time.
        legWarnings.push(`About ${gapHours} free hours after ${timed[i - 1].name} (not counting the ~${formatDuration(legMins)} drive), with nothing planned until ${timed[i].name} — room for another stop.`);
      }
    }

    // If stops have no location we cannot measure the driving between them, and
    // silently counting it as zero is what makes a packed day look wide open.
    // Say so instead of quietly overstating the free time.
    const missingLocation = dayActs.filter((a) => !coordinatesToPoint(a.coordinates));
    if (dayActs.length > 1 && missingLocation.length > 0) {
      const names = missingLocation.slice(0, 3).map((a) => a.name).join(", ");
      warnings.push(
        `Travel time is not counted for ${missingLocation.length} stop${missingLocation.length > 1 ? "s" : ""} (${names}${missingLocation.length > 3 ? "…" : ""}) because ${missingLocation.length > 1 ? "they have" : "it has"} no location yet — pick the address from the dropdown, or use "Plan my route" to look them up. Until then the free hours below are too high.`,
      );
    }

    // A day that crosses a border. No routing engine — Google Maps included —
    // puts the queue at the crossing into its driving time, and on the frontiers
    // this site sends people over that queue is routinely the longest part of
    // the day. Flag it rather than fold a made-up number into the total.
    const crossings: string[] = [];
    for (let i = 1; i < dayActs.length; i += 1) {
      const from = dayActs[i - 1].country?.trim();
      const to = dayActs[i].country?.trim();
      if (from && to && from !== to) {
        const pair = `${from} → ${to}`;
        if (!crossings.includes(pair)) crossings.push(pair);
      }
    }
    if (crossings.length) {
      warnings.push(
        `This day crosses a border (${crossings.join(", ")}). The driving times below do not include waiting at the crossing, which can add anywhere from minutes to several hours — check the current wait before you commit to the day's timings.`,
      );
    }

    if (isEmpty) {
      warnings.push(`Nothing planned yet — about ${USABLE_DAY_HOURS} hours open. Add stops, or get ideas for the free time below.`);
    } else if (committed > USABLE_DAY_HOURS) {
      const over = Math.round((committed - USABLE_DAY_HOURS) * 10) / 10;
      warnings.push(`This day is over-packed — about ${Math.round(scheduled * 10) / 10} h at the stops plus roughly ${travelHours} h of driving is about ${over} h more than a ${USABLE_DAY_HOURS}-hour day. Consider moving a stop to another day.`);
    } else if (!hasTimingConflict && missingLocation.length === 0 && freeHours !== null && freeHours >= FREE_HOURS_THRESHOLD) {
      warnings.push(`About ${freeHours} free hours this day${travelNote} — room for another stop.`);
    }
    warnings.push(...legWarnings);

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
      travelHours,
      travelLegs,
      startsFrom,
      startTime: minsToTime(dayStart),
      endTime: withDistance.length ? minsToTime(dayEnd) : undefined,
      overnightFlight,
    };
  });
}

export type ItinerarySummary = {
  nights: number;
  nightsWithoutLodging: number;
  emptyDays: number;
  totalWarnings: number;
  /** Estimated driving hours between stops across the whole trip. */
  travelHours: number;
  /** Days where stops + driving exceed the usable day. */
  overpackedDays: number;
};

export function summarize(days: ItineraryDay[]): ItinerarySummary {
  const nights = Math.max(0, days.length - 1);
  let nightsWithoutLodging = 0;
  let emptyDays = 0;
  let totalWarnings = 0;
  let travelHours = 0;
  let overpackedDays = 0;
  days.forEach((day) => {
    // Count the same nights the day cards flag (red-eye flights / overnight
    // transit already suppress the warning), so the summary stays consistent.
    if (day.warnings.some((w) => w.startsWith("No place to sleep"))) nightsWithoutLodging += 1;
    if (day.activities.length === 0 && day.flightsDeparting.length === 0 && day.flightsArriving.length === 0) emptyDays += 1;
    if (day.warnings.some((w) => w.startsWith("This day is over-packed"))) overpackedDays += 1;
    travelHours += day.travelHours;
    totalWarnings += day.warnings.length;
  });
  return { nights, nightsWithoutLodging, emptyDays, totalWarnings, travelHours: Math.round(travelHours * 10) / 10, overpackedDays };
}
