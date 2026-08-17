/**
 * Duffel, for flights — the one that was deliberately left out, brought in.
 *
 * WHY IT WAS LEFT OUT, AND WHY THAT NO LONGER APPLIES. The note in engine.ts
 * said wrapping a working public path is the one change here that could break
 * something a visitor uses today. Duffel's path is not public: /api/flights/
 * search is behind duffelRefusal, admin only. So this adapter reads the same
 * account through the same official headers and changes nothing about that
 * route, which keeps answering exactly as it did — its validation, its error
 * explanations, its multi-city slices, its whole-city note. Nothing here is
 * routed through it and nothing there calls this.
 *
 * SEARCH ONLY. Duffel is a real booking API and this adapter still cannot
 * book — the port has one verb. What that means in practice is that Duffel's
 * offers are quoted here for comparison, and an actual purchase would go
 * through Duffel's own flow with its own confirmation, never through this seam.
 * `api-booking` records what Duffel IS, not something this file does.
 *
 * A DUFFEL OFFER GOES STALE. They send expires_at, and it is short. It is
 * carried onto the offer so that a comparison screen showing a Duffel price
 * beside a RouteStack one is not quietly comparing a live quote against a dead
 * one.
 */

import { duffelApiHeaders, DUFFEL_API_ORIGIN } from "@/lib/duffel-api";
import { duffelBearer } from "@/lib/duffel-token";
import { resolveEndpoint } from "@/lib/flight-endpoint";
import { providerFetch } from "@/lib/travel/search";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { SearchQuery, TravelOffer } from "@/lib/travel/types";

type DuffelCarrier = { name?: string; iata_code?: string };
type DuffelSegment = {
  origin?: { iata_code?: string };
  destination?: { iata_code?: string };
  departing_at?: string;
  marketing_carrier?: DuffelCarrier;
  operating_carrier?: DuffelCarrier;
};
type DuffelOffer = {
  id: string;
  total_amount?: string;
  total_currency?: string;
  expires_at?: string;
  cabin_class?: string;
  conditions?: { refund_before_departure?: { allowed?: boolean } | null };
  slices?: Array<{ segments?: DuffelSegment[] }>;
};

export function duffelFlightsConfigured(): boolean {
  return duffelBearer().ok;
}

export const duffelFlights: ProviderSearch = {
  id: "duffel",
  category: "flight",
  configured: duffelFlightsConfigured,

  async search(query: SearchQuery, signal: AbortSignal): Promise<TravelOffer[]> {
    const access = duffelBearer();
    if (!access.ok) throw new Error("not configured");
    if (!query.origin?.trim()) return [];

    // The same resolver the flight page uses, so "London" searches all five
    // London airports here too rather than one picked silently.
    const from = resolveEndpoint(query.origin);
    const to = resolveEndpoint(query.destination);
    // Somewhere Duffel has no airport for is an empty answer, not a failure.
    if (!from || !to) return [];

    const slices = [
      { origin: from.code, destination: to.code, departure_date: query.startDate },
      ...(query.endDate && query.endDate > query.startDate
        ? [{ origin: to.code, destination: from.code, departure_date: query.endDate }]
        : []),
    ];

    const response = await providerFetch(`${DUFFEL_API_ORIGIN}/air/offer_requests`, {
      signal,
      method: "POST",
      headers: duffelApiHeaders(access.token) as Record<string, string>,
      body: JSON.stringify({
        data: {
          slices,
          passengers: Array.from({ length: Math.max(1, query.adults ?? 1) }, () => ({ type: "adult" })),
          cabin_class: "economy",
          max_connections: 2,
          return_offers: true,
        },
      }),
      // Fifteen seconds was a guess and it was wrong twice over. A London
      // search is five airports and a return doubles it, so an offer request
      // that normally answers in six can take far longer on a cold connection.
      // Matched to the RouteStack adapter so that when a comparison reports a
      // timeout, both columns waited the same length of time and the two are
      // telling us something about the providers rather than about two
      // different arbitrary limits of ours.
      timeoutMs: 28000,
    });

    const result = (await response.json()) as { data?: { offers?: DuffelOffer[] } };
    // Cheapest first is Duffel's own default ordering; the cap matches what
    // the flight page shows, so neither screen is a phone book.
    return (result.data?.offers ?? []).slice(0, 12).map((offer): TravelOffer => {
      const sliceSegments = (offer.slices ?? []).map((slice) => slice.segments ?? []);
      const outbound = sliceSegments[0] ?? [];
      const first = outbound[0];
      const last = outbound[outbound.length - 1];
      const carrier = first?.marketing_carrier ?? first?.operating_carrier;
      const amount = Number(offer.total_amount);
      const refund = offer.conditions?.refund_before_departure;

      return {
        id: `duffel-flight-${offer.id}`,
        category: "flight",
        headline:
          [first?.origin?.iata_code ?? from.code, last?.destination?.iata_code ?? to.code].join(" → "),
        detail:
          [
            carrier?.name,
            first?.departing_at ? first.departing_at.slice(11, 16) : "",
            slices.length > 1 ? "return" : "one way",
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
        price: Number.isFinite(amount)
          ? { amount, currency: offer.total_currency ?? query.currency ?? "USD" }
          : undefined,
        fulfilment: "api-booking",
        meta: {
          provider: "duffel",
          providerOfferId: offer.id,
          expiresAt: offer.expires_at,
          // Duffel says allowed, not allowed, or nothing at all — and nothing
          // at all is "unknown" rather than "no", which would be a claim.
          refundable: typeof refund?.allowed === "boolean" ? refund.allowed : "unknown",
          cabin: offer.cabin_class,
          stops: Math.max(0, outbound.length - 1),
          airline: carrier?.name,
          // Duffel charges a fee per booking rather than paying a share, so
          // there is nothing here that reads as commission.
          commission: { model: "none" },
        },
      };
    });
  },
};
