/**
 * Flight-only itineraries the owner builds by hand.
 *
 * These are the flights he sells privately — real airlines, real flight
 * numbers, real confirmation codes — written up as one clean page to send a
 * customer. That is deliberately a different thing from the public
 * /sample-itinerary, which withholds any airline or confirmation code because
 * it prints a shape, not a booking. Here the booking is the point.
 *
 * A flight itinerary is a handful of short strings and a list of legs. No
 * relations and no query beyond "show me this one" or "list them all", so it
 * lives as a JSON value in the same private Upstash store as the rest of the
 * owner-editable settings (see lib/flight-itinerary-store.ts), not as a Prisma
 * table.
 */

import { randomBytes } from "crypto";

/** Which half of a round trip a flight belongs to. */
export type FlightDirection = "outbound" | "return";

/**
 * How this flight follows the one before it, when the two make a connection:
 *  - "airline"  — one ticket, the airline protects the connection and checks
 *                 bags through (what a traveller calls a stopover on one fare);
 *  - "separate" — two separately-booked tickets, a self-transfer, where the
 *                 risk of a missed connection is the traveller's.
 * Absent means "say it is a connection, claim nothing about who booked it" —
 * the way the page behaved before this choice existed.
 */
export type FlightConnectionType = "airline" | "separate";

export type FlightLeg = {
  id: string;
  /**
   * Outbound or return. Optional so an itinerary saved before this existed
   * still reads — a leg with no direction is treated as outbound everywhere.
   */
  direction?: FlightDirection;
  /**
   * For a flight that connects from the one before it, how that connection is
   * booked. Optional and only meaningful when the two legs actually connect.
   */
  connectionType?: FlightConnectionType;
  /** "El Al", "United" — the carrier the customer boards. */
  airline: string;
  /** "LY 315" — carrier code and number as it reads on the ticket. */
  flightNumber: string;
  /** Where it leaves from, however the owner wants it to read: "JFK — New York". */
  from: string;
  /** Where it lands: "TLV — Tel Aviv". */
  to: string;
  /** ISO date, "2026-09-01". */
  departDate: string;
  /** "23:40", local to the departure airport. Free text — kept as typed. */
  departTime: string;
  /** ISO date the flight lands, which may be the next day. */
  arriveDate: string;
  arriveTime: string;
  /** "Economy", "Business" — optional. */
  cabin: string;
  /** The airline confirmation / booking reference — optional. */
  confirmation: string;
  /** Anything else about this leg: seats, terminal, layover — optional. */
  notes: string;
};

export type FlightItinerary = {
  id: string;
  /** The address of the customer-facing page: /f/<shareId>. */
  shareId: string;
  /** A name for this itinerary, "Cohen family — Sukkos flights". Optional. */
  title: string;
  /** Who is travelling, as free text. Optional. */
  passengers: string;
  /** An overall booking reference, if there is one for the whole trip. Optional. */
  reference: string;
  legs: FlightLeg[];
  /** A closing note for the customer. Optional. */
  notes: string;
  /** ISO timestamp, for ordering newest first. */
  createdAt: string;
};

/** What the form sends: everything a person types, before it is given an id. */
export type FlightItineraryInput = {
  title: string;
  passengers: string;
  reference: string;
  notes: string;
  legs: Array<Omit<FlightLeg, "id">>;
};

const trimField = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** A leg the customer would find useful needs, at least, where it goes and when. */
function legIsUsable(leg: Omit<FlightLeg, "id">): boolean {
  return Boolean(trimField(leg.from) && trimField(leg.to) && trimField(leg.departDate));
}

/**
 * The first thing wrong with an itinerary, in words the owner can act on, or
 * null when it is ready to save. Kept lenient on purpose: he is transcribing a
 * real booking, so the tool should not argue with him about a missing seat
 * number — only about the two things a flight page cannot do without, a name
 * for it and at least one leg that says where it goes and when.
 */
export function flightItineraryProblem(input: FlightItineraryInput): string | null {
  const named = trimField(input.title) || trimField(input.passengers);
  if (!named) return "Give it a name or a passenger, so you can tell it apart later.";

  const usable = input.legs.filter(legIsUsable);
  if (usable.length === 0) {
    return "Add at least one flight with a from, a to and a departure date.";
  }
  return null;
}

const newId = (bytes: number) => randomBytes(bytes).toString("base64url");

/** Turn typed input into a stored itinerary — dropping legs too empty to show. */
export function flightItineraryFromInput(input: FlightItineraryInput): FlightItinerary {
  const legs: FlightLeg[] = input.legs
    .filter(legIsUsable)
    .map((leg) => ({
      id: newId(6),
      direction: leg.direction === "return" ? "return" : "outbound",
      connectionType:
        leg.connectionType === "airline" || leg.connectionType === "separate" ? leg.connectionType : undefined,
      airline: trimField(leg.airline),
      flightNumber: trimField(leg.flightNumber),
      from: trimField(leg.from),
      to: trimField(leg.to),
      departDate: trimField(leg.departDate),
      departTime: trimField(leg.departTime),
      arriveDate: trimField(leg.arriveDate),
      arriveTime: trimField(leg.arriveTime),
      cabin: trimField(leg.cabin),
      confirmation: trimField(leg.confirmation),
      notes: trimField(leg.notes),
    }));

  return {
    id: newId(6),
    shareId: newId(9), // ~12 url-safe chars, matches the site's other share links
    title: trimField(input.title),
    passengers: trimField(input.passengers),
    reference: trimField(input.reference),
    notes: trimField(input.notes),
    legs,
    createdAt: new Date().toISOString(),
  };
}

