/**
 * RouteStack, for rental cars — the only category where the site has nothing.
 *
 * WHY CARS AND NOT FLIGHTS. Flights already have Duffel (a real booking API,
 * integrated and deliberately admin-gated) and Travelpayouts (live prices on
 * /book). Hotels already have Stay22 earning today. Cars have neither: the
 * existing lib/partner-cars.ts is honest about it — it validates the dates and
 * returns a single tracked compare row, because there is no car inventory API
 * on this site at all.
 *
 * WHAT ROUTESTACK IS. Not a Duffel. Their car flow ends at
 * /mcp/car/get-payment-url: they hand back a checkout link, they are merchant
 * of record, and they pay a share. So this adapter is `deep-link`, it has no
 * booking method, and White Glove is never in the payment path. The absence of
 * a create-booking function here is the design, not an omission.
 *
 * TWO CALLS, NOT ONE. Their search wants a location CODE (PNQ), not the words
 * a traveler typed, so a search is: resolve the place, then search it. The
 * resolve step is cached — airport codes do not change during a shift — so in
 * practice a repeat search costs one call.
 */

import { providerFetch } from "@/lib/travel/search";
import { routestackAirportCode, routestackConfig, routestackToken } from "@/lib/travel/adapters/routestack-auth";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { SearchQuery, TravelOffer } from "@/lib/travel/types";

export function routestackConfigured(): boolean {
  return Boolean(routestackConfig());
}

type RouteStackLocation = { code?: string; name?: string; type?: string };

/** Their two rate shapes are the same fields; postpaid is the one they quote. */
type RouteStackRate = {
  currency?: string;
  total?: number;
  free_cancellation?: boolean;
  allow_cancellation?: string | boolean;
  days?: number;
  fareCode?: string;
  rateType?: string;
};

/** Only the fields we are prepared to read. Anything else they send is ignored. */
type RouteStackCar = {
  name?: string;
  description?: string;
  type_name?: string;
  vehicle_code?: string;
  passengers?: number;
  bags?: number;
  features?: string[];
  fuelType?: string;
  mileage?: boolean;
  manual_transmission?: boolean;
  creditCardRequired?: boolean;
  inclusions?: string[];
  partner?: { code?: string; name?: string };
  pickup?: { location?: string; location_code?: string; airport_name?: string };
  display_price?: number;
  price_postpaid?: RouteStackRate | null;
  price_prepaid?: RouteStackRate | null;
};

const locationCache = new Map<string, string>();

async function resolveLocationCode(
  base: string,
  token: string,
  term: string,
  signal: AbortSignal,
): Promise<{ code: string; name: string } | null> {
  const key = term.trim().toLowerCase();
  const cachedCode = locationCache.get(key);
  if (cachedCode) return { code: cachedCode, name: term };

  const ask = async (searchTerm: string): Promise<RouteStackLocation[]> => {
    const response = await providerFetch(`${base}/mcp/car/locations`, {
      signal,
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ term: searchTerm }),
      timeoutMs: 8000,
    });
    const data = (await response.json()) as { result?: RouteStackLocation[] };
    return data.result ?? [];
  };

  // Airports first: a traveler searching "Kraków" for a car almost always
  // means the airport desk, and their own example uses an airport code.
  const pick = (rows: RouteStackLocation[]) =>
    rows.find((row) => row.type === "airport" && row.code) ?? rows.find((row) => row.code);

  let best = pick(await ask(term));

  // THEIR CAR INDEX DOES NOT KNOW EVERY PLACE NAME. It has no "Kraków" and no
  // "Krakow" — it wants the English exonym "Cracow", or the code KRK. Their
  // FLIGHT index does know Kraków and answers KRK, so a blank here is worth a
  // second question rather than an empty search. Every European destination on
  // this site with an accent in its name depended on it.
  if (!best) {
    const config = routestackConfig();
    const code = config ? await routestackAirportCode(config, term, signal) : null;
    if (code) best = pick(await ask(code));
  }

  if (!best?.code) return null;
  locationCache.set(key, best.code);
  return { code: best.code, name: best.name ?? term };
}

export const routestackCars: ProviderSearch = {
  id: "routestack",
  category: "car",
  fulfilment: "deep-link",
  configured: routestackConfigured,

  async search(query: SearchQuery, signal: AbortSignal): Promise<TravelOffer[]> {
    const config = routestackConfig();
    if (!config) throw new Error("not configured");

    const token = await routestackToken(config, signal);
    const place = await resolveLocationCode(config.base, token, query.destination, signal);
    // Nowhere of that name is an empty answer, not a failure: the provider
    // worked, it simply does not serve the place that was asked for.
    if (!place) return [];

    const response = await providerFetch(`${config.base}/mcp/car/search`, {
      signal,
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        filter: {
          pickup: { name: place.name, code: place.code, date: query.startDate, time: "10:00" },
          dropoff: {
            name: place.name,
            code: place.code,
            date: query.endDate ?? query.startDate,
            time: "10:00",
          },
          page: 1,
          limit: 20,
        },
      }),
      timeoutMs: 12000,
    });

    const data = (await response.json()) as {
      result?: { cars?: RouteStackCar[]; currency?: string };
    };
    const cars = data.result?.cars ?? [];
    const fallbackCurrency = data.result?.currency ?? query.currency ?? "USD";
    // What their checkout will want back, alongside the car itself. Built once
    // here because this is the only place that knows which desk was searched.
    const desk = {
      pickup: { name: place.name, code: place.code, date: query.startDate, time: "10:00" },
      dropoff: { name: place.name, code: place.code, date: query.endDate ?? query.startDate, time: "10:00" },
    };

    return cars.map((car, index): TravelOffer => {
      const rate = car.price_postpaid ?? car.price_prepaid ?? null;
      const amount = rate?.total ?? car.display_price;
      const currency = rate?.currency ?? fallbackCurrency;
      const refundable =
        rate?.free_cancellation === true || rate?.allow_cancellation === "true" || rate?.allow_cancellation === true
          ? true
          : "unknown";

      return {
        id: `routestack-car-${car.vehicle_code ?? index}-${index}`,
        category: "car",
        headline: car.name?.trim() || car.type_name?.trim() || "Rental car",
        detail:
          [car.partner?.name, car.type_name, car.passengers ? `${car.passengers} seats` : ""]
            .filter(Boolean)
            .join(" · ") || undefined,
        price: typeof amount === "number" ? { amount, currency } : undefined,
        // They own the checkout — /mcp/car/get-payment-url — so this is a
        // hand-off, never a booking of ours.
        fulfilment: "deep-link",
        // Server-side only; the public route mints a handle for it and drops
        // it before anything reaches a browser. See lib/travel/types.ts.
        raw: { car, ...desk },
        meta: {
          provider: "routestack",
          providerOfferId: rate?.fareCode ?? car.vehicle_code ?? String(index),
          refundable,
          cancellation: rate?.free_cancellation === true ? "Free cancellation" : undefined,
          carClass: car.type_name ?? car.description,
          // Their `mileage: false` means limited, not "no mileage". Said in
          // words here so nothing downstream has to remember that.
          mileage: car.mileage === true ? "Unlimited" : car.mileage === false ? "Limited" : undefined,
          deposit: car.creditCardRequired === true ? "Credit card required at the desk" : undefined,
          commission: { model: "share", note: "RouteStack is merchant of record." },
        },
      };
    });
  },
};
