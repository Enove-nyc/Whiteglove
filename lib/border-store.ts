// What the owner has recorded about the border crossings.
//
// The crossings themselves ship with the site (data/border-crossings.ts) and
// need nothing connected. This holds only what somebody has checked — open or
// queueing or shut, how long, and the day they looked — plus any crossing they
// have added themselves.
//
// With no Redis there is simply nothing stored, every crossing reads
// "nobody has checked this one", and the route still says what it always said
// about the border. That is correct rather than degraded: unchecked is the
// truth until somebody checks.

import { BUILT_IN_CROSSINGS } from "@/data/border-crossings";
import { type Crossing, type StoredCrossing, mergeCrossings } from "@/lib/border-crossings";

const KEY = "white-glove:border-crossings";

export function borderStoreAvailable() {
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

async function readStored(): Promise<Record<string, StoredCrossing>> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, StoredCrossing>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStored(all: Record<string, StoredCrossing>): Promise<boolean> {
  return (await redis(`set/${KEY}`, JSON.stringify(all))) !== null;
}

/**
 * Every crossing, with whatever has been recorded on it.
 *
 * Never throws and never returns nothing: the built-in list is the floor, so a
 * store that is away costs the traveller the checks and not the crossings.
 */
export async function allCrossings(): Promise<Crossing[]> {
  const stored = borderStoreAvailable() ? await readStored() : {};
  return mergeCrossings(BUILT_IN_CROSSINGS, Object.values(stored));
}

export async function saveCrossing(row: StoredCrossing): Promise<{ ok: boolean; message: string }> {
  if (!row.id?.trim()) return { ok: false, message: "No crossing to save that against." };
  if (!borderStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected. Ask for UPSTASH_REDIS_REST_URL and _TOKEN to be set." };
  }
  const all = await readStored();
  // Merge rather than replace, so recording today's queue does not wipe the
  // note somebody wrote about the road last month.
  all[row.id] = { ...all[row.id], ...row, id: row.id };
  const ok = await writeStored(all);
  return ok
    ? { ok: true, message: `Saved ${row.name ?? "that crossing"}.` }
    : { ok: false, message: "Could not save it. Try again." };
}

/**
 * Forget what was recorded about a crossing.
 *
 * A built-in crossing comes back unchecked rather than disappearing — the road
 * is still there, and deleting a note is not a statement that the crossing has
 * gone. One the owner added is removed entirely.
 */
export async function clearCrossing(id: string): Promise<boolean> {
  if (!borderStoreAvailable()) return false;
  const all = await readStored();
  if (!(id in all)) return true;
  delete all[id];
  return writeStored(all);
}