/**
 * A date as a customer reads it: "Mon 1 Sep 2026". Falls back to the raw
 * string if it is not an ISO date, so nothing a person typed is ever swallowed.
 */
export function formatFlightDate(iso: string): string {
  const value = trimField(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** True when the flight lands on a later date than it left — worth flagging. */
export function landsNextDay(leg: FlightLeg): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(leg.departDate) || !/^\d{4}-\d{2}-\d{2}$/.test(leg.arriveDate)) {
    return false;
  }
  return leg.arriveDate > leg.departDate;
}

/** An airport string reduced to something two legs can be compared on. */
function normalizeAirport(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** ms since epoch for an ISO date and an HH:MM time, or null if either is unusable. */
function parseWhen(date: string, time: string): number | null {
  const day = date.trim();
  const clock = time.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{1,2}:\d{2}$/.test(clock)) return null;
  const value = new Date(`${day}T${clock.padStart(5, "0")}:00`);
  const ms = value.getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** A gap in minutes as "2h 15m", "45m", "3h", or "1d 4h" once it runs to days. */
function formatDuration(minutes: number): string {
  const whole = Math.round(minutes);
  if (whole >= 24 * 60) {
    const days = Math.floor(whole / (24 * 60));
    const hours = Math.floor((whole % (24 * 60)) / 60);
    return hours ? `${days}d ${hours}h` : `${days}d`;
  }
  const hours = Math.floor(whole / 60);
  const mins = whole % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

/** The wait between two legs as text, when both times are known; else null. */
function layoverText(prev: FlightLeg, next: FlightLeg): string | null {
  const arrive = parseWhen(prev.arriveDate, prev.arriveTime);
  const depart = parseWhen(next.departDate, next.departTime);
  if (arrive === null || depart === null) return null;
  const minutes = (depart - arrive) / 60000;
  if (minutes < 0) return null; // a mistyped time, not a real wait
  return formatDuration(minutes);
}

export type Connection = {
  /** The airport the traveller changes at, as the arriving leg wrote it. */
  airport: string;
  /** How long the layover is, when both times are known; otherwise null. */
  layover: string | null;
};

/**
 * Whether one leg connects to the next, and the layover if so.
 *
 * Two legs connect when the first lands where the second leaves from and the
 * gap between them is short. The short-gap test is what tells a connection
 * apart from a return flight weeks later out of the same airport: same airport,
 * but days between, so not a connection. Both times are in the connecting
 * airport's own local clock, so the gap is a true wait — no timezone maths.
 *
 * When the times are not both filled in, it falls back to "same airport, same
 * day" and reports the connection without a duration.
 */
export function connectionBetween(prev: FlightLeg, next: FlightLeg): Connection | null {
  const airport = normalizeAirport(prev.to);
  if (!airport || airport !== normalizeAirport(next.from)) return null;

  const arrive = parseWhen(prev.arriveDate, prev.arriveTime);
  const depart = parseWhen(next.departDate, next.departTime);
  if (arrive !== null && depart !== null) {
    const minutes = (depart - arrive) / 60000;
    // A negative gap is a mistyped time; more than a day is a separate journey.
    if (minutes < 0 || minutes > 24 * 60) return null;
    return { airport: prev.to.trim(), layover: formatDuration(minutes) };
  }

  if (prev.arriveDate.trim() && prev.arriveDate.trim() === next.departDate.trim()) {
    return { airport: prev.to.trim(), layover: null };
  }
  return null;
}

export type ConnectionInfo = {
  /** The airport the traveller changes at. */
  airport: string;
  /** The wait, when both times are known; otherwise null. */
  layover: string | null;
  /**
   * How the connection is booked:
   *  - "airline"  — one ticket, protected, bags through;
   *  - "separate" — two tickets, a self-transfer, the traveller's risk;
   *  - "auto"     — detected from matching airports, no booking claim.
   */
  kind: FlightConnectionType | "auto";
};

/**
 * The connection between one leg and the next, ready for the page to show.
 *
 * When the owner has marked how a flight is booked ("airline" or "separate"),
 * that is taken at his word — the connecting airport is where the last leg
 * landed, and the wait is shown when the times allow it, however long. When he
 * has marked nothing, it falls back to connectionBetween(), which only calls it
 * a connection when the airports match and the gap is short. Either way, no
 * mark and no match means no connection line at all.
 */
export function connectionInfo(prev: FlightLeg, next: FlightLeg): ConnectionInfo | null {
  if (next.connectionType === "airline" || next.connectionType === "separate") {
    const airport = prev.to.trim() || next.from.trim();
    return { airport, layover: layoverText(prev, next), kind: next.connectionType };
  }
  const auto = connectionBetween(prev, next);
  return auto ? { airport: auto.airport, layover: auto.layover, kind: "auto" } : null;
}

/** A short label for a saved itinerary in a list. */
export function flightItineraryLabel(itinerary: FlightItinerary): string {
  return itinerary.title || itinerary.passengers || "Untitled flight itinerary";
}

/**
 * The legs split into the outbound journey and the return journey, each kept
 * in the order they were saved. A leg with no direction counts as outbound, so
 * an itinerary saved before return flights existed comes out unchanged.
 */
export function splitByDirection(legs: FlightLeg[]): { outbound: FlightLeg[]; returning: FlightLeg[] } {
  const outbound: FlightLeg[] = [];
  const returning: FlightLeg[] = [];
  for (const leg of legs) {
    if (leg.direction === "return") returning.push(leg);
    else outbound.push(leg);
  }
  return { outbound, returning };
}
