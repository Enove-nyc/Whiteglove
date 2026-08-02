/**
 * Where the owner's airports and city groups are kept.
 *
 * Its own key, and never data/airports.ts. The built-in list is a file in the
 * repository and stays one — readable, reviewable, and impossible to damage
 * from a form. What the owner adds is stored beside it and merged on read.
 */

import { type AirportEdits, EMPTY_EDITS } from "@/lib/airport-admin";

const KEY = "white-glove:airport-edits";

export function airportStoreAvailable() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return ((await res.json()) as { result?: T }).result ?? null;
  } catch {
    return null;
  }
}

/**
 * What the owner has added.
 *
 * Never throws and never returns nothing useful: an unreachable store gives an
 * empty set, which means the site falls back to its hundred built-in airports
 * rather than to none.
 */
export async function readAirportEdits(): Promise<AirportEdits> {
  if (!airportStoreAvailable()) return EMPTY_EDITS;
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return EMPTY_EDITS;
  try {
    const parsed = JSON.parse(raw) as AirportEdits;
    return {
      airports: Array.isArray(parsed?.airports) ? parsed.airports : [],
      metros: Array.isArray(parsed?.metros) ? parsed.metros : [],
    };
  } catch {
    return EMPTY_EDITS;
  }
}

export async function writeAirportEdits(edits: AirportEdits): Promise<boolean> {
  if (!airportStoreAvailable()) return false;
  return (await redis(`set/${KEY}`, JSON.stringify(edits))) !== null;
}
