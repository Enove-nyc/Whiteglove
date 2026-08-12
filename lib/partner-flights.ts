/**
 * Flight results for /book.
 *
 * Stay22's Direct Travel API is accommodations only — there is no flights
 * search to call with STAY22_API_KEY. Kayak flights earn through Stay22 Allez
 * (`/allez/kayak?aid=&link=`), which /go already builds from the Stay22 ID.
 *
 * Travelpayouts Data API can add cached fares when TRAVELPAYOUTS_TOKEN is set.
 * A priced row must open THAT fare's Aviasales link (marker on the URL).
 * Kayak is a separate compare row with no dollar amount. Never mix a
 * Travelpayouts price with a Stay22 Kayak URL.
 */

import { airlineHeading } from "@/lib/airline-names";
import { goHref } from "@/lib/affiliate/request";
import { describeSearch, type SearchShape } from "@/lib/kayak-search";
import { searchTravelpayoutsFlights, travelpayoutsTokenConfigured, type TravelpayoutsFlightOption } from "@/lib/travelpayouts-api";

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
  /** Who the click earns through. Must match the URL behind View & book. */
  network: "travelpayouts" | "stay22";
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

function stopsLabel(transfers: number): string {
  if (transfers === 0) return "Nonstop";
  if (transfers === 1) return "1 stop";
  return `${transfers} stops`;
}

export function kayakCompareRow(search: PartnerFlightSearch, origin: string, destination: string): PartnerFlightOption {
  const shape = shapeFor({ ...search, origin, destination });
  return {
    id: "flights-kayak",
    title: describeSearch(shape),
    subtitle: "Compare fares on Kayak. Prices are shown there, not here.",
    bookHref: compareHref(search, origin, destination, search.departDate, search.returnDate),
    network: "stay22",
  };
}

function compareResult(search: PartnerFlightSearch, origin: string, destination: string): PartnerFlightResult {
  return {
    ok: true,
    mode: "compare",
    message: "Compare fares with Kayak.",
    detail: "Prices and booking are on the partner site.",
    flights: [kayakCompareRow(search, origin, destination)],
  };
}

/** A priced Travelpayouts fare, or null when it has no matching booking URL. */
export function liveRowFromFare(flight: TravelpayoutsFlightOption): PartnerFlightOption | null {
  if (!flight.bookUrl || !flight.bookUrl.startsWith("https://")) return null;
  try {
    const host = new URL(flight.bookUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "aviasales.com") return null;
  } catch {
    return null;
  }
  const title = airlineHeading(flight.airline, flight.airlineName);
  return {
    id: flight.id,
    title,
    subtitle: flight.summary,
    meta: stopsLabel(flight.transfers),
    price: flight.price,
    currency: flight.currency,
    transfers: flight.transfers,
    airline: flight.airline,
    bookHref: flight.bookUrl,
    network: "travelpayouts",
  };
}

/**
 * Live fares when Travelpayouts is configured; otherwise a Kayak compare row.
 * Never tells the traveller that flights are broken because a token is missing.
 * Never attaches a Travelpayouts price to a Kayak URL.
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
  if (search.returnDate && (!/^\d{4}-\d{2}-\d{2}$/.test(search.returnDate) || search.returnDate < search.departDate)) {
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
    if (live.ok) {
      const priced = live.flights.map(liveRowFromFare).filter((row): row is PartnerFlightOption => row != null);
      if (priced.length > 0) {
        return {
          ok: true,
          mode: "live",
          currency: live.currency,
          message: live.message,
          detail: live.nearbyReturn
            ? "A listed price opens that offer — check the return date. Compare your exact dates on Kayak without a listed price."
            : "A listed price opens that offer. Compare more fares on Kayak without a listed price.",
          flights: [...priced, kayakCompareRow(search, origin, destination)],
        };
      }
    }
  }

  return compareResult(search, origin, destination);
}
