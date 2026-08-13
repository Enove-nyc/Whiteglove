/**
 * Travelpayouts Flight Search API — live Aviasales offers for /book.
 *
 * This is NOT the Data API cheapest-cache (`prices_for_dates` / v2/prices/cheap).
 * That dump is why a route can show 2 rows here and 50+ on aviasales.com.
 *
 * Live search (Nov 2025):
 *   POST https://tickets-api.travelpayouts.com/search/affiliate/start
 *   POST {results_url}/search/affiliate/results  until is_over
 *   GET  {results_url}/searches/{search_id}/clicks/{proposal_id}
 *
 * Access is marker-gated. A 403 or empty list is an honest miss — the Aviasales
 * widget still has the full board. Never invent fares.
 *
 * Docs: https://support.travelpayouts.com/hc/en-us/articles/30565016140434
 */

import { createHash } from "crypto";
import { airlineCode, airlineHeading, flightNumberLabel } from "@/lib/airline-names";
import { SITE_DOMAIN } from "@/lib/features";
import { travelpayoutsMarker } from "@/lib/travelpayouts-api";
import type { TravelpayoutsFlightOption } from "@/lib/travelpayouts-api";

const SEARCH_API = "https://tickets-api.travelpayouts.com";
const MAX_TICKETS = 50;
const MAX_POLLS = 10;
const POLL_MS = 1200;
const START_WAIT_MS = 1500;

export type SearchDirection = { origin: string; destination: string; date: string };

export type LiveFlightSearch = {
  directions: SearchDirection[];
  nonstop?: boolean;
  adults?: number;
  userIp?: string;
};

function token(): string {
  return process.env.TRAVELPAYOUTS_TOKEN?.trim() ?? "";
}

function marker(): string {
  return travelpayoutsMarker();
}

function collectValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectValues);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .flatMap((key) => collectValues((value as Record<string, unknown>)[key]));
  }
  if (value === undefined || value === null) return [];
  return [String(value)];
}

/** MD5 signature the Flight Search API requires. Exported for tests. */
export function flightSearchSignature(apiToken: string, params: Record<string, unknown>): string {
  const raw = `${apiToken}:${collectValues(params).join(":")}`;
  return createHash("md5").update(raw).digest("hex");
}

function headers(apiToken: string, signature: string, userIp: string, extra: Record<string, string> = {}): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-real-host": SITE_DOMAIN,
    "x-user-ip": userIp,
    "x-signature": signature,
    "x-affiliate-user-id": apiToken,
    ...extra,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clock(iso?: string): string | undefined {
  const match = iso?.match(/T(\d{2}:\d{2})/);
  return match?.[1];
}

function minutesBetween(fromIso?: string, toIso?: string): number | undefined {
  if (!fromIso || !toIso) return undefined;
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return undefined;
  return Math.round((to - from) / 60_000);
}

function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
}

type FlightLeg = {
  origin?: string;
  destination?: string;
  local_departure_date_time?: string;
  local_arrival_date_time?: string;
  operating_carrier_designator?: { carrier_code?: string; number?: string | number };
};

type SearchTicket = {
  segments?: Array<{ flights?: Array<number | FlightLeg>; transfers?: unknown[] }>;
  proposals?: Array<{ id?: string; price?: { amount?: number; currency?: string }; agent_id?: string }>;
};

function resolveLeg(ref: number | FlightLeg | undefined, legs: FlightLeg[]): FlightLeg | undefined {
  if (ref && typeof ref === "object") return ref;
  if (typeof ref === "number" && legs[ref]) return legs[ref];
  return undefined;
}

function stopDetailFromTicket(ticket: SearchTicket, legs: FlightLeg[]): string {
  const parts: string[] = [];
  for (const segment of ticket.segments ?? []) {
    const flights = (segment.flights ?? []).map((ref) => resolveLeg(ref, legs)).filter((leg): leg is FlightLeg => Boolean(leg));
    for (let i = 0; i < flights.length - 1; i++) {
      const arrive = flights[i];
      const leave = flights[i + 1];
      const city = (arrive.destination ?? "").toUpperCase();
      if (!/^[A-Z]{3}$/.test(city)) continue;
      const wait = minutesBetween(arrive.local_arrival_date_time, leave.local_departure_date_time);
      const arriveAt = clock(arrive.local_arrival_date_time);
      const leaveAt = clock(leave.local_departure_date_time);
      const waitText = wait != null ? `, ${durationLabel(wait)} wait` : "";
      const times = [arriveAt ? `arrive ${arriveAt}` : null, leaveAt ? `leave ${leaveAt}` : null].filter(Boolean).join(", ");
      parts.push(`${city}${times ? ` (${times}${waitText})` : waitText}`);
    }
  }
  return parts.join("; ");
}

