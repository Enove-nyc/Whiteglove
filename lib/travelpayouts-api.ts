/**
 * Travelpayouts Data API — cached fares for /book, not a live OTA matrix.
 *
 * Hotels stay on Stay22. Cars have no comparable public inventory API in this
 * account setup. The Aviasales Flight Search API (multiple real itineraries)
 * returns 403 on this account — it needs separate approval. What this token
 * can call is prices_for_dates: cheapest cached tickets. unique=false asks for
 * every cached ticket for that date, not one cheapest. A second call adds the
 * cheapest nonstop. Round-trip with no cache
 * for the exact return retries without return_at and shows fares that leave on
 * the asked day (actual return date on the row). This is still a dump, not a
 * GDS matrix — two rows means two cached offers, not a hidden cap of two.
 *
 * Each priced row carries that ticket's `link`. View & book must open
 * https://www.aviasales.com{link} with TRAVELPAYOUTS_MARKER — never Stay22
 * Kayak. A Kayak compare row without a price is added separately.
 *
 * Auth: X-Access-Token. Env: TRAVELPAYOUTS_TOKEN. Marker is not the token.
 * Requests use market=us (this site's travellers).
 *
 * Docs: https://support.travelpayouts.com/hc/en-us/articles/203956163
 */

import { airlineCode, airlineHeading, flightNumberLabel, hydrateAirlineNames } from "@/lib/airline-names";
import { flightDateProblem } from "@/lib/date-range";

const PRICES_URL = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
const CACHE_TTL_MS = 90_000;
/** Ask for every cached offer the dump has, up to this. Not a GDS page size. */
const MAX_RESULTS = 20;

export type TravelpayoutsFlightOption = {
  id: string;
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  airline?: string;
  airlineName?: string;
  flightNumber?: string;
  departTime?: string;
  transfers: number;
  /** Total journey minutes from the dump, when present. Not a layover. */
  durationMinutes?: number;
  price: number;
  currency: string;
  /** Human line for the results list — no stop count (that lives on `transfers`). */
  summary: string;
  /** Aviasales path from the Data API (`/search/...`), when present. */
  offerPath?: string;
  /** Tracked Aviasales URL for this fare, or "" when it cannot be built. */
  bookUrl: string;
  /** Layover city and times from a live itinerary, when the offer has them. */
  stopDetail?: string;
};

export type TravelpayoutsFlightResult =
  | {
      ok: true;
      mode: "live";
      flights: TravelpayoutsFlightOption[];
      currency: string;
      message: string;
      /** True when rows leave on the asked day but come back on a different date. */
      nearbyReturn?: boolean;
    }
  | { ok: false; mode: "unavailable"; message: string; detail?: string };

export type ReturnMatch = "match-search" | "any-roundtrip";

type CacheEntry = { at: number; value: TravelpayoutsFlightResult };
const memoryCache = new Map<string, CacheEntry>();

export function travelpayoutsTokenConfigured(): boolean {
  return Boolean(process.env.TRAVELPAYOUTS_TOKEN?.trim());
}

function token(): string {
  return process.env.TRAVELPAYOUTS_TOKEN?.trim() ?? "";
}

export function travelpayoutsMarker(): string {
  const value = process.env.TRAVELPAYOUTS_MARKER?.trim() ?? "";
  return /^\d{4,}$/.test(value) ? value : "";
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
  /** Total journey minutes when the dump includes it. Not segment times. */
  duration?: number;
  /** Relative Aviasales search path for this cached fare. */
  link?: string;
};

function clock(iso?: string): string | undefined {
  const match = iso?.match(/T(\d{2}:\d{2})/);
  return match?.[1];
}

function prettyDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[Number(match[2]) - 1];
  if (!month) return isoDate;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

/**
 * The Data API `link` is a path on aviasales.com. Marker on that URL is how
 * Aviasales credits the account. Protocol-relative and off-host values are
 * refused so a bad payload cannot send the traveller elsewhere.
 */
export function trackedAviasalesUrl(link: string | undefined, marker = travelpayoutsMarker()): string {
  const raw = link?.trim() ?? "";
  if (!raw || raw.startsWith("//") || /^[a-z]+:/i.test(raw)) return "";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  let url: URL;
  try {
    url = new URL(path, "https://www.aviasales.com");
  } catch {
    return "";
  }
  if (url.protocol !== "https:") return "";
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "aviasales.com") return "";
  if (marker) url.searchParams.set("marker", marker);
  return url.toString();
}

function keepReturn(rowReturn: string | undefined, wanted: string | undefined, match: ReturnMatch): boolean {
  if (match === "any-roundtrip") return Boolean(rowReturn);
  if (!wanted) return !rowReturn;
  return rowReturn === wanted;
}

