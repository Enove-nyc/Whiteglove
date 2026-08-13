/**
 * Flight results for /book.
 *
 * Stay22's Direct Travel API is accommodations only — there is no flights
 * search to call with STAY22_API_KEY. Kayak flights earn through Stay22 Allez
 * (`/allez/kayak?aid=&link=`), which /go already builds from the Stay22 ID.
 *
 * Travelpayouts Flight Search API lists live Aviasales offers when the
 * account is approved. A priced row opens THAT offer. Kayak is a separate
 * compare row with no dollar amount. Never mix a Travelpayouts price with a
 * Stay22 Kayak URL. The Data API cheapest-cache is not this board.
 */

import { airlineHeading, airlineLogoUrl } from "@/lib/airline-names";
import { goHref } from "@/lib/affiliate/request";
import { flightDateProblem } from "@/lib/date-range";
import { isPricedFlightHref } from "@/lib/flight-book-href";
import { describeSearch, searchProblem, type Leg, type SearchShape } from "@/lib/kayak-search";
import { travelpayoutsTokenConfigured, type TravelpayoutsFlightOption } from "@/lib/travelpayouts-api";
import { searchLiveAviasalesFlights } from "@/lib/travelpayouts-search";

export type PartnerFlightOption = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  /** Honest stop/layover copy. Empty when there is nothing real to say. */
  stopDetail?: string;
  /** Aviasales CDN mark for the IATA code, or "". */
  logoUrl?: string;
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
  /** Multi-city legs in flight order. When two or more, this is the journey. */
  legs?: Leg[];
  nonstop?: boolean;
  adults?: number;
  userIp?: string;
};

export type PartnerFlightResult =
  | { ok: true; mode: "live"; flights: PartnerFlightOption[]; currency: string; message: string; detail?: string; kayakHref: string }
  | { ok: true; mode: "compare"; flights: PartnerFlightOption[]; message: string; detail?: string; kayakHref: string }
  | { ok: false; mode: "unavailable"; message: string; detail?: string };

function iata(value: string): string {
  return value.trim().toUpperCase().slice(0, 3);
}

function codedLegs(search: PartnerFlightSearch, origin: string, destination: string): Leg[] {
  const many = (search.legs ?? [])
    .map((leg) => ({ from: iata(leg.from), to: iata(leg.to), date: leg.date }))
    .filter((leg) => /^[A-Z]{3}$/.test(leg.from) && /^[A-Z]{3}$/.test(leg.to) && /^\d{4}-\d{2}-\d{2}$/.test(leg.date));
  if (many.length >= 2) return many;
  return [{ from: origin, to: destination, date: search.departDate }];
}

function isMultiCity(search: PartnerFlightSearch): boolean {
  return (search.legs?.length ?? 0) >= 2;
}

function shapeFor(search: PartnerFlightSearch): SearchShape {
  const origin = iata(search.origin);
  const destination = iata(search.destination);
  const legs = codedLegs(search, origin, destination);
  if (isMultiCity(search) && legs.length >= 2) {
    return { trip: "multi-city", legs };
  }
  const leg = legs[0] ?? { from: origin, to: destination, date: search.departDate };
  if (search.returnDate) {
    return { trip: "round-trip", legs: [leg], ret: search.returnDate };
  }
  return { trip: "one-way", legs: [leg] };
}

