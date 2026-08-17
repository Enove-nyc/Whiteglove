/**
 * Travelpayouts, as a provider — the second company that can face a traveler
 * with a flight.
 *
 * WHY IT IS HERE NOW AND WAS NOT BEFORE. The rule for this layer was never
 * "leave the existing integrations alone", it was: do not wrap a path a
 * visitor is using today. Travelpayouts is answering on /book right now, and
 * that route still calls lib/travelpayouts-api.ts directly and is untouched —
 * this is a second reader of the same module, exactly as the Stay22 adapter
 * is. Delete this file and /book does not notice.
 *
 * What changed is what it is FOR. With Duffel barred from ever facing a
 * visitor — it would make White Glove the seller — RouteStack was the only
 * company that could publicly answer a flight search, and one company is not a
 * comparison. Travelpayouts is the other third party already signed up.
 *
 * A CACHED FARE, NOT A LIVE QUOTE. Their prices_for_dates endpoint returns
 * recent fares rather than bookable inventory, which is why refundability is
 * unknown here and why nothing in this file pretends the number is held. The
 * traveler finishes on Aviasales, through a tracked link, and pays them.
 */

import { searchTravelpayoutsFlights, travelpayoutsTokenConfigured } from "@/lib/travelpayouts-api";
import { resolveEndpoint } from "@/lib/flight-endpoint";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { SearchQuery, TravelOffer } from "@/lib/travel/types";

export const travelpayoutsFlights: ProviderSearch = {
  id: "travelpayouts",
  category: "flight",
  fulfilment: "deep-link",
  configured: () => travelpayoutsTokenConfigured(),

  async search(query: SearchQuery, signal: AbortSignal): Promise<TravelOffer[]> {
    if (!query.origin?.trim()) return [];
    // The same resolver both other flight adapters use, so all three read a
    // place the same way. Theirs wants a plain IATA code and refuses anything
    // else, so a city it has never heard of is an empty answer, not a failure.
    const from = resolveEndpoint(query.origin);
    const to = resolveEndpoint(query.destination);
    if (!from || !to) return [];

    // Their module owns its own fetch and cache and takes no signal. The shared
    // deadline is still honoured: results arriving after the search was
    // abandoned are dropped rather than rendered late.
    const result = await searchTravelpayoutsFlights({
      origin: from.code,
      destination: to.code,
      departDate: query.startDate,
      returnDate: query.endDate && query.endDate > query.startDate ? query.endDate : undefined,
    });
    if (signal.aborted) return [];
    if (!result.ok) throw new Error(result.message);

    return result.flights.map((flight): TravelOffer => ({
      id: `travelpayouts-flight-${flight.id}`,
      category: "flight",
      headline: `${flight.origin} → ${flight.destination}`,
      detail:
        [flight.airlineName ?? flight.airline, flight.departTime, flight.returnDate ? "return" : "one way"]
          .filter(Boolean)
          .join(" · ") || undefined,
      price: { amount: flight.price, currency: flight.currency },
      fulfilment: "deep-link",
      bookHref: flight.bookUrl,
      meta: {
        provider: "travelpayouts",
        providerOfferId: flight.id,
        // A recent fare is not a held quote. Saying "unknown" is the honest
        // answer and compare.ts treats it as not-comparable, which is right:
        // a cached price and a live one are not alternatives to each other.
        refundable: "unknown",
        stops: flight.transfers,
        airline: flight.airlineName ?? flight.airline,
        commission: { model: "cpa", note: "Paid by Travelpayouts on completed bookings." },
      },
    }));
  },
};
