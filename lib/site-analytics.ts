type RedisResult<T> = { result?: T };

export type DashboardStats = {
  configured: boolean;
  visits: number;
  topSearches: Array<{ label: string; count: number }>;
  topPages: Array<{ label: string; count: number }>;
  siteLocked: boolean;
};

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis<T>(command: string) {
  const config = redisConfig();
  if (!config) return undefined;
  const response = await fetch(`${config.url}/${command}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });
  if (!response.ok) return undefined;
  return (await response.json()) as RedisResult<T>;
}

function cleanLabel(value: string, limit = 80) {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

export function analyticsIsConfigured() {
  return Boolean(redisConfig());
}

export async function trackPageView(pathname: string) {
  const path = cleanLabel(pathname, 120);
  if (!path.startsWith("/")) return;
  await Promise.all([
    redis(`incr/white-glove:visits:all`),
    redis(`zincrby/white-glove:pages/1/${encodeURIComponent(path)}`),
  ]);
}

export async function trackSearch(query: string) {
  const term = cleanLabel(query);
  if (term.length < 2) return;
  await redis(`zincrby/white-glove:searches/1/${encodeURIComponent(term)}`);
}

function pairs(values: unknown): Array<{ label: string; count: number }> {
  if (!Array.isArray(values)) return [];
  const output: Array<{ label: string; count: number }> = [];
  for (let index = 0; index < values.length; index += 2) {
    const label = values[index];
    const count = Number(values[index + 1]);
    if (typeof label === "string" && Number.isFinite(count)) output.push({ label, count });
  }
  return output;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const configured = analyticsIsConfigured();
  if (!configured) return { configured: false, visits: 0, topSearches: [], topPages: [], siteLocked: process.env.SITE_LOCK_ENABLED === "true" };
  const [visits, searches, pages, lock] = await Promise.all([
    redis<number>("get/white-glove:visits:all"),
    redis<unknown>("zrevrange/white-glove:searches/0/9/WITHSCORES"),
    redis<unknown>("zrevrange/white-glove:pages/0/9/WITHSCORES"),
    redis<string>("get/white-glove:site-lock"),
  ]);
  return {
    configured: true,
    visits: Number(visits?.result || 0),
    topSearches: pairs(searches?.result),
    topPages: pairs(pages?.result),
    siteLocked: lock?.result === "on" || process.env.SITE_LOCK_ENABLED === "true",
  };
}

export async function setSiteLock(locked: boolean) {
  if (!analyticsIsConfigured()) return false;
  const response = await redis(`set/white-glove:site-lock/${locked ? "on" : "off"}`);
  return Boolean(response);
}
