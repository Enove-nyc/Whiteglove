type RedisResult<T> = { result?: T };

export type DashboardStats = {
  configured: boolean;
  visits: number;
  visitsToday: number;
  searchesToday: number;
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
  try {
    const response = await fetch(`${config.url}/${command}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    return (await response.json()) as RedisResult<T>;
  } catch {
    return undefined;
  }
}

function cleanLabel(value: string, limit = 80) {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

export function analyticsIsConfigured() {
  return Boolean(redisConfig());
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function trackPageView(pathname: string) {
  const path = cleanLabel(pathname, 120);
  if (!path.startsWith("/")) return;
  await Promise.all([
    redis(`incr/white-glove:visits:all`),
    redis(`incr/white-glove:visits:${todayKey()}`),
    redis(`zincrby/white-glove:pages/1/${encodeURIComponent(path)}`),
  ]);
}

/**
 * A search, and whether the site had anything to show for it.
 *
 * `found` is the number of results the person actually saw. A search that
 * returned nothing is the single most useful thing this site can learn: it is
 * somebody asking for a town, a kever or a hechsher by name and being told the
 * site has never heard of it. Counted separately so it can be read back as a
 * list of things to add, rather than inferred later by re-running the matching
 * and hoping it agrees with what the visitor was shown.
 *
 * Left optional so an older caller still records the search itself.
 */
export async function trackSearch(query: string, found?: number) {
  const term = cleanLabel(query);
  if (term.length < 2) return;
  await Promise.all([
    redis(`zincrby/white-glove:searches/1/${encodeURIComponent(term)}`),
    redis(`incr/white-glove:searches:${todayKey()}`),
    found === 0 ? redis(`zincrby/white-glove:searches-empty/1/${encodeURIComponent(term)}`) : undefined,
  ]);
}

/**
 * What people searched for and found nothing.
 *
 * Empty when nothing is connected, and empty for a site nobody has searched —
 * the two look the same here on purpose, because the screen that reads this
 * says which it is from `analyticsIsConfigured()` rather than from the length
 * of this list.
 */
export async function getEmptySearches(limit = 40): Promise<Array<{ label: string; count: number }>> {
  if (!analyticsIsConfigured()) return [];
  const found = await redis<unknown>(`zrevrange/white-glove:searches-empty/0/${Math.max(0, limit - 1)}/WITHSCORES`);
  return pairs(found?.result);
}

/** Forget one term — it was a typo, or it has since been added. */
export async function clearEmptySearch(term: string): Promise<boolean> {
  if (!analyticsIsConfigured()) return false;
  const response = await redis(`zrem/white-glove:searches-empty/${encodeURIComponent(cleanLabel(term))}`);
  return Boolean(response);
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

// Top-visited page paths (most visited first), for ranking homepage content.
// Returns [] when analytics isn't connected, so callers can fall back to a
// sensible default order.
export async function getTopVisitedPaths(limit = 40): Promise<Array<{ path: string; count: number }>> {
  if (!analyticsIsConfigured()) return [];
  const pages = await redis<unknown>(`zrevrange/white-glove:pages/0/${Math.max(0, limit - 1)}/WITHSCORES`);
  return pairs(pages?.result).map(({ label, count }) => ({ path: label, count }));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const configured = analyticsIsConfigured();
  if (!configured) return { configured: false, visits: 0, visitsToday: 0, searchesToday: 0, topSearches: [], topPages: [], siteLocked: process.env.SITE_LOCK_ENABLED === "true" };
  const [visits, visitsToday, searchesToday, searches, pages, lock] = await Promise.all([
    redis<number>("get/white-glove:visits:all"),
    redis<number>(`get/white-glove:visits:${todayKey()}`),
    redis<number>(`get/white-glove:searches:${todayKey()}`),
    redis<unknown>("zrevrange/white-glove:searches/0/9/WITHSCORES"),
    redis<unknown>("zrevrange/white-glove:pages/0/9/WITHSCORES"),
    redis<string>("get/white-glove:site-lock"),
  ]);
  return {
    configured: true,
    visits: Number(visits?.result || 0),
    visitsToday: Number(visitsToday?.result || 0),
    searchesToday: Number(searchesToday?.result || 0),
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

// Sections (path prefixes) that require the site-access code, even when the
// whole site is not locked.
export async function getLockedPaths(): Promise<string[]> {
  if (!analyticsIsConfigured()) return [];
  const response = await redis<string>("get/white-glove:locked-paths");
  if (!response?.result) return [];
  try {
    const parsed = JSON.parse(response.result);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export async function setLockedPaths(paths: string[]) {
  if (!analyticsIsConfigured()) return false;
  const clean = [...new Set(paths.map((p) => p.trim()).filter(Boolean))];
  const response = await redis(`set/white-glove:locked-paths/${encodeURIComponent(JSON.stringify(clean))}`);
  return Boolean(response);
}