function compareHref(search: PartnerFlightSearch, origin: string, destination: string, departDate: string, returnDate?: string): string {
  const adults = Math.max(1, Math.min(9, Number(search.adults) || 1));
  const legs = codedLegs(search, origin, destination);
  return goHref({
    product: "flight",
    legs,
    checkOut: isMultiCity(search) ? "" : returnDate || "",
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

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
}

/**
 * Stop copy for a cached cheapest-fare row.
 *
 * prices_for_dates has a transfer count and sometimes a total duration. It
 * does not list layover cities or wait times. Saying "somewhere" would be
 * invented; the offer on Aviasales is where that itinerary lives.
 */
export function stopDetailFromFare(transfers: number, durationMinutes?: number): string {
  if (transfers <= 0) return "";
  const count = transfers === 1 ? "1 stop" : `${transfers} stops`;
  const total =
    durationMinutes && durationMinutes > 0 ? ` Total time on this cached fare is ${formatDuration(durationMinutes)}.` : "";
  return `${count} on this cached fare. The layover city and wait times are not in this dump — they are on the offer when you open it.${total}`;
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
    message: "No priced flights for those dates on White Glove.",
    detail: "Nothing is invented here. Search opens with Aviasales; compare more on Kayak.",
    flights: [],
    kayakHref: compareHref(search, origin, destination, search.departDate, search.returnDate),
  };
}

/** A priced Travelpayouts fare, or null when it has no matching booking URL. */
export function liveRowFromFare(flight: TravelpayoutsFlightOption): PartnerFlightOption | null {
  if (!isPricedFlightHref(flight.bookUrl)) return null;
  const title = airlineHeading(flight.airline, flight.airlineName);
  const logoUrl = airlineLogoUrl(flight.airline);
  const stopDetail = flight.stopDetail?.trim() || stopDetailFromFare(flight.transfers, flight.durationMinutes);
  return {
    id: flight.id,
    title,
    subtitle: flight.summary,
    meta: stopsLabel(flight.transfers),
    stopDetail: stopDetail || undefined,
    logoUrl: logoUrl || undefined,
    price: flight.price,
    currency: flight.currency,
    transfers: flight.transfers,
    airline: flight.airline,
    bookHref: flight.bookUrl,
    network: "travelpayouts",
  };
}

/**
 * Live fares from the Flight Search API. The cheapest-cache dump is not the
 * board — that is why Aviasales can show 50+ and this page used to show 2.
 * A gated or empty search is an honest miss (Aviasales / Kayak), never invented rows.
 */
export async function searchPartnerFlights(search: PartnerFlightSearch): Promise<PartnerFlightResult> {
  const origin = iata(search.origin);
  const destination = iata(search.destination);
  const legs = codedLegs(search, origin, destination);

  if (isMultiCity(search) && legs.length >= 2) {
    const problem = searchProblem({ trip: "multi-city", legs });
    if (problem) return { ok: false, mode: "unavailable", message: problem };
  } else {
    if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
      return { ok: false, mode: "unavailable", message: "Choose airports from the list." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(search.departDate)) {
      return { ok: false, mode: "unavailable", message: "Choose a departure date." };
    }
    if (search.returnDate && (!/^\d{4}-\d{2}-\d{2}$/.test(search.returnDate) || search.returnDate < search.departDate)) {
      return { ok: false, mode: "unavailable", message: "Return date must be after departure." };
    }
    const past = flightDateProblem(search.departDate, search.returnDate);
    if (past) return { ok: false, mode: "unavailable", message: past };
  }

  const directions =
    isMultiCity(search) && legs.length >= 2
      ? legs.map((leg) => ({ origin: leg.from, destination: leg.to, date: leg.date }))
      : search.returnDate
        ? [
            { origin, destination, date: search.departDate },
            { origin: destination, destination: origin, date: search.returnDate },
          ]
        : [{ origin, destination, date: search.departDate }];

  if (travelpayoutsTokenConfigured()) {
    const live = await searchLiveAviasalesFlights({
      directions,
      nonstop: search.nonstop,
      adults: search.adults,
      userIp: search.userIp,
    });
    if (live.ok) {
      const priced = live.flights.map(liveRowFromFare).filter((row): row is PartnerFlightOption => row != null);
      if (priced.length > 0) {
        return {
          ok: true,
          mode: "live",
          currency: live.currency,
          message: live.message,
          detail: "A listed price opens that Aviasales offer. Compare more fares on Kayak without a listed price.",
          flights: priced,
          kayakHref: compareHref(search, origin, destination, search.departDate, search.returnDate),
        };
      }
    }
  }

  const kayakOrigin = legs[0]?.from || origin;
  const kayakDest = isMultiCity(search) ? legs[0]?.to || destination : destination;
  return compareResult({ ...search, origin: kayakOrigin, destination: kayakDest, departDate: legs[0]?.date || search.departDate }, kayakOrigin, kayakDest);
}
