/**
 * Where the provider stages are kept, and how the rest of the site reads them.
 *
 * Same shape as the site's other settings stores: read through a tagged cache
 * so a page does not pay for a round trip, cleared the moment the owner saves.
 */

import { unstable_cache, updateTag } from "next/cache";
import { DEFAULT_STAGES, type ProviderStages } from "@/lib/travel/registry";

export const TRAVEL_STAGES_TAG = "travel-provider-stages";
const KEY = "white-glove:travel-provider-stages";

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis<T>(command: string): Promise<{ result: T } | undefined> {
  const config = redisConfig();
  if (!config) return undefined;
  try {
    const response = await fetch(`${config.url}/${command}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    return (await response.json()) as { result: T };
  } catch {
    return undefined;
  }
}

const cached = unstable_cache(
  async (): Promise<ProviderStages> => {
    const stored = await redis<string>(`get/${encodeURIComponent(KEY)}`);
    if (!stored?.result) return { ...DEFAULT_STAGES };
    try {
      const parsed = JSON.parse(stored.result) as ProviderStages;
      // Stored values win, but anything never saved falls back to the default,
      // so a provider added in code later is not silently off.
      return { ...DEFAULT_STAGES, ...parsed };
    } catch {
      return { ...DEFAULT_STAGES };
    }
  },
  ["travel-provider-stages"],
  { tags: [TRAVEL_STAGES_TAG], revalidate: 3600 },
);

export async function readProviderStages(): Promise<ProviderStages> {
  return cached();
}

export async function writeProviderStages(stages: ProviderStages): Promise<boolean> {
  const ok = await redis(`set/${encodeURIComponent(KEY)}/${encodeURIComponent(JSON.stringify(stages))}`);
  // updateTag, not revalidateTag: revalidateTag serves the stale copy once more
  // and refreshes behind it, so the owner would turn a provider off, reload,
  // and see it still on. See the same note in lib/site-words-store.ts.
  updateTag(TRAVEL_STAGES_TAG);
  return Boolean(ok);
}