/** Map a Data API payload into on-site result rows. Exported for tests. */
export function mapTravelpayoutsFlights(
  rows: RawTravelpayoutsFlight[] | undefined,
  search: FlightPriceSearch,
  currency: string,
  marker = travelpayoutsMarker(),
  returnMatch: ReturnMatch = "match-search",
): TravelpayoutsFlightOption[] {
  const origin = iata(search.origin);
  const destination = iata(search.destination);
  const flights: TravelpayoutsFlightOption[] = [];
  const seen = new Set<string>();

  for (const row of rows ?? []) {
    const price = typeof row.price === "number" ? row.price : NaN;
    if (!Number.isFinite(price)) continue;
    const depart = (row.departure_at ?? search.departDate).slice(0, 10);
    const ret = row.return_at ? String(row.return_at).slice(0, 10) : undefined;
    if (!keepReturn(ret, search.returnDate, returnMatch)) continue;
    const transfers = Math.max(0, Number(row.transfers) || 0);
    const airline = airlineCode(row.airline) || undefined;
    const from = (row.origin_airport ?? row.origin ?? origin).toUpperCase();
    const to = (row.destination_airport ?? row.destination ?? destination).toUpperCase();
    const flightNumber = row.flight_number != null ? String(row.flight_number).trim() : "";
    const durationMinutes = Number.isFinite(Number(row.duration)) && Number(row.duration) > 0 ? Math.round(Number(row.duration)) : undefined;
    const departTime = clock(row.departure_at);
    const offerPath = row.link?.trim() || undefined;
    const bookUrl = trackedAviasalesUrl(offerPath, marker);
    const id = [from, to, depart, ret ?? "", airline ?? "", flightNumber, String(price), String(transfers)].join("-");
    if (seen.has(id)) continue;
    seen.add(id);
    const summary = [
      flightNumberLabel(airline, flightNumber) || null,
      `${from} → ${to}`,
      prettyDate(depart),
      departTime ?? null,
      ret ? `return ${prettyDate(ret)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    flights.push({
      id,
      origin: from,
      destination: to,
      departDate: depart,
      returnDate: ret,
      airline,
      airlineName: airlineHeading(airline),
      flightNumber: flightNumber || undefined,
      departTime,
      transfers,
      durationMinutes,
      price,
      currency,
      summary,
      offerPath,
      bookUrl,
    });
    if (flights.length >= MAX_RESULTS) break;
  }
  return flights;
}

async function fetchPricesForDates(
  search: FlightPriceSearch,
  origin: string,
  destination: string,
  extras?: { omitReturnAt?: boolean },
): Promise<RawTravelpayoutsFlight[]> {
  const key = token();
  const params = new URLSearchParams();
  params.set("origin", origin);
  params.set("destination", destination);
  params.set("departure_at", search.departDate);
  if (extras?.omitReturnAt) {
    params.set("one_way", "false");
  } else if (search.returnDate) {
    params.set("return_at", search.returnDate);
    params.set("one_way", "false");
  } else {
    params.set("one_way", "true");
  }
  params.set("currency", "usd");
  params.set("market", "us");
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
    console.warn("Travelpayouts prices_for_dates network error");
    return [];
  }
  if (!response.ok) {
    console.warn(`Travelpayouts prices_for_dates HTTP ${response.status}`);
    return [];
  }
  const body = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: RawTravelpayoutsFlight[];
    error?: string;
  } | null;
  if (!body || body.success === false || !Array.isArray(body.data)) {
    if (body?.error) console.warn(`Travelpayouts prices_for_dates: ${body.error}`);
    return [];
  }
  return body.data;
}

/**
 * Cached cheapest tickets for the exact dates. Not a full offer matrix.
 * Public messages never name env vars.
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
  if (search.returnDate && (!/^\d{4}-\d{2}-\d{2}$/.test(search.returnDate) || search.returnDate < search.departDate)) {
    return { ok: false, mode: "unavailable", message: "Return date must be after departure." };
  }
  const past = flightDateProblem(search.departDate, search.returnDate);
  if (past) return { ok: false, mode: "unavailable", message: past };

  const memoKey = cacheKey({ ...search, origin, destination });
  const hit = memoryCache.get(memoKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  await hydrateAirlineNames();

  const wanted: FlightPriceSearch = { ...search, origin, destination };
  const batches = search.nonstop
    ? [fetchPricesForDates(wanted, origin, destination)]
    : [fetchPricesForDates(wanted, origin, destination), fetchPricesForDates({ ...wanted, nonstop: true }, origin, destination)];
  const collected = (await Promise.all(batches)).flat();
  let flights = mapTravelpayoutsFlights(collected, wanted, "USD").filter((flight) => flight.bookUrl);
  flights.sort((a, b) => a.price - b.price || a.transfers - b.transfers);

  let nearbyReturn = false;
  if (flights.length === 0 && wanted.returnDate) {
    const loose = { ...wanted, returnDate: undefined };
    const looseBatches = search.nonstop
      ? [fetchPricesForDates(loose, origin, destination, { omitReturnAt: true })]
      : [
          fetchPricesForDates(loose, origin, destination, { omitReturnAt: true }),
          fetchPricesForDates({ ...loose, nonstop: true }, origin, destination, { omitReturnAt: true }),
        ];
    const looseRows = (await Promise.all(looseBatches)).flat();
    flights = mapTravelpayoutsFlights(looseRows, wanted, "USD", travelpayoutsMarker(), "any-roundtrip").filter(
      (flight) => flight.bookUrl,
    );
    flights.sort((a, b) => a.price - b.price || a.transfers - b.transfers);
    nearbyReturn = flights.length > 0;
  }

  const result: TravelpayoutsFlightResult = {
    ok: true,
    mode: "live",
    flights,
    currency: "USD",
    nearbyReturn: nearbyReturn || undefined,
    message:
      flights.length === 0
        ? "No priced flights for those dates. Try other dates, or compare on Kayak."
        : nearbyReturn
          ? "No cached fare for that exact return date. These leave on your day — check the return, it may differ."
          : flights.length === 1
            ? "A recent fare for these dates."
            : `${flights.length} recent fares for these dates.`,
  };
  memoryCache.set(memoKey, { at: Date.now(), value: result });
  return result;
}
