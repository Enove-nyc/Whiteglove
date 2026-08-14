/**
 * Where the travel-gear shelf is kept.
 *
 * Same shape as lib/travel-extras-store.ts: its own key, cached for the
 * public read, uncached for the screen that has to show what was just saved.
 *
 * With no Redis there is nothing stored. The public page still exists and
 * points at the rest of "before you go" until a finished item is saved.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { gearListProblem, type TravelGearItem } from "@/lib/travel-gear";

const KEY = "white-glove:travel-gear";
export const GEAR_TAG = "travel-gear";

export function gearStoreAvailable() {
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

async function readStored(): Promise<TravelGearItem[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TravelGearItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const cached = unstable_cache(readStored, ["travel-gear"], { tags: [GEAR_TAG], revalidate: 3600 });

/** For the public page. Never throws. */
export async function readGear(): Promise<TravelGearItem[]> {
  if (!gearStoreAvailable()) return [];
  return cached();
}

/** Uncached, for the admin screen. */
export async function readGearFresh(): Promise<TravelGearItem[]> {
  if (!gearStoreAvailable()) return [];
  return readStored();
}

export async function saveGear(next: TravelGearItem[]): Promise<{ ok: boolean; message: string }> {
  if (!gearStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected. Ask for UPSTASH_REDIS_REST_URL and _TOKEN to be set." };
  }
  const problem = gearListProblem(next);
  if (problem) return { ok: false, message: problem };

  if ((await redis(`set/${KEY}`, JSON.stringify(next))) === null) {
    return { ok: false, message: "The private store could not be reached. Nothing was changed — try again." };
  }
  updateTag(GEAR_TAG);
  revalidatePath("/travel-gear");

  if (next.length === 0) return { ok: true, message: "Saved. The shelf is empty until something is finished." };
  return { ok: true, message: `Saved. ${next.length} ${next.length === 1 ? "item is" : "items are"} saved (finished ones are on the page).` };
}