function transfersOn(ticket: SearchTicket): number {
  let total = 0;
  for (const segment of ticket.segments ?? []) {
    if (Array.isArray(segment.transfers) && segment.transfers.length) {
      total += segment.transfers.length;
      continue;
    }
    const hops = segment.flights?.length ?? 1;
    total += Math.max(0, hops - 1);
  }
  return total;
}

export function offerHref(searchId: string, proposalId: string): string {
  const query = new URLSearchParams({ sid: searchId, pid: proposalId });
  return `/api/partners/flights/offer?${query.toString()}`;
}

export function mapLiveTickets(
  tickets: SearchTicket[],
  legs: FlightLeg[],
  searchId: string,
  airlines: Array<{ iata?: string; name?: string }>,
): TravelpayoutsFlightOption[] {
  const airlineNames = new Map(
    airlines.map((row) => [airlineCode(row.iata), (row.name ?? "").trim()]).filter((entry): entry is [string, string] => Boolean(entry[0])),
  );
  const out: TravelpayoutsFlightOption[] = [];
  const seen = new Set<string>();

  for (const ticket of tickets) {
    const proposals = (ticket.proposals ?? []).filter((p) => p.id && Number.isFinite(Number(p.price?.amount)));
    if (!proposals.length) continue;
    const best = proposals.reduce((a, b) => (Number(a.price?.amount) <= Number(b.price?.amount) ? a : b));
    const firstSeg = ticket.segments?.[0];
    const firstLeg = resolveLeg(firstSeg?.flights?.[0], legs);
    const lastOutbound = resolveLeg(firstSeg?.flights?.[(firstSeg?.flights?.length ?? 1) - 1], legs);
    const carrier = airlineCode(firstLeg?.operating_carrier_designator?.carrier_code);
    const number = String(firstLeg?.operating_carrier_designator?.number ?? "").trim();
    const from = (firstLeg?.origin ?? "").toUpperCase();
    const to = (lastOutbound?.destination ?? "").toUpperCase();
    const departDate = (firstLeg?.local_departure_date_time ?? "").slice(0, 10);
    const departTime = clock(firstLeg?.local_departure_date_time);
    const transfers = transfersOn(ticket);
    const price = Number(best.price?.amount);
    const currency = (best.price?.currency ?? "USD").toUpperCase();
    const id = `${searchId}-${best.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const named = airlineNames.get(carrier) || airlineHeading(carrier);
    const summary = [flightNumberLabel(carrier, number) || null, from && to ? `${from} → ${to}` : null, departTime ?? null]
      .filter(Boolean)
      .join(" · ");
    const stopDetail = stopDetailFromTicket(ticket, legs);
    out.push({
      id,
      origin: from,
      destination: to,
      departDate,
      airline: carrier || undefined,
      airlineName: named,
      flightNumber: number || undefined,
      departTime,
      transfers,
      durationMinutes: minutesBetween(firstLeg?.local_departure_date_time, lastOutbound?.local_arrival_date_time),
      price,
      currency,
      summary,
      bookUrl: offerHref(searchId, String(best.id)),
      offerPath: undefined,
      stopDetail: stopDetail || undefined,
    });
    if (out.length >= MAX_TICKETS) break;
  }
  return out;
}

async function startSearch(search: LiveFlightSearch, apiToken: string, partnerMarker: string, userIp: string): Promise<{ searchId: string; resultsUrl: string } | null> {
  const body: Record<string, unknown> = {
    marker: partnerMarker,
    locale: "en",
    search_params: {
      trip_class: "Y",
      passengers: {
        adults: Math.max(1, Math.min(9, Number(search.adults) || 1)),
        children: 0,
        infants: 0,
      },
      directions: search.directions.map((leg) => ({
        origin: leg.origin,
        destination: leg.destination,
        date: leg.date,
      })),
    },
  };
  const signature = flightSearchSignature(apiToken, body);
  const payload = { ...body, signature };
  let response: Response;
  try {
    response = await fetch(`${SEARCH_API}/search/affiliate/start`, {
      method: "POST",
      headers: headers(apiToken, signature, userIp),
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return null;
  }
  if (!response.ok) {
    console.warn(`Travelpayouts Flight Search start HTTP ${response.status}`);
    return null;
  }
  const data = (await response.json().catch(() => null)) as { search_id?: string; results_url?: string } | null;
  const searchId = data?.search_id?.trim();
  if (!searchId) return null;
  const resultsUrl = (data.results_url?.trim() || SEARCH_API).replace(/\/$/, "");
  rememberSearch(searchId, resultsUrl);
  return { searchId, resultsUrl };
}

const searchHosts = new Map<string, { resultsUrl: string; at: number }>();

function rememberSearch(searchId: string, resultsUrl: string) {
  searchHosts.set(searchId, { resultsUrl, at: Date.now() });
}

export function resultsUrlFor(searchId: string): string | undefined {
  const hit = searchHosts.get(searchId);
  if (!hit) return SEARCH_API;
  if (Date.now() - hit.at > 14 * 60_000) {
    searchHosts.delete(searchId);
    return undefined;
  }
  return hit.resultsUrl;
}

async function pollResults(
  apiToken: string,
  resultsUrl: string,
  searchId: string,
  userIp: string,
): Promise<{ tickets: SearchTicket[]; legs: FlightLeg[]; airlines: Array<{ iata?: string; name?: string }> }> {
  const tickets: SearchTicket[] = [];
  const legs: FlightLeg[] = [];
  const airlines: Array<{ iata?: string; name?: string }> = [];
  let last = 0;
  await sleep(START_WAIT_MS);
  for (let i = 0; i < MAX_POLLS; i++) {
    const body = { search_id: searchId, last_update_timestamp: last };
    const signature = flightSearchSignature(apiToken, body);
    let response: Response;
    try {
      response = await fetch(`${resultsUrl}/search/affiliate/results`, {
        method: "POST",
        headers: headers(apiToken, signature, userIp),
        body: JSON.stringify(body),
        cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      });
    } catch {
      await sleep(POLL_MS);
      continue;
    }
    if (response.status === 304) {
      await sleep(POLL_MS);
      continue;
    }
    if (!response.ok) break;
    const data = (await response.json().catch(() => null)) as {
      tickets?: SearchTicket[];
      flight_legs?: FlightLeg[];
      airlines?: Array<{ iata?: string; name?: string }>;
      last_update_timestamp?: number;
      is_over?: boolean;
    } | null;
    if (!data) break;
    tickets.push(...(data.tickets ?? []));
    legs.push(...(data.flight_legs ?? []));
    airlines.push(...(data.airlines ?? []));
    last = Number(data.last_update_timestamp) || last;
    if (data.is_over || tickets.length >= MAX_TICKETS) break;
    await sleep(POLL_MS);
  }
  return { tickets, legs, airlines };
}

export type LiveSearchResult =
  | { ok: true; flights: TravelpayoutsFlightOption[]; currency: string; message: string; searchId: string }
  | { ok: false; reason: "gated" | "empty" | "unconfigured" };

/**
 * Live offers for this itinerary, or a reason we cannot list them.
 * Does not invent rows and does not fall back to the cheapest-cache dump.
 */
export async function searchLiveAviasalesFlights(search: LiveFlightSearch): Promise<LiveSearchResult> {
  const apiToken = token();
  const partnerMarker = marker();
  if (!apiToken || !partnerMarker) return { ok: false, reason: "unconfigured" };
  if (!search.directions.length) return { ok: false, reason: "empty" };

  const userIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(search.userIp ?? "") ? search.userIp! : "127.0.0.1";
  const started = await startSearch(search, apiToken, partnerMarker, userIp);
  if (!started) return { ok: false, reason: "gated" };

  const { tickets, legs, airlines } = await pollResults(apiToken, started.resultsUrl, started.searchId, userIp);
  let flights = mapLiveTickets(tickets, legs, started.searchId, airlines);
  if (search.nonstop) flights = flights.filter((flight) => flight.transfers === 0);
  if (!flights.length) return { ok: false, reason: "empty" };

  flights.sort((a, b) => a.price - b.price || a.transfers - b.transfers);
  return {
    ok: true,
    flights,
    currency: flights[0]?.currency ?? "USD",
    searchId: started.searchId,
    message: flights.length === 1 ? "A live fare for these dates." : `${flights.length} live fares for these dates.`,
  };
}

export async function resolveOfferClick(searchId: string, proposalId: string, userIp = "127.0.0.1"): Promise<string | null> {
  const apiToken = token();
  const partnerMarker = marker();
  if (!apiToken || !partnerMarker) return null;
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(searchId) || !/^[a-zA-Z0-9_-]{1,80}$/.test(proposalId)) return null;
  const resultsUrl = resultsUrlFor(searchId);
  if (!resultsUrl || !/^https:\/\/([a-z0-9-]+\.)*travelpayouts\.com$/i.test(resultsUrl)) return null;
  const ip = /^\d{1,3}(\.\d{1,3}){3}$/.test(userIp) ? userIp : "127.0.0.1";
  let response: Response;
  try {
    response = await fetch(`${resultsUrl}/searches/${encodeURIComponent(searchId)}/clicks/${encodeURIComponent(proposalId)}`, {
      method: "GET",
      headers: headers(apiToken, "", ip, { "x-marker": partnerMarker }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      redirect: "manual",
    });
  } catch {
    return null;
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (location?.startsWith("https://")) return location;
  }
  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as { url?: string } | null;
  const url = data?.url?.trim() ?? "";
  if (!url.startsWith("https://")) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) return null;
  } catch {
    return null;
  }
  return url;
}

export function liveStopDetail(ticket: SearchTicket, legs: FlightLeg[]): string {
  return stopDetailFromTicket(ticket, legs);
}
