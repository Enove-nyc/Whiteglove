/**
 * Where the Stay22 ID is kept.
 *
 * Its own key, like every other concern here. Redis is the earnings-screen
 * copy. STAY22_AID in the environment is the same ID, used when Redis has
 * none — so Kayak flights and hotels can still earn.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { AFFILIATE_CONFIG_TAG } from "@/lib/affiliate/config";
import { aidProblem, mergeStay22, stay22FromEnv, type Stay22Settings } from "@/lib/stay22";

const KEY = "white-glove:stay22";
export const STAY22_TAG = "stay22";

export function stay22StoreAvailable() {
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

async function readStored(): Promise<Stay22Settings> {
  const fromEnv = stay22FromEnv();
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return fromEnv;
  try {
    const stored = mergeStay22(JSON.parse(raw) as Partial<Stay22Settings>);
    // A saved ID wins. An empty store still earns via STAY22_AID.
    return stored.aid ? stored : { aid: fromEnv.aid, provider: stored.provider };
  } catch {
    return fromEnv;
  }
}

const cached = unstable_cache(readStored, ["stay22"], { tags: [STAY22_TAG], revalidate: 3600 });

/** For /book. Never throws. */
export async function readStay22(): Promise<Stay22Settings> {
  if (!stay22StoreAvailable()) return stay22FromEnv();
  return cached();
}

/** Uncached, for the admin screen. */
export async function readStay22Fresh(): Promise<Stay22Settings> {
  if (!stay22StoreAvailable()) return stay22FromEnv();
  return readStored();
}

export async function saveStay22(next: Stay22Settings): Promise<{ ok: boolean; message: string }> {
  if (!stay22StoreAvailable()) {
    return { ok: false, message: "This needs the private store connected. Ask for UPSTASH_REDIS_REST_URL and _TOKEN to be set." };
  }
  const problem = aidProblem(next.aid);
  if (problem) return { ok: false, message: problem };

  const keep = mergeStay22(next);
  if ((await redis(`set/${KEY}`, JSON.stringify(keep))) === null) {
    return { ok: false, message: "The private store could not be reached. Nothing was changed — try again." };
  }
  updateTag(STAY22_TAG);
  revalidatePath("/book");
  updateTag(AFFILIATE_CONFIG_TAG);
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: keep.aid
      ? "Saved. Hotel searches and Kayak flights now go through Stay22."
      : "Saved. Hotel searches open Booking.com directly again. Kayak flights earn only if a wrap is pasted below.",
  };
}
