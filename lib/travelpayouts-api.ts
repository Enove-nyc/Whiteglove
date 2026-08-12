/**
 * Travelpayouts Data API — live flight price options for /book.
 *
 * Hotels stay on Stay22. Cars have no comparable public inventory API in this
 * account setup (EconomyBookings / DiscoverCars APIs need separate credentials
 * the owner has not been given). Car search still uses the on-site results
 * panel, then a tracked /go hand-off.
 *
 * Auth: X-Access-Token (or token=). Env: TRAVELPAYOUTS_TOKEN from the
 * Travelpayouts dashboard (API tools). Marker alone is not enough for Data API.
 *
 * CTA still goes through /go so the click is recorded and the existing Stay22 /
 * Travelpayouts wrap applies. White Glove never takes payment.
 *
 * Docs: https://api.travelpayouts.com/documentation
 */

const PRICES_URL = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
const CACHE_TTL_MS = 90_000;
const MAX_RESULTS = 12;

export type TravelpayoutsFlightOption = {
  id: string;
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  airline?: string;
  flightNumber?: string;
  departTime?: string;
  transfers: number;
  price: number;
  currency: string;
  /** Human line for the results list. */
  summary: string;
};

export type TravelpayoutsFlightResult =
  | { ok: true; mode: "live"; flights: TravelpayoutsFlightOption[]; currency: string; message: string }
  | { ok: false; mode: "unavailable"; message: string; detail?: string };

type CacheEntry = { at: number; value: TravelpayoutsFlightResult };
const memoryCache = new Map<string, CacheEntry>();

export function travelpayoutsTokenConfigured(): boolean {
  return Boolean(process.env.TRAVELPAYOUTS_TOKEN?.trim());
}

function token(): string {
  return process.env.TRAVELPAYOUTS_TOKEN?.trim() ?? "";
}

function iata(value: string): string {
  return value.trim().toUpperCase().slice(0, 3);
}

export type FlightPriceSearch = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  nonstop?: boolean;
};

function cacheKey(search: FlightPriceSearch): string {
  return [search.origin, search.destination, search.departDate, search.returnDate ?? "", search.nonstop ? "1" : "0"].join("|");
}

export type RawTravelpayoutsFlight = {
  origin?: string;
  destination?: string;
  origin_airport?: string;
  destination_airport?: string;
  departure_at?: string;
  return_at?: string;
  airline?: string;
  transfers?: number;
  price?: number;
  flight_number?: string | number;
};

function clock(iso?: string): string | undefined {
  const match = iso?.match(/T(\d{2}:\d{2})/);
  return match?.[1];
}

/** Map a Data API payload into on-site result rows. Exported for tests. */
export function mapTravelpayoutsFlights(
  rows: RawTravelpayoutsFlight[] | undefined,
  search: FlightPriceSearch,
  currency: string,
): TravelpayoutsFlightOption[] {
  const origin = iata(search.origin);
  const destination = iata(search.destination);
  const flights: TravelpayoutsFlightOption[] = [];

  for (const row of rows ?? []) {
    const price = typeof row.price === "number" ? row.price : NaN;
    if (!Number.isFinite(price)) continue;
    const depart = (row.departure_at ?? search.departDate).slice(0, 10);
    const ret = row.return_at ? String(row.return_at).slice(0, 10) : search.returnDate;
    const transfers = Math.max(0, Number(row.transfers) || 0);
    const airline = row.airline?.trim();
    const from = (row.origin_airport ?? row.origin ?? origin).toUpperCase();
    const to = (row.destination_airport ?? row.destination ?? destination).toUpperCase();
    const flightNumber = row.flight_number != null ? String(row.flight_number).trim() : "";
    const departTime = clock(row.departure_at);
    const stops = transfers === 0 ? "Nonstop" : transfers === 1 ? "1 stop" : `${transfers} stops`;
    const summary = [
      airline ? airline.toUpperCase() : null,
      flightNumber || null,
      `${from} → ${to}`,
      depart,
      departTime ?? null,
      ret ? `return ${ret}` : null,
      stops,
    ]
      .filter(Boolean)
      .join(" · ");
    flights.push({
      id: [from, to, depart, ret ?? "", airline ?? "", flightNumber, String(price), String(transfers)].join("-"),
      origin: from,
      destination: to,
      departDate: depart,
      returnDate: ret,
      airline,
      flightNumber: flightNumber || undefined,
      departTime,
      transfers,
      price,
      currency,
      summary,
    });
    if (flights.length >= MAX_RESULTS) break;
  }
  return flights;
}

/**
 * Cheap / recent tickets for exact dates. Not a full OTA offer matrix — enough
 * to show live prices on-site before handing off to the booking partner.
 *
 * Public messages never name env vars — those belong on the connections screen.
 */
export async function searchTravelpayoutsFlights(search: FlightPriceSearch): Promise<TravelpayoutsFlightResult> {
  const key = token();
  if (!key) {
    return {
      ok: false,
      mode: "unavailable",
      message: "Live flight prices are not available just now.",
      detail: "You can still compare and book with a partner.",
    };
  }

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

  const memoKey = cacheKey({ ...search, origin, destination });
  const hit = memoryCache.get(memoKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const params = new URLSearchParams();
  params.set("origin", origin);
  params.set("destination", destination);
  params.set("departure_at", search.departDate);
  if (search.returnDate) params.set("return_at", search.returnDate);
  else params.set("one_way", "true");
  params.set("currency", "usd");
  params.set("limit", String(MAX_RESULTS));
  params.set("sorting", "price");
  params.set("unique", "false");
  if (search.nonstop) params.set("direct", "true");

  let response: Response;
  try {
    response = await fetch(`${PRICES_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Access-Token": key,
      },
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      mode: "unavailable",
      message: "Live flight prices could not be loaded just now.",
      detail: "You can still compare and book with a partner.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      mode: "unavailable",
      message: "Live flight prices are not available just now.",
      detail: "You can still compare and book with a partner.",
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      mode: "unavailable",
      message: "Live flight prices could not be loaded just now.",
      detail: "You can still compare and book with a partner.",
    };
  }

  const body = (await response.json().catch(() => null)) as {
    success?: boolean;
    currency?: string;
    data?: RawTravelpayoutsFlight[];
  } | null;

  if (!body || body.success === false) {
    return {
      ok: false,
      mode: "unavailable",
      message: "Live flight prices are not available for this search.",
      detail: "You can still compare and book with a partner.",
    };
  }

  const currency = (body.currency || "USD").toUpperCase();
  const flights = mapTravelpayoutsFlights(body.data, { ...search, origin, destination }, currency);

  const result: TravelpayoutsFlightResult = {
    ok: true,
    mode: "live",
    flights,
    currency,
    message: flights.length
      ? `${flights.length} flight price${flights.length === 1 ? "" : "s"} found. Open a partner to compare and book.`
      : "No priced flights for those dates. Try other dates, or open the partner search.",
  };
  memoryCache.set(memoKey, { at: Date.now(), value: result });
  return result;
}
