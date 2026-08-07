/**
 * Where the extras are kept.
 *
 * Same shape as the words and the search links: its own key, cached for the
 * public read, uncached for the screen that has to show what was just saved.
 *
 * With no Redis there is nothing stored and the booking page simply has no
 * extras section, which is where the site already was.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { listProblem, type TravelExtra } from "@/lib/travel-extras";

const KEY = "white-glove:travel-extras";
export const EXTRAS_TAG = "travel-extras";

export function extrasStoreAvailable() {
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

async function readStored(): Promise<TravelExtra[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TravelExtra[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const cached = unstable_cache(readStored, ["travel-extras"], { tags: [EXTRAS_TAG], revalidate: 3600 });

/** For the public page. Never throws. */
export async function readExtras(): Promise<TravelExtra[]> {
  if (!extrasStoreAvailable()) return [];
  return cached();
}

/** Uncached, for the admin screen. */
export async function readExtrasFresh(): Promise<TravelExtra[]> {
  if (!extrasStoreAvailable()) return [];
  return readStored();
}

export async function saveExtras(next: TravelExtra[]): Promise<{ ok: boolean; message: string }> {
  if (!extrasStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected. Ask for UPSTASH_REDIS_REST_URL and _TOKEN to be set." };
  }
  const problem = listProblem(next);
  if (problem) return { ok: false, message: problem };

  if ((await redis(`set/${KEY}`, JSON.stringify(next))) === null) {
    return { ok: false, message: "The private store could not be reached. Nothing was changed — try again." };
  }
  updateTag(EXTRAS_TAG);
  // /book is where they show, and it is rendered ahead of time like the rest.
  revalidatePath("/book");

  if (next.length === 0) return { ok: true, message: "Saved. Nothing extra is being offered." };
  return { ok: true, message: `Saved. ${next.length} ${next.length === 1 ? "offer is" : "offers are"} on the booking page.` };
}
