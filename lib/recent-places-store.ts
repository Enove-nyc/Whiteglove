/**
 * The short list of pages somebody was last on, per account.
 *
 * Its own key, and deliberately nowhere near the preferences: one is what a
 * traveller told us and the other is only where they have been, and the day
 * those two share a home is the day one starts feeding the other.
 */

import { identityKey } from "@/lib/identity";
import { MAX_RECENT, recentToShow, withVisit, type RecentPlace } from "@/data/recent-places";

const PREFIX = "white-glove:recent-places:";

export function recentPlacesStoreAvailable() {
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

function clean(raw: unknown): RecentPlace[] {
  if (!Array.isArray(raw)) return [];
  const out: RecentPlace[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    if (typeof e.href !== "string" || typeof e.name !== "string" || typeof e.at !== "string") continue;
    out.push({ href: e.href, name: e.name, where: typeof e.where === "string" ? e.where : "", at: e.at });
  }
  return out.slice(0, MAX_RECENT);
}

export async function readRecentPlaces(account: string, now = new Date().toISOString()): Promise<RecentPlace[]> {
  if (!account || !recentPlacesStoreAvailable()) return [];
  const raw = await redis<string>(`get/${key(account)}`);
  if (!raw) return [];
  try {
    return recentToShow(clean(JSON.parse(raw)), now);
  } catch {
    return [];
  }
}

/** Best effort: nobody's page should fail because a breadcrumb did not save. */
export async function rememberVisit(account: string, entry: RecentPlace): Promise<void> {
  if (!account || !recentPlacesStoreAvailable()) return;
  const now = new Date().toISOString();
  const raw = await redis<string>(`get/${key(account)}`);
  let current: RecentPlace[] = [];
  try {
    current = raw ? clean(JSON.parse(raw)) : [];
  } catch {
    current = [];
  }
  await redis(`set/${key(account)}`, JSON.stringify(withVisit(current, entry, now)));
}

/** Forget the lot. The other half of showing somebody what is kept. */
export async function forgetRecentPlaces(account: string): Promise<boolean> {
  if (!account || !recentPlacesStoreAvailable()) return false;
  return (await redis(`del/${key(account)}`)) !== null;
}
