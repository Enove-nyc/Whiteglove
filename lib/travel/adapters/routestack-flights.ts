/**
 * RouteStack, for flights — the first inventory the flight category has had.
 *
 * WHAT WAS THERE BEFORE. Nothing, through this seam. Duffel answers behind its
 * admin guard and Travelpayouts sends people to partners from /book, and both
 * keep doing exactly that; but ADAPTERS.flight was an empty list, so the
 * comparison screen could not ask anybody about a flight at all.
 *
 * STILL A HAND-OFF, NOT A BOOKING. Their flight flow ends the same way their
 * car flow does — /mcp/flight/get-payment-url, their checkout, their merchant
 * of record, a share to us. So `deep-link`, and no booking method, deliberately.
 *
 * THEIR PRICE IS ALREADY OURS. `totalFare` is the fare and tax; `ourprice` is
 * that plus their margin and merchant fee, and it is the number a traveler
 * would pay. That is the one quoted here — quoting totalFare would show a
 * price nobody can buy.
 *
 * A FLIGHT NEEDS TWO ENDS. Everything else on this site searches a single
 * destination, so a flight search with no origin is not an incomplete request
 * to be guessed at — it is a question this provider cannot be asked, and it
 * returns nothing rather than inventing a departure city.
 */

import { routestackAirportCode, routestackConfig, routestackPost } from "@/lib/travel/adapters/routestack-auth";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { SearchQuery, TravelOffer } from "@/lib/travel/types";

type RouteStackLeg = {
  airline?: string;
  cabin?: string;
  departure?: string;
  departurelocation?: string;
  arrival?: string;
  arrivallocation?: string;
  departureTime?: string;
  arrivalTime?: string;
  flightCode?: string;
  flightNumber?: string;
  fareFamily?: string;
  /** 0 is the way out, 1 is the way home. */
  legindicator?: number;
};

type RouteStackFare = {
  stops?: number;
  flights?: RouteStackLeg[];
  fareSourceCode?: string;
  ourprice?: number;
  showOurprice?: number;
  totalFare?: number;
  penaltydetails?: Array<{ refundAllowed?: boolean; changeAllowed?: boolean }>;
};

const codeCache = new Map<string, string>();

/** Their search wants IATA. A three-letter term already is one. */
async function iata(
  config: NonNullable<ReturnType<typeof routestackConfig>>,
  term: string,
  signal: AbortSignal,
): Promise<string | null> {
  const trimmed = term.trim();
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
  const key = trimmed.toLowerCase();
  const cached = codeCache.get(key);
  if (cached) return cached;
  const code = await routestackAirportCode(config, trimmed, signal);
  if (code) codeCache.set(key, code);
  return code;
}

export function routestackFlightsConfigured(): boolean {
  return Boolean(routestackConfig());
}

export const routestackFlights: ProviderSearch = {
  id: "routestack",
  category: "flight",
  configured: routestackFlightsConfigured,

  async search(query: SearchQuery, signal: AbortSignal): Promise<TravelOffer[]> {
    const config = routestackConfig();
    if (!config) throw new Error("not configured");
    if (!query.origin?.trim()) return [];

    const [origin, destination] = await Promise.all([
      iata(config, query.origin, signal),
      iata(config, query.destination, signal),
    ]);
    // An airport they do not know is an empty answer, not a failure.
    if (!origin || !destination) return [];

    const roundTrip = Boolean(query.endDate && query.endDate > query.startDate);
    const tripType = roundTrip ? "ROUND_TRIP" : "ONE_WAY";
    const data = await routestackPost<{ result?: RouteStackFare[]; currency?: string }>(
      config,
      "/mcp/flight/search",
      {
        origin,
        destination,
        departureDate: query.startDate,
        ...(roundTrip ? { returnDate: query.endDate } : {}),
        adults: Math.max(1, query.adults ?? 1),
        ...(query.children ? { children: query.children } : {}),
        cabin: "Economy",
        // They read both, and their own example sends both.
        tripType,
        type: tripType,
      },
      signal,
      15000,
    );

    const currency = data.currency ?? query.currency ?? "USD";
    // Their sandbox answers a European route with well over a hundred fares.
    // The comparison screen wants the cheapest few, not a phone book, and the
    // search layer is not a place to paginate.
    const fares = (data.result ?? []).slice(0, 25);

    return fares.map((fare, index): TravelOffer => {
      const legs = fare.flights ?? [];
      const outbound = legs.filter((leg) => (leg.legindicator ?? 0) === 0);
      const first = outbound[0] ?? legs[0];
      const last = outbound[outbound.length - 1] ?? legs[legs.length - 1];
      const amount = fare.ourprice ?? fare.showOurprice;
      // Every passenger type on the fare must allow a refund before this says
      // so; one that does not is the one that matters.
      const penalties = fare.penaltydetails ?? [];
      const refundable = penalties.length ? penalties.every((p) => p.refundAllowed === true) : "unknown";

      return {
        id: `routestack-flight-${index}`,
        category: "flight",
        headline: [first?.departure, last?.arrival].filter(Boolean).join(" → ") || "Flight",
        detail:
          [
            first?.airline,
            first?.departureTime ? first.departureTime.slice(11, 16) : "",
            roundTrip ? "return" : "one way",
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
        price: typeof amount === "number" ? { amount, currency } : undefined,
        fulfilment: "deep-link",
        meta: {
          provider: "routestack",
          // Their fare code is what a later revalidate or checkout call needs,
          // and it is long; the index alone would not identify a fare to them.
          providerOfferId: fare.fareSourceCode?.slice(0, 40) ?? String(index),
          refundable,
          cabin: first?.cabin ?? first?.fareFamily,
          // Stops on the way out. A return leg's stops are its own business and
          // are not added in, which would read as a worse outbound than it is.
          stops: Math.max(0, outbound.length - 1),
          airline: first?.airline,
          commission: { model: "share", note: "RouteStack is merchant of record." },
        },
      };
    });
  },
};
