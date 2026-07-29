import { NextRequest, NextResponse } from "next/server";
import { apiKey } from "@/lib/api-key";

// Driving times for the itinerary planner, worked out on the server.
//
// Two engines, in order of preference:
//
//   1. Google Routes API, when GOOGLE_MAPS_API_KEY is set. Asked with
//      routingPreference TRAFFIC_AWARE and a departure time, which is the same
//      predictive-traffic model Google Maps itself uses — so the planner shows
//      the number the traveler would see if they typed the route into Maps.
//   2. OSRM, the open router, when there is no key. OSRM routes on speed
//      limits with no traffic at all, so it comes out optimistic on exactly the
//      roads this site sends people down. Its answers are reported as
//      estimates, never as Maps times.
//
// Running this server-side (rather than from the browser, as it used to) keeps
// the API key private, sidesteps the routing hosts' CORS rules, and lets one
// answer be cached for every traveler planning the same leg.

export const runtime = "nodejs";

// GOOGLE_ROUTES_URL exists so this path can be exercised against a stub without
// spending real Routes API quota; production leaves it unset.
const GOOGLE_ROUTES = process.env.GOOGLE_ROUTES_URL?.trim() || "https://routes.googleapis.com/directions/v2:computeRoutes";

// The public OSRM demo server is fair-use only and has no uptime promise, so
// OSRM_ROUTER_URL lets a self-hosted instance be pointed at instead. Also what
// the tests aim at a local stub.
const OSRM = process.env.OSRM_ROUTER_URL?.trim() || "https://router.project-osrm.org/route/v1/driving/";

/** Matches travelLegKey() in data/itinerary.ts and legKey() in lib/road-times.ts. */
function legKey(from: string, to: string): string {
  return `${from.trim()}>${to.trim()}`;
}

type LatLng = { lat: number; lng: number };

function parseCoords(value: string): LatLng | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/**
 * When to ask Google to drive it. Traffic-aware routing needs a departure time
 * in the future, and the answer is only as representative as the moment picked:
 * a Tuesday mid-morning is an ordinary driving day, where a Friday rush hour or
 * a Sunday dawn is not. If the traveler's own date is still ahead, use that —
 * their trip is the day that actually matters.
 */
function departureTime(date?: string): string {
  const now = Date.now();
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const planned = Date.parse(`${date}T09:00:00Z`);
    if (Number.isFinite(planned) && planned > now + 60_000) return new Date(planned).toISOString();
  }
  // Next Tuesday, 09:00 UTC.
  const d = new Date(now);
  d.setUTCHours(9, 0, 0, 0);
  const daysAhead = (2 - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString();
}

async function googleChain(chain: LatLng[], date?: string, signal?: AbortSignal): Promise<number[] | null> {
  // Cleaned rather than trimmed: an invisible character pasted into the
  // variable makes fetch throw while building the header, and that throw would
  // propagate out of here instead of falling back to the open router.
  // See lib/api-key.ts.
  const key = apiKey("GOOGLE_MAPS_API_KEY");
  if (!key) return null;
  const point = (p: LatLng) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
  const res = await fetch(GOOGLE_ROUTES, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.legs.duration",
    },
    body: JSON.stringify({
      origin: point(chain[0]),
      destination: point(chain[chain.length - 1]),
      intermediates: chain.slice(1, -1).map(point),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      departureTime: departureTime(date),
      units: "METRIC",
    }),
  });
  if (!res.ok) {
    console.error("[route-times] Google Routes returned", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return null;
  }
  const data = (await res.json()) as { routes?: Array<{ legs?: Array<{ duration?: string }> }> };
  const legs = data.routes?.[0]?.legs;
  if (!legs || legs.length !== chain.length - 1) return null;
  const out: number[] = [];
  for (const leg of legs) {
    const seconds = Number(/^(\d+(?:\.\d+)?)s$/.exec(leg.duration ?? "")?.[1]);
    if (!Number.isFinite(seconds)) return null;
    out.push(seconds / 60);
  }
  return out;
}

async function osrmChain(chain: LatLng[], signal?: AbortSignal): Promise<number[] | null> {
  const path = chain.map((p) => `${p.lng},${p.lat}`).join(";");
  const res = await fetch(`${OSRM}${path}?overview=false`, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { code?: string; routes?: Array<{ legs?: Array<{ duration?: number }> }> };
  const legs = data.routes?.[0]?.legs;
  if (data.code !== "Ok" || !legs || legs.length !== chain.length - 1) return null;
  const out: number[] = [];
  for (const leg of legs) {
    if (typeof leg.duration !== "number") return null;
    out.push(leg.duration / 60);
  }
  return out;
}

// A short-lived cache. Roads do not change hour to hour, and one traveler
// re-planning a route should not re-bill the same leg over and over.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 4000;
const cache = new Map<string, { minutes: number; source: Source; at: number }>();

type Source = "google" | "osrm";

function cacheGet(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit;
}

function cacheSet(key: string, minutes: number, source: Source) {
  if (cache.size >= CACHE_MAX) {
    // Drop the oldest insertion; Map preserves insertion order.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { minutes, source, at: Date.now() });
}

/**
 * Parking, finding the entrance and setting off again. Real and unavoidable,
 * and left out of every routing engine's door-to-door number.
 */
const STOP_OVERHEAD_MINS = 10;

const MAX_CHAINS = 40;
const MAX_CHAIN_POINTS = 25; // Google's intermediate-waypoint ceiling

export async function POST(request: NextRequest) {
  let body: { chains?: unknown; date?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const rawChains = Array.isArray(body.chains) ? body.chains : [];
  const date = typeof body.date === "string" ? body.date : undefined;
  if (!rawChains.length) return NextResponse.json({ times: {}, sources: {}, engine: null });

  const times: Record<string, number> = {};
  const sources: Record<string, Source> = {};
  let engine: Source | null = null;
  let anyFailed = false;

  // One overall budget: a slow router must never hold up the planner.
  const signal = AbortSignal.timeout(12_000);

  for (const raw of rawChains.slice(0, MAX_CHAINS)) {
    if (!Array.isArray(raw)) continue;
    const labels = raw.filter((v): v is string => typeof v === "string").slice(0, MAX_CHAIN_POINTS);
    const points = labels.map(parseCoords);
    if (points.length < 2 || points.some((p) => !p)) continue;
    const chain = points as LatLng[];

    // Anything already cached is free; only ask about the rest.
    const needed = labels.slice(1).some((to, i) => !cacheGet(legKey(labels[i], to)));
    if (!needed) {
      labels.slice(1).forEach((to, i) => {
        const hit = cacheGet(legKey(labels[i], to))!;
        times[legKey(labels[i], to)] = hit.minutes;
        sources[legKey(labels[i], to)] = hit.source;
        engine ??= hit.source;
      });
      continue;
    }

    let minutes: number[] | null = null;
    let source: Source = "google";
    try {
      minutes = await googleChain(chain, date, signal);
    } catch (error) {
      console.error("[route-times] Google Routes failed:", error);
    }
    if (!minutes) {
      source = "osrm";
      try {
        minutes = await osrmChain(chain, signal);
      } catch (error) {
        console.error("[route-times] OSRM failed:", error);
      }
    }
    if (!minutes) {
      anyFailed = true;
      continue;
    }

    minutes.forEach((m, i) => {
      const key = legKey(labels[i], labels[i + 1]);
      const total = Math.round(m) + STOP_OVERHEAD_MINS;
      times[key] = total;
      sources[key] = source;
      cacheSet(key, total, source);
    });
    engine ??= source;
  }

  return NextResponse.json({ times, sources, engine, partial: anyFailed });
}
