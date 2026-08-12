/**
 * Same-origin addresses for the partner search widgets on /book.
 *
 * THE MARKER IS NOT HERE. BookPartners is a client component; anything it
 * imports is in the page source. The Travelpayouts script URL carries the
 * marker, so that URL is built on the embed pages (server-only) rather than
 * handed down as a prop. These paths are only our own /embed routes plus the
 * traveller's airports and dates.
 */

import { usableFlightDates } from "@/lib/date-range";

export type FlightWidgetQuery = {
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  oneWay?: boolean;
  adults?: number;
  nonstop?: boolean;
};

export type CarWidgetQuery = {
  location?: string;
  pickup?: string;
  dropoff?: string;
};

function iata(value: string | undefined): string {
  const code = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function iso(value: string | undefined): string {
  const date = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function adults(value: number | undefined): string {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return "";
  return String(Math.min(9, n));
}

/** /embed/flights with the route the widget should open on, when we have one. */
export function flightsEmbedPath(query: FlightWidgetQuery = {}): string {
  const params = new URLSearchParams();
  const origin = iata(query.origin);
  const destination = iata(query.destination);
  const { departDate: depart, returnDate: back } = usableFlightDates(
    query.departDate,
    query.oneWay ? "" : query.returnDate,
  );
  if (origin) params.set("origin", origin);
  if (destination) params.set("destination", destination);
  if (depart) params.set("depart", depart);
  if (back) params.set("return", back);
  if (query.oneWay) params.set("one_way", "true");
  const n = adults(query.adults);
  if (n) params.set("adults", n);
  if (query.nonstop) params.set("nonstop", "true");
  const qs = params.toString();
  return qs ? `/embed/flights?${qs}` : "/embed/flights";
}

/** /embed/cars. Location is a city name when the destination pages sent one. */
export function carsEmbedPath(query: CarWidgetQuery = {}): string {
  const params = new URLSearchParams();
  const location = (query.location ?? "").trim().slice(0, 80);
  if (location && !/^https?:/i.test(location)) params.set("location", location);
  const pickup = iso(query.pickup);
  const dropoff = iso(query.dropoff);
  if (pickup) params.set("pickup", pickup);
  if (dropoff) params.set("dropoff", dropoff);
  const qs = params.toString();
  return qs ? `/embed/cars?${qs}` : "/embed/cars";
}
