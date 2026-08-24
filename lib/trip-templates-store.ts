/**
 * Where an advisor's saved trip templates are kept.
 *
 * MOVED OUT OF AccountData.templates, the same reason business-brand-store.ts
 * exists apart from the account record: an agency sharing templates needs its
 * own key, not one buried inside a blob that half a dozen unrelated routes
 * read and write whole. Losing this store loses a set of saved shapes, not a
 * login.
 *
 * AN AGENCY SHARES ONE POOL. A template one advisor on an agency built —
 * "Rome, four days, family of five" — should be there for every other
 * advisor on the same agency to start a client's trip from, the same way the
 * letterhead is shared. So the record this reads and writes is keyed by the
 * agency (lib/agency.ts) when the account belongs to one, and by the account
 * itself otherwise; every caller keeps passing its own account and never has
 * to know which.
 *
 * THE FIRST READ CARRIES OVER WHAT WAS SAVED BEFORE THIS EXISTED. Templates
 * used to live on the account record itself; an account that saved one
 * before this store existed does not lose it — see getTemplates in
 * lib/account-store.ts, which reads the old field once and writes it here.
 */

import { agencyIdFor } from "@/lib/agency-store";
import { identityKey } from "@/lib/identity";
import type { Itinerary } from "@/data/itinerary";

/**
 * An advisor's own trip, saved as a reusable shape — see lib/trip-templates.ts
 * for exactly what a template keeps and what it strips out of the trip it
 * was made from.
 */
export type SavedTemplate = {
  id: string;
  /** What the advisor called it — "Rome, four days, family of five". */
  name: string;
  itinerary: Itinerary;
  createdAt: string;
};

const PREFIX = "white-glove:trip-templates:";
const AGENCY_PREFIX = "white-glove:trip-templates:agency:";

export function templatesStoreAvailable() {
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

/** The record this account's templates actually live under — its own, or its agency's. */
async function keyFor(account: string): Promise<string> {
  const agencyId = await agencyIdFor(account);
  return agencyId ? `${AGENCY_PREFIX}${agencyId}` : `${PREFIX}${identityKey(account)}`;
}

export async function readTemplatesStore(account: string): Promise<SavedTemplate[]> {
  if (!account || !templatesStoreAvailable()) return [];
  const raw = await redis<string>(`get/${encodeURIComponent(await keyFor(account))}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((t): t is SavedTemplate => Boolean(t && t.id)) : [];
  } catch {
    return [];
  }
}

export async function writeTemplatesStore(account: string, templates: SavedTemplate[]): Promise<boolean> {
  if (!account || !templatesStoreAvailable()) return false;
  return (await redis(`set/${encodeURIComponent(await keyFor(account))}`, JSON.stringify(templates))) !== null;
}
