import type { HealthState } from "@/lib/health-checks";

/**
 * Last night's answers. Server only.
 *
 * Small enough to be one key: four checks, each a boolean, a sentence and a
 * timestamp. Kept so the next run can tell a thing that has JUST stopped
 * working from one that was already broken — which is the whole difference
 * between a useful email and a nightly one.
 */

const KEY = "white-glove:health";

function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function healthStoreAvailable() {
  return Boolean(config());
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const configured = config();
  if (!configured) return null;
  try {
    const res = await fetch(`${configured.url}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${configured.token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return ((await res.json()) as { result?: T }).result ?? null;
  } catch {
    return null;
  }
}

export async function readHealth(): Promise<HealthState> {
  const raw = await redis<string>(`get/${encodeURIComponent(KEY)}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as HealthState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeHealth(state: HealthState): Promise<boolean> {
  return (await redis(`set/${encodeURIComponent(KEY)}`, JSON.stringify(state))) !== null;
}
