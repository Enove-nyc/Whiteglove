/**
 * RouteStack, for rental cars — the only category where the site has nothing.
 *
 * WHY CARS AND NOT FLIGHTS. Flights already have Duffel (a real booking API,
 * already integrated, deliberately admin-gated) and Travelpayouts (live prices
 * on /book). Hotels already have Stay22 earning today. Cars have neither: the
 * existing lib/partner-cars.ts is honest about it — it validates the dates and
 * returns a single tracked compare row, because there is no car inventory API
 * on this site at all. So cars are where a new provider adds something rather
 * than a third opinion.
 *
 * WHAT ROUTESTACK IS, AND IS NOT. It is not a Duffel. Its published model is a
 * pre-filled checkout link, with RouteStack as merchant of record and a
 * revenue share to us. That makes it `deep-link`: the traveler pays them, they
 * carry the fraud, the chargeback and the refund, and White Glove is never in
 * the payment path. This adapter therefore never has a booking method, and the
 * absence is the design rather than an omission.
 *
 * UNANSWERED AT THE TIME OF WRITING. Whether there is a REST surface at all,
 * or only MCP; the exact search and link endpoints; rate limits; what a
 * booking reference looks like coming back. Their documentation site would not
 * answer a fetch, so rather than guess at an endpoint shape and ship code that
 * cannot work, the request is built from one small config block below. When a
 * sandbox key arrives, that block is the only thing that changes.
 */

import { providerFetch } from "@/lib/travel/search";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { SearchQuery, TravelOffer } from "@/lib/travel/types";

/**
 * The two things the environment supplies, and nothing else.
 *
 * The base URL is configurable so the sandbox and production are the same code
 * path with a different host — and so the endpoint shape can be corrected from
 * settings the day their docs are read, without a code change.
 */
function config() {
  const key = process.env.ROUTESTACK_API_KEY?.trim();
  const base = process.env.ROUTESTACK_API_BASE?.trim() || "https://api.routestack.ai";
  return key ? { key, base: base.replace(/\/$/, "") } : null;
}

export function routestackConfigured(): boolean {
  return Boolean(config());
}

/** Only what we are prepared to read. Anything else in their payload is ignored. */
type RouteStackCar = {
  id?: string;
  vehicle?: { name?: string; class?: string; transmission?: string };
  supplier?: { name?: string };
  price?: { amount?: number; total?: number; currency?: string };
  mileage?: string;
  deposit?: string;
  cancellation?: string;
  refundable?: boolean;
  checkoutUrl?: string;
  deepLink?: string;
};

export const routestackCars: ProviderSearch = {
  id: "routestack",
  category: "car",
  configured: routestackConfigured,

  async search(query: SearchQuery, signal: AbortSignal): Promise<TravelOffer[]> {
    const settings = config();
    if (!settings) throw new Error("not configured");

    const url = new URL(`${settings.base}/v1/cars/search`);
    url.searchParams.set("location", query.destination);
    url.searchParams.set("pickup", query.startDate);
    if (query.endDate) url.searchParams.set("dropoff", query.endDate);
    if (query.currency) url.searchParams.set("currency", query.currency);

    const response = await providerFetch(url.toString(), {
      signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${settings.key}`,
      },
    });
    const data = (await response.json()) as { results?: RouteStackCar[]; data?: RouteStackCar[] };
    const rows = data.results ?? data.data ?? [];

    return rows.slice(0, 20).map((row, index): TravelOffer => {
      const amount = row.price?.total ?? row.price?.amount;
      const href = row.checkoutUrl ?? row.deepLink;
      return {
        id: `routestack-car-${row.id ?? index}`,
        category: "car",
        headline: row.vehicle?.name?.trim() || row.vehicle?.class?.trim() || "Rental car",
        detail: [row.supplier?.name, row.vehicle?.transmission].filter(Boolean).join(" · ") || undefined,
        price:
          typeof amount === "number" && row.price?.currency
            ? { amount, currency: row.price.currency }
            : undefined,
        fulfilment: "deep-link",
        bookHref: href,
        meta: {
          provider: "routestack",
          providerOfferId: String(row.id ?? index),
          // Absent means unknown, never "no" — see lib/travel/compare.ts.
          refundable: typeof row.refundable === "boolean" ? row.refundable : "unknown",
          cancellation: row.cancellation,
          carClass: row.vehicle?.class,
          mileage: row.mileage,
          deposit: row.deposit,
          commission: { model: "share", note: "RouteStack is merchant of record." },
        },
      };
    });
  },
};
