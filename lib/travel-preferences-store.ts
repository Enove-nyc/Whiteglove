/**
 * Where a traveller's own preferences are kept.
 *
 * ITS OWN KEY, next to app-prefs rather than inside the account blob. The
 * account record is read on nearly every request; this is read by the
 * preferences screen, the planner and the assistant, and writing it should not
 * mean rewriting a trip. Same shape as lib/app-prefs-store.ts, which is the
 * existing per-account setting and the pattern this follows.
 *
 * NOT CACHED. A traveller who unticks something and asks the assistant a
 * question in the next breath must not be answered from a copy taken an hour
 * ago. This is small and read rarely; correctness is worth more than the round
 * trip.
 */

import { identityKey } from "@/lib/identity";
import { cleanPreferences, emptyPreferences, type TravelPreferences } from "@/data/travel-preferences";

const PREFIX = "white-glove:travel-preferences:";

export function travelPreferencesStoreAvailable() {
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
    const payload = (await res.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

const key = (account: string) => encodeURIComponent(`${PREFIX}${identityKey(account)}`);

export async function getTravelPreferences(account: string): Promise<TravelPreferences> {
  if (!account || !travelPreferencesStoreAvailable()) return emptyPreferences();
  const raw = await redis<string>(`get/${key(account)}`);
  if (!raw) return emptyPreferences();
  try {
    // Cleaned on the way OUT as well as in. A value that stopped being one of
    // the options — a list edited in a later release — must not still reach an
    // assistant's prompt because it was legal when it was written.
    return cleanPreferences(JSON.parse(raw));
  } catch {
    return emptyPreferences();
  }
}

export async function saveTravelPreferences(account: string, input: unknown): Promise<TravelPreferences | null> {
  if (!account || !travelPreferencesStoreAvailable()) return null;
  const next = { ...cleanPreferences(input), updatedAt: new Date().toISOString() };
  const wrote = await redis(`set/${key(account)}`, JSON.stringify(next));
  return wrote === null ? null : next;
}

/**
 * Forget everything. The delete half of "see, edit or remove", and it really
 * deletes rather than writing an empty record over the top.
 */
export async function forgetTravelPreferences(account: string): Promise<boolean> {
  if (!account || !travelPreferencesStoreAvailable()) return false;
  return (await redis(`del/${key(account)}`)) !== null;
}
