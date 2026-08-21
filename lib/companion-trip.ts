/**
 * A real planner itinerary, shaped for the White Glove app.
 *
 * The app (components/companion/CompanionApp.tsx) renders a CompanionTrip. The
 * planner stores an Itinerary (data/itinerary.ts). This is the one place that
 * turns the second into the first, reading the very same day-by-day plan the
 * printed copy and the shared link read — buildDays() — so the trip on the
 * phone is the trip on paper, not a second telling of it.
 *
 * WHAT IT DOES NOT INVENT. The concierge side of the app — the advisor thread,
 * the held-for-you weather swap, the "handled for you" log — is left off a
 * wired trip (concierge: false). Nothing is put in an advisor's mouth that no
 * advisor said. What a real trip carries is what the planner actually holds:
 * the days, the stops, the flights and stay in the wallet, and who is going.
 */

import {
  type Itinerary,
  type ItineraryDay,
  travelerSummary,
  travelersOf,
} from "@/data/itinerary";
import type {
  CompanionDay,
  CompanionItem,
  CompanionKind,
  CompanionTrip,
  CompanionWalletGroup,
  CompanionWalletRow,
} from "@/data/companion-demo";

/* ---- small date helpers (UTC-noon, like the rest of the planner) -------- */

function atNoon(dateISO: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

function fmt(dateISO: string, opts: Intl.DateTimeFormatOptions): string {
  const dt = atNoon(dateISO);
  if (!dt) return "";
  return dt.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

/** "25 October – 1 November 2026", trimming the year off the first when shared. */
function formatRange(start: string, end: string): string {
  const s = atNoon(start);
  const e = atNoon(end);
  if (!s || !e) return "";
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  const startStr = fmt(start, { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) });
  const endStr = fmt(end, { day: "numeric", month: "long", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

/** Minutes past midnight for an HH:MM, or a large number so blanks sort last. */
function minutesOf(time?: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : 100000;
}

/* ---- the mapping -------------------------------------------------------- */

// Everything the planner holds as a stop today is a place you go to on foot —
// a kever or a shul no less so — so every activity maps to one kind. When the
// planner learns to mark a meal or a rest, this is where that branch lands.
const STOP_KIND: CompanionKind = "sight";

/** The short label under a day in the eight-day strip. */
function shortLabel(day: ItineraryDay, index: number, lastIndex: number): string {
  if (day.flightsArriving.length && index === 0) return "Arrive";
  if (day.flightsDeparting.length && index === lastIndex) return "Home";
  if (day.flightsDeparting.length && index === 0) return "Fly out";
  const first = day.activities[0];
  if (first) return first.name.split(/[,(]/)[0].trim().slice(0, 12);
  return "Open";
}

function itemsForDay(day: ItineraryDay): CompanionItem[] {
  const items: CompanionItem[] = [];

  for (const f of day.flightsArriving) {
    items.push({
      time: f.arriveTime ?? "",
      title: `Land at ${f.to}`,
      place: f.airline ? `${f.airline}${f.flightNo ? " " + f.flightNo : ""}` : "By air",
      kind: "travel",
      note: f.confirmation ? `Reference ${f.confirmation}.` : "",
    });
  }

  for (const a of day.activities) {
    const time = a.startTime || a.arrivalTime || "";
    const walk =
      a.travelMinutesFromPrev && a.travelMinutesFromPrev > 0
        ? `${a.travelIsMeasured ? "" : "≈"}${Math.round(a.travelMinutesFromPrev)} min from the last stop`
        : undefined;
    items.push({
      time,
      title: a.name,
      place: a.address || a.country || "",
      kind: STOP_KIND,
      note: a.notes || "",
      ...(walk ? { walk } : {}),
      ...(a.phone ? { phone: a.phone } : {}),
      ...(a.href ? { href: a.href } : {}),
    });
  }

  for (const f of day.flightsDeparting) {
    items.push({
      time: f.departTime ?? "",
      title: `${f.from} → ${f.to}`,
      // The airline/flight, like an arriving leg — a landing time is not a
      // place, and doesn't belong in the "Where" row it used to sit in.
      place: f.airline ? `${f.airline}${f.flightNo ? " " + f.flightNo : ""}` : "By air",
      kind: "travel",
      note: f.confirmation ? `Reference ${f.confirmation}.` : "",
      ...(f.arriveTime ? { arriveNote: `Lands ${f.arriveTime}${f.arriveDate ? " next day" : ""}` } : {}),
    });
  }

  if (items.length === 0) {
    items.push({ time: "", title: "An open day", place: "", kind: "rest", note: "Nothing planned yet." });
  }

  return items.sort((x, y) => minutesOf(x.time) - minutesOf(y.time));
}

function dayFor(day: ItineraryDay, index: number, lastIndex: number, today: string, guideNote?: string): CompanionDay {
  const dt = atNoon(day.date);
  const weekdayLong = fmt(day.date, { weekday: "long" });
  const month = fmt(day.date, { month: "long" });
  const dom = dt ? String(dt.getUTCDate()).padStart(2, "0") : "";

  const start = day.startTime;
  const end = day.endTime;
  const timeChip = start && end ? `${start}–${end}` : start ? `From ${start}` : "";
  const travelChip = day.travelHours > 0 ? `≈${day.travelHours}h travelling` : "";

  return {
    date: day.date,
    dow: fmt(day.date, { weekday: "short" }),
    dom,
    short: shortLabel(day, index, lastIndex),
    name: `${weekdayLong} ${dt ? dt.getUTCDate() : ""} ${month}`.trim(),
    weather: timeChip,
    walk: travelChip,
    today: day.date === today || undefined,
    ...(guideNote?.trim() ? { guideNote: guideNote.trim() } : {}),
    items: itemsForDay(day),
  };
}

function walletGroupsFor(itin: Itinerary): CompanionWalletGroup[] {
  const groups: CompanionWalletGroup[] = [];

  const flightRows: CompanionWalletRow[] = itin.flights.map((f) => ({
    title: `${f.from} → ${f.to}`,
    ref: f.confirmation ? `ref ${f.confirmation}` : "",
    sub: [fmt(f.date, { weekday: "short", day: "numeric", month: "short" }), f.departTime, f.airline]
      .filter(Boolean)
      .join(" · "),
    id: f.id,
    stopKind: "flight",
    attachments: f.attachments,
  }));
  if (flightRows.length) groups.push({ name: "Flights", rows: flightRows });

  const stayRows: CompanionWalletRow[] = itin.lodging
    .filter((l) => l.type !== "overnight-transit")
    .map((l) => ({
      title: l.name || "Where you are staying",
      ref: l.confirmation ? `conf ${l.confirmation}` : "",
      sub:
        l.checkIn && l.checkOut
          ? `${fmt(l.checkIn, { day: "numeric", month: "short" })} – ${fmt(l.checkOut, { day: "numeric", month: "short" })}`
          : "",
      ...(l.phone ? { phone: l.phone } : {}),
      ...(l.address ? { address: l.address } : {}),
      id: l.id,
      stopKind: "lodging",
      attachments: l.attachments,
    }));
  if (stayRows.length) groups.push({ name: "Where you are staying", rows: stayRows });

  const heldRows: CompanionWalletRow[] = itin.activities
    .filter((a) => a.bookedOnSite || a.notes?.toLowerCase().includes("ticket") || (a.attachments?.length ?? 0) > 0)
    .map((a) => ({
      title: a.name,
      ref: a.bookedOnSite ? "booked" : "",
      sub: [a.date ? fmt(a.date, { weekday: "short", day: "numeric", month: "short" }) : "", a.address]
        .filter(Boolean)
        .join(" · "),
      id: a.id,
      stopKind: "activity",
      attachments: a.attachments,
    }));
  if (heldRows.length) groups.push({ name: "Held for you", rows: heldRows });

  return groups;
}

/**
 * Build the app's trip from a planner itinerary and its day-by-day plan.
 *
 * `days` is the result of buildDays(itin, …) — passed in rather than computed
 * here, because the border costs and planning assumptions it needs are read on
 * the server, and this stays a pure transform that a test can call with a
 * hand-made trip.
 */
export function itineraryToCompanionTrip(
  itin: Itinerary,
  days: ItineraryDay[],
  opts: {
    today: string;
    advisorName?: string;
    tripName?: string;
    client?: string;
    tripId?: string;
  },
): CompanionTrip {
  const lastIndex = days.length - 1;
  const compDays = days.map((d, i) => dayFor(d, i, lastIndex, opts.today, itin.guideNotes?.[d.date]));

  // Which day the app opens on: today when the trip is on now, else the
  // first — a reasonable page to land a browser on, whether the trip hasn't
  // started yet or has already finished.
  let todayIndex = compDays.findIndex((d) => d.today);
  if (todayIndex < 0) todayIndex = 0;

  // The trip is over, not merely "not today" — the difference between
  // opening early (fine to read as day one) and opening after the last day
  // (must not be read as day one, or today, at all). ISO dates compare
  // lexicographically the same as chronologically.
  const lastDate = days[days.length - 1]?.date;
  const tripFinished = Boolean(lastDate && opts.today > lastDate);

  // Before the trip starts, "today" is nobody's real day — the countdown is
  // the honest thing to lead with, not a Day 1 the traveller has not reached.
  const firstDate = days[0]?.date;
  const hasStarted = compDays.some((d) => d.today) || tripFinished;
  const daysUntilStart =
    !hasStarted && firstDate && firstDate > opts.today
      ? Math.round((new Date(firstDate).getTime() - new Date(opts.today).getTime()) / 86400000)
      : undefined;

  const who = travelerSummary(itin);
  const people = travelersOf(itin);
  const adults = people.filter((p) => (p.kind ?? "adult") === "adult").length;
  const children = people.filter((p) => p.kind === "child").length;
  const familyMeta =
    people.length > 0
      ? [
          adults ? `${adults} ${adults === 1 ? "adult" : "adults"}` : "",
          children ? `${children} ${children === 1 ? "child" : "children"}` : "",
        ]
          .filter(Boolean)
          .join(", ")
      : `${compDays.length} ${compDays.length === 1 ? "day" : "days"} · ${itin.activities.length} ${itin.activities.length === 1 ? "stop" : "stops"}`;

  const title = opts.client?.trim() || itin.title || opts.tripName || "Your trip";
  const openDay = compDays[todayIndex];
  const homeKicker = tripFinished
    ? `Trip finished · ${compDays.length} ${compDays.length === 1 ? "day" : "days"}`
    : daysUntilStart !== undefined
      ? daysUntilStart === 1
        ? "Leaving tomorrow"
        : `${daysUntilStart} days to go`
      : openDay
        ? `${fmt(days[todayIndex].date, { day: "numeric", month: "long" })} · day ${todayIndex + 1} of ${compDays.length}`
        : `Day 1 of ${compDays.length}`;

  const prefs = [
    who ? { label: "Travelling", value: who } : null,
    itin.dayStartTime ? { label: "Starts each day", value: itin.dayStartTime } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const contact = opts.advisorName?.trim();
  return {
    concierge: false,
    ...(opts.tripId ? { tripId: opts.tripId } : {}),
    advisorName: contact || "White Glove",
    ...(contact ? { contactName: contact } : {}),
    homeTitle: title,
    homeKicker,
    tripTitle: who ? `${itin.title || title} — ${who}` : itin.title || title,
    tripDates: formatRange(itin.startDate, itin.endDate),
    todayIndex,
    tripFinished,
    ...(daysUntilStart !== undefined ? { daysUntilStart } : {}),
    family: who || title,
    familyMeta,
    days: compDays,
    walletGroups: walletGroupsFor(itin),
    prefs,
    guideSections: [],
  };
}
