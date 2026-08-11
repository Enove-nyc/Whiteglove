// Reading a real flight schedule into the shape the planner uses.
//
// Kept apart from the API route so the part that can be wrong — which airport
// is the destination, which day it lands, how long the connection is — can be
// tested against real schedule shapes instead of only being watched in a
// browser with a live key.
//
// Nothing here invents a flight. Given nothing usable it returns null, and the
// route says so rather than filling the form with a guess.

export type LookupStop = { airport: string; arriveTime?: string; departTime?: string; overnight?: boolean };

export type LookupFlight = {
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  date: string;
  departTime: string;
  arriveTime: string;
  /** Set only when it lands on a later day than it left. */
  arriveDate: string;
  /**
   * Connections along the way, in order. Empty for a direct flight.
   *
   * Always empty today: AeroDataBox reports one leg at a time, so a flight
   * number covering JFK–CDG–TLV comes back as separate flights rather than
   * one with a stopover. The field stays because the planner reads it and a
   * provider that does report the whole journey would fill it.
   */
  stops: LookupStop[];
};

/** "2024-05-02 00:50+03:00" or "2024-05-02T00:50:00+03:00" → date + HH:MM. */
export function parseLocal(value?: string): { date: string; time: string } | null {
  if (!value || value.length < 16) return null;
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  return { date, time };
}
