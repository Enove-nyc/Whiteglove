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

export type FlightLeg = {
  id: string;
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

/** A short label for a saved itinerary in a list. */
export function flightItineraryLabel(itinerary: FlightItinerary): string {
  return itinerary.title || itinerary.passengers || "Untitled flight itinerary";
}
