/**
 * Who runs a search on /book.
 *
 * Public visitors are handed to booking partners (Stay22, Travelpayouts, and
 * the other affiliate links). Duffel is a real booking engine: it takes a
 * card, issues a ticket, and creates an obligation a referral link does not.
 * That flow lives in the admin only (`/admin/duffel`). No environment flag
 * can put it on the public site — not DUFFEL_FLIGHTS, not DUFFEL_STAYS, not
 * the presence of a token.
 */

import { inspectDuffelToken } from "@/lib/duffel-token";

export type FlightsVia = "kayak";
export type HotelsVia = "booking";

/**
 * DUFFEL IS OFF THE PUBLIC SITE.
 *
 * `publicFlightsVia` and `publicHotelsVia` cannot return Duffel — not by
 * configuration, not by accident. `flightsVia` / `hotelsVia` used to honour
 * DUFFEL_FLIGHTS=1 and DUFFEL_STAYS=1; those flags are ignored so a leftover
 * variable cannot move visitor bookings.
 */
export function publicFlightsVia(): "kayak" {
  return "kayak";
}

export function publicHotelsVia(): "booking" {
  return "booking";
}

/** Whether the admin's Duffel tools have a real token (not a placeholder). */
export function duffelReady(env: { DUFFEL_ACCESS_TOKEN?: string }): boolean {
  return inspectDuffelToken(env.DUFFEL_ACCESS_TOKEN).ready;
}

/**
 * Where a public flight search goes. Always the partner. The env argument is
 * accepted so old call sites keep compiling; it cannot change the answer.
 */
export function flightsVia(_env?: {
  DUFFEL_ACCESS_TOKEN?: string;
  DUFFEL_FLIGHTS?: string;
}): FlightsVia {
  return "kayak";
}

/**
 * Where a public hotel search goes. Always the partner.
 */
export function hotelsVia(_env?: {
  DUFFEL_ACCESS_TOKEN?: string;
  DUFFEL_STAYS?: string;
}): HotelsVia {
  return "booking";
}

/**
 * What to say in the admin about where visitor searches go.
 */
export function describeFlights(_via?: FlightsVia): string {
  return "Visitors compare and pay with booking partners on /book. Duffel cannot be turned on for the public site. Search and ticketing stay in the admin at /admin/duffel.";
}

export function describeHotels(_via?: HotelsVia): string {
  return "Visitors compare and pay with booking partners on /book. Duffel Stays cannot be turned on for the public site. Admin stay search, when Duffel has approved it, is at /admin/duffel.";
}
