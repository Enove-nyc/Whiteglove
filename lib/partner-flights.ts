/**
 * Flight results for /book.
 *
 * Stay22's Direct Travel API is accommodations only — there is no flights
 * search to call with STAY22_API_KEY. Kayak flights earn through Stay22 Allez
 * (`/allez/kayak?aid=&link=`), which /go already builds from the Stay22 ID.
 *
 * Travelpayouts Data API can still add a live fare list when
 * TRAVELPAYOUTS_TOKEN is set. It is optional. Without it, this returns an
 * on-site compare row whose View & book is the tracked Kayak search.
 */

import { goHref } from "@/lib/affiliate/request";
import { describeSearch, type SearchShape } from "@/lib/kayak-search";
import { searchTravelpayoutsFlights, travelpayoutsTokenConfigured } from "@/lib/travelpayouts-api";

export type PartnerFlightOption = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  price?: number;
  currency?: string;
  transfers?: number;
  airline?: string;
  bookHref: string;
};

export type PartnerFlightSearch = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  nonstop?: boolean;
  adults?: number;
};

export type PartnerFlightResult =
  | { ok: true; mode: "live"; flights: PartnerFlightOption[]; currency: string; message: string; detail?: string }
  | { ok: true; mode: "compare"; flights: PartnerFlightOption[]; message: string; detail?: string }
  | { ok: false; mode: "unavailable"; message: string; detail?: string };

function iata(value: string): string {
  return value.trim().toUpperCase().slice(0, 3);
}

function shapeFor(search: PartnerFlightSearch): SearchShape {
  const origin = iata(search.origin);
  const destination = iata(search.destination);
  const leg = { from: origin, to: destination, date: search.departDate };
  if (search.returnDate) {
    return { trip: "round-trip", legs: [leg], ret: search.returnDate };
  }
  return { trip: "one-way", legs: [leg] };
}

function compareHref(search: PartnerFlightSearch, origin: string, destination: string, departDate: string, returnDate?: string): string {
  const adults = Math.max(1, Math.min(9, Number(search.adults) || 1));
  return goHref({
    product: "flight",
    legs: [{ from: origin, to: destination, date: departDate }],
    checkOut: returnDate || "",
    adults,
    nonstop: Boolean(search.nonstop),
    page: "/book",
    placement: "book-flights",
  });
}

function compareResult(search: PartnerFlightSearch, origin: string, destination: string): PartnerFlightResult {
  const shape = shapeFor({ ...search, origin, destination });
  const summary = describeSearch(shape);
  return {
    ok: true,
    mode: "compare",
    message: "Compare fares with Kayak.",
    detail: "Prices and booking are on the partner site.",
    flights: [
      {
        id: "flights-kayak",
        title: summary,
        subtitle: "Open the partner search with your route and dates filled in.",
        bookHref: compareHref(search, origin, destination, search.departDate, search.returnDate),
      },
    ],
  };
}

/**
 * Live fares when Travelpayouts is configured; otherwise a Kayak compare row.
 * Never tells the traveller that flights are broken because a token is missing.
 */
export async function searchPartnerFlights(search: PartnerFlightSearch): Promise<PartnerFlightResult> {
  const origin = iata(search.origin);
  const destination = iata(search.destination);
  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    return { ok: false, mode: "unavailable", message: "Choose airports from the list." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(search.departDate)) {
    return { ok: false, mode: "unavailable", message: "Choose a departure date." };
  }
  if (search.returnDate && (!/^\d{4}-\d{2}-\d{2}$/.test(search.returnDate) || search.returnDate <= search.departDate)) {
    return { ok: false, mode: "unavailable", message: "Return date must be after departure." };
  }

  if (travelpayoutsTokenConfigured()) {
    const live = await searchTravelpayoutsFlights({
      origin,
      destination,
      departDate: search.departDate,
      returnDate: search.returnDate,
      nonstop: search.nonstop,
    });
    if (live.ok && live.flights.length > 0) {
      return {
        ok: true,
        mode: "live",
        currency: live.currency,
        message: live.message,
        flights: live.flights.map((flight) => ({
          id: flight.id,
          title: flight.airline ? flight.airline.toUpperCase() : "Flight option",
          subtitle: flight.summary,
          meta: flight.transfers === 0 ? "Nonstop" : flight.transfers === 1 ? "1 stop" : `${flight.transfers} stops`,
          price: flight.price,
          currency: flight.currency,
          transfers: flight.transfers,
          airline: flight.airline,
          bookHref: compareHref(search, flight.origin, flight.destination, flight.departDate, flight.returnDate),
        })),
      };
    }
  }

  return compareResult(search, origin, destination);
}
