/**
 * RouteStack, for hotels — the second answer in a category that had one.
 *
 * WHY A SECOND HOTEL PROVIDER. Stay22 is a widget: it earns, it works, and it
 * cannot be compared against anything, because it returns a rendered panel
 * rather than prices. RouteStack returns prices. Until now the comparison
 * screen showed one row per category, which is a list, not a comparison.
 *
 * NOTHING HERE REPLACES STAY22. Both adapters are registered for hotels and
 * both answer; Stay22 keeps its widget and keeps earning. See engine.ts.
 *
 * TWO CALLS, AND SOMETIMES THREE. Their search wants a destination id and a
 * pair of coordinates, not the word a traveler typed, so a search resolves the
 * place first. Their own agent instruction is explicit that the recommended
 * destination is what to use and that ids must never be invented, so this uses
 * exactly what they hand back and searches nothing when they hand back nothing.
 *
 * THEIR SEARCH IS ASYNCHRONOUS. The first answer can come back `InProgress`
 * with no hotels and a cursor; the results arrive on a later call carrying the
 * same correlationId and token. That is polled here a small number of times
 * rather than reported as an empty city — but only within the deadline the
 * search layer already imposes, so a slow poll cannot hold a page open.
 */

import { routestackConfig, routestackPost } from "@/lib/travel/adapters/routestack-auth";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { SearchQuery, TravelOffer } from "@/lib/travel/types";

type RouteStackDestination = {
  destinationId?: string;
  id?: string;
  type?: string;
  fullName?: string;
  lat?: number;
  long?: number;
  coordinates?: { lat?: number; long?: number };
};

/**
 * THEIR DOCUMENT IS NOT THEIR ANSWER, so this is typed from the answer.
 *
 * Their OpenAPI says `mainamenity` is a string and `reviews` is an object with
 * a rating and a count. In a live Kraków search `mainamenity` comes back as an
 * array of strings and `reviews` comes back as null on every one of 452
 * hotels. The first cost a crash on `.trim()`. So nothing below is trusted to
 * be the shape it is declared as, and everything read is checked.
 */
type RouteStackHotel = {
  id?: string;
  name?: string;
  providerName?: string;
  starRating?: number;
  ourprice?: number;
  baseprice?: number;
  publishedRate?: number;
  saving?: number;
  payAtHotel?: boolean;
  ratetype?: string;
  /** A string in their document; an array of strings in their answers. */
  mainamenity?: unknown;
  distancekm?: number;
  /** Documented as an object; null in practice. */
  reviews?: { rating?: number; count?: number } | null;
  contact?: { address?: { line1?: string; city?: { name?: string }; country?: { name?: string; code?: string } } };
};

/** Whatever they sent, as words, or nothing. Exported so it can be pinned. */
export function asText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) {
    const parts = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    return parts.length ? parts.slice(0, 3).join(", ") : undefined;
  }
  return undefined;
}

type HotelSearchResult = {
  status?: string;
  count?: number;
  currency?: string;
  correlationId?: string;
  token?: string;
  nextResultsKey?: string;
  result?: RouteStackHotel[];
};

/** How many times to ask again while they are still working. */
const MAX_POLLS = 5;
const POLL_PAUSE_MS = 1500;

function coordinatesOf(place: RouteStackDestination): { lat: number; long: number } | null {
  const lat = place.lat ?? place.coordinates?.lat;
  const long = place.long ?? place.coordinates?.long;
  return typeof lat === "number" && typeof long === "number" ? { lat, long } : null;
}

