/**
 * Stay22, as a provider.
 *
 * A WRAPPER, NOT A REWRITE. lib/stay22-api.ts keeps doing exactly what it does
 * — the same request, the same cache, the same tracked deeplinks — and this
 * translates its answer into the one shape the rest of the travel code reads.
 * If this file were deleted tomorrow, Stay22 would still work everywhere it
 * works today.
 *
 * Stay22 is `deep-link`: the traveler finishes on the supplier's own checkout
 * and Stay22 is paid for sending them. We never hold the money and never owe
 * the refund, and the UI must never imply otherwise.
 */

import { readStay22 } from "@/lib/stay22-store";
import { searchStay22Accommodations, stay22ApiConfigured } from "@/lib/stay22-api";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { SearchQuery, TravelOffer } from "@/lib/travel/types";

export const stay22Hotels: ProviderSearch = {
  id: "stay22",
  category: "hotel",
  configured: () => stay22ApiConfigured(),

  async search(query: SearchQuery, signal: AbortSignal): Promise<TravelOffer[]> {
    // The existing module owns its own fetch and does not take a signal. The
    // shared deadline is still honoured here: if the search has already been
    // abandoned by the time this returns, its results are dropped rather than
    // rendered late.
    const settings = await readStay22();
    const result = await searchStay22Accommodations(
      {
        address: query.destination,
        checkin: query.startDate,
        checkout: query.endDate ?? query.startDate,
        adults: query.adults ?? 2,
      },
      settings,
    );
    if (signal.aborted) return [];
    if (!result.ok) {
      const error = new Error(result.message) as Error & { status?: number };
      throw error;
    }

    return result.stays.map((stay) => ({
      id: `stay22-${stay.id}`,
      category: "hotel" as const,
      headline: stay.name,
      detail: [stay.type, stay.address].filter(Boolean).join(" · ") || undefined,
      price:
        typeof stay.priceTotal === "number"
          ? { amount: stay.priceTotal, currency: stay.currency || result.currency }
          : undefined,
      fulfilment: "deep-link" as const,
      bookHref: stay.bookUrl,
      meta: {
        provider: "stay22" as const,
        providerOfferId: stay.id,
        // Stay22 tells us free cancellation or nothing. Nothing means unknown,
        // and unknown must never be compared as though it were "no".
        refundable: stay.freeCancellation === true ? true : "unknown",
        cancellation: stay.freeCancellation === true ? "Free cancellation" : undefined,
        commission: { model: "share", note: "Paid by Stay22 on completed stays." },
      },
    }));
  },
};
