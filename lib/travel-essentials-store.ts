/**
 * Persisted Travel Essentials settings (enable/disable, URLs, order, placements).
 *
 * Same Redis pattern as travel extras and earnings links. Without Redis the
 * public section stays empty — never broken placeholders.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import {
  defaultTravelEssentials,
  mergeTravelEssentials,
  type TravelEssentialsSettings,
} from "@/lib/travel-essentials";

/** Must match AFFILIATE_CONFIG_TAG in lib/affiliate/config.ts — not imported (avoids a cycle). */
const AFFILIATE_CONFIG_TAG = "affiliate-config";

const KEY = "white-glove:travel-essentials";
export const TRAVEL_ESSENTIALS_TAG = "travel-essentials";

export function travelEssentialsStoreAvailable() {
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

async function readStored(): Promise<TravelEssentialsSettings> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return defaultTravelEssentials();
  try {
    return mergeTravelEssentials(JSON.parse(raw));
  } catch {
    return defaultTravelEssentials();
  }
}

const cached = unstable_cache(readStored, ["travel-essentials"], {
  tags: [TRAVEL_ESSENTIALS_TAG],
  revalidate: 3600,
});

export async function readTravelEssentials(): Promise<TravelEssentialsSettings> {
  if (!travelEssentialsStoreAvailable()) return defaultTravelEssentials();
  // Merge again after the cache: a blob merged under an older catalogue will
  // not have keys for services added since, and those missing rows used to
  // crash every page that sorts Travel Essentials.
  return mergeTravelEssentials(await cached());
}

export async function readTravelEssentialsFresh(): Promise<TravelEssentialsSettings> {
  if (!travelEssentialsStoreAvailable()) return defaultTravelEssentials();
  return readStored();
}

export async function saveTravelEssentials(
  next: TravelEssentialsSettings,
): Promise<{ ok: boolean; message: string }> {
  if (!travelEssentialsStoreAvailable()) {
    return {
      ok: false,
      message: "This needs the private store connected. Ask for UPSTASH_REDIS_REST_URL and _TOKEN to be set.",
    };
  }
  const settings = mergeTravelEssentials({
    ...next,
    updatedAt: new Date().toISOString(),
  });
  if ((await redis(`set/${KEY}`, JSON.stringify(settings))) === null) {
    return { ok: false, message: "The private store could not be reached. Nothing was changed — try again." };
  }
  updateTag(TRAVEL_ESSENTIALS_TAG);
  updateTag(AFFILIATE_CONFIG_TAG);
  revalidatePath("/admin/settings/travel-essentials");
  revalidatePath("/book");
  revalidatePath("/itinerary");
  revalidatePath("/destinations");
  return { ok: true, message: "Travel Essentials saved." };
}