/** Their check-out is required, so a stay with no end date is one night. */
function checkOutFor(query: SearchQuery): string {
  if (query.endDate && query.endDate > query.startDate) return query.endDate;
  const next = new Date(`${query.startDate}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function routestackHotelsConfigured(): boolean {
  return Boolean(routestackConfig());
}

export const routestackHotels: ProviderSearch = {
  id: "routestack",
  category: "hotel",
  fulfilment: "deep-link",
  configured: routestackHotelsConfigured,

  async search(query: SearchQuery, signal: AbortSignal): Promise<TravelOffer[]> {
    const config = routestackConfig();
    if (!config) throw new Error("not configured");

    const found = await routestackPost<{
      result?: RouteStackDestination[];
      _recommendedDestination?: RouteStackDestination;
    }>(config, "/mcp/hotel/search-destinations", { query: query.destination, type: "DESTINATION" }, signal, 8000);

    // Their instruction, followed literally: the recommended destination, or
    // the first row, and never an id assembled here.
    const place = found._recommendedDestination ?? found.result?.[0];
    const coordinates = place ? coordinatesOf(place) : null;
    const destinationId = place?.destinationId ?? place?.id;
    // A place they do not carry is an empty answer, not a failure.
    if (!place || !coordinates || !destinationId) return [];

    const rooms = Math.max(1, query.rooms ?? 1);
    const adults = Math.max(1, query.adults ?? 2);
    const base = {
      destinationId: String(destinationId),
      destinationType: place.type ?? "City",
      lat: coordinates.lat,
      long: coordinates.long,
      checkIn: query.startDate,
      checkOut: checkOutFor(query),
      currency: query.currency ?? "USD",
      roomCount: rooms,
      // Their roomCount must equal rooms.length, so the occupancy is built
      // from the count rather than sent beside it.
      rooms: Array.from({ length: rooms }, () => ({
        adults,
        children: query.children ?? 0,
        childAges: [] as number[],
      })),
    };

    /**
     * WAIT FOR "COMPLETED", NOT FOR THE FIRST THING THAT ARRIVES.
     *
     * This loop used to stop the moment a response carried any hotels at all.
     * Against their sandbox that was invisible, because the first response
     * already said Completed with hundreds of rooms in it. Against production
     * the first response is a partial one — a Kraków search returned two
     * hostels in two seconds and looked like a city with two hotels in it.
     * Their status field is the only thing that says whether they have
     * finished, so it is the only thing that ends this loop.
     *
     * The fullest response wins rather than the last, because a later partial
     * must never replace an earlier fuller one.
     */
    let body: Record<string, unknown> = base;
    let result: HotelSearchResult = {};
    for (let attempt = 0; attempt <= MAX_POLLS; attempt++) {
      const response = await routestackPost<{ result?: HotelSearchResult }>(
        config,
        "/mcp/hotel/search-hotels",
        body,
        signal,
        12000,
      );
      const answer = response.result ?? {};
      if ((answer.result ?? []).length >= (result.result ?? []).length) result = answer;
      if (answer.status === "Completed") break;
      if (!answer.correlationId) break;
      // Same session, their cursor — never a fresh correlationId, which would
      // start a new search and never converge.
      body = {
        ...base,
        correlationId: answer.correlationId,
        token: answer.token,
        ...(answer.nextResultsKey ? { nextResultsKey: answer.nextResultsKey } : {}),
      };
      await new Promise((resolve) => setTimeout(resolve, POLL_PAUSE_MS));
    }

    const currency = result.currency ?? query.currency ?? "USD";
    const nights = Math.max(
      1,
      Math.round(
        (Date.parse(`${base.checkOut}T00:00:00Z`) - Date.parse(`${base.checkIn}T00:00:00Z`)) / 86_400_000,
      ),
    );

    // Kraków alone answers with 452 hotels. A comparison wants the top of a
    // list, and paging one is not this layer's job.
    return (result.result ?? []).slice(0, 25).map((hotel, index): TravelOffer => {
      const amount = typeof hotel.ourprice === "number" ? hotel.ourprice : undefined;
      const address = hotel.contact?.address;
      return {
        id: `routestack-hotel-${hotel.id ?? index}`,
        category: "hotel",
        headline: asText(hotel.name) ?? "Hotel",
        detail:
          [
            typeof hotel.starRating === "number" && hotel.starRating > 0 ? `${hotel.starRating}-star` : "",
            [address?.city?.name, address?.country?.name].filter(Boolean).join(", "),
            typeof hotel.reviews?.rating === "number" ? `guest rating ${hotel.reviews.rating}` : "",
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
        // THEIR PRICE IS THE STAY, NOT THE NIGHT. `ourprice` on a three-night
        // search is the three nights, so a per-night number is derived here
        // for the room line rather than left for a reader to assume either way.
        price: typeof amount === "number" ? { amount, currency } : undefined,
        fulfilment: "deep-link",
        meta: {
          provider: "routestack",
          providerOfferId: String(hotel.id ?? index),
          // They tell us free cancellation per rate, not per hotel, and a rate
          // is a later call. Unknown is a real answer and compare.ts treats it
          // as not-comparable, which is the correct behaviour here.
          refundable: "unknown",
          roomType:
            typeof amount === "number" && nights > 1
              ? `${nights} nights · about ${currency} ${Math.round(amount / nights)} a night`
              : undefined,
          mealPlan: asText(hotel.mainamenity),
          commission: { model: "share", note: "RouteStack is merchant of record." },
        },
      };
    });
  },
};
