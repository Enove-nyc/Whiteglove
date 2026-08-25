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

/**
 * How long a day's page counts are kept, and how far back a report may look.
 *
 * WHY BOTH NUMBERS. The reports screen could always say a page had been opened
 * 40 times — and never whether that was last week or two years ago. "111 towns
 * with nothing published" is a list to work through; "which of them are people
 * opening NOW" is the order to work through it in, and a since-forever counter
 * cannot answer it. A page that was busy in 2024 and is dead today looks
 * identical to one people are opening this morning.
 *
 * Kept for a little longer than the window that reads them, so the oldest day
 * in a 30-day view is still there when it is asked for.
 */
const PAGE_KEY_PREFIX = "white-glove:pages";
export const RECENT_DAYS = 30;
const PAGE_BUCKET_TTL_SECONDS = (RECENT_DAYS + 5) * 24 * 60 * 60;
/** Set once, the first time a day bucket is written. See countingPagesSince. */
const PAGES_SINCE_KEY = "white-glove:pages:since";

function pageDayKey(daysAgo = 0) {
  return `${PAGE_KEY_PREFIX}:${new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`;
}

export async function trackPageView(pathname: string) {
  const path = cleanLabel(pathname, 120);
  if (!path.startsWith("/")) return;
  const dayKey = pageDayKey();
  await Promise.all([
    redis(`incr/white-glove:visits:all`),
    redis(`incr/white-glove:visits:${todayKey()}`),
    redis(`zincrby/white-glove:pages/1/${encodeURIComponent(path)}`),
    // The day this started counting, written once and never overwritten, so
    // the screen can say how far back its "recently" actually reaches rather
    // than showing a zero that reads as "nobody came".
    redis(`setnx/${PAGES_SINCE_KEY}/${todayKey()}`),
  ]);
  // Sequential on purpose: EXPIRE on a key that does not exist yet is a no-op,
  // so the increment has to land first. Same as the destination buckets above.
  await redis(`zincrby/${dayKey}/1/${encodeURIComponent(path)}`);
  await redis(`expire/${dayKey}/${PAGE_BUCKET_TTL_SECONDS}`);
}

/** The day the day-by-day counting began, or null before anything is counted. */
export async function countingPagesSince(): Promise<string | null> {
  if (!analyticsIsConfigured()) return null;
  const held = await redis<string>(`get/${PAGES_SINCE_KEY}`);
  const value = typeof held?.result === "string" ? held.result : null;
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/**
 * Page opens over the trailing `days`, busiest first.
 *
 * The same shape as the since-forever list, so a screen can show them side by
 * side without either having to be converted into the other.
 */
export async function visitedPathsOverDays(days = RECENT_DAYS): Promise<Array<{ label: string; count: number }>> {
  if (!analyticsIsConfigured()) return [];
  const buckets = await Promise.all(
    Array.from({ length: Math.max(1, days) }, (_, daysAgo) =>
      redis<unknown>(`zrange/${pageDayKey(daysAgo)}/0/-1/WITHSCORES`),
    ),
  );
  return mergeDayCounts(buckets.map((bucket) => pairs(bucket?.result)));
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
 * Which kind of result people open from search — no query text, no PII.
 *
 * Paired with zero-result tracking so the owner can see both gaps in coverage
 * and which content types the bar is actually used for.
 */
export async function trackSearchSelection(kind: string) {
  const label = cleanLabel(kind, 40);
  if (!label) return;
  await redis(`zincrby/white-glove:search-kinds/1/${encodeURIComponent(label)}`);
}

/**
 * A destination somebody actually opened, bucketed by day.
 *
 * THE FRONT PAGE'S "FEATURED" ROW READS THIS. The all-time pages zset above
 * cannot serve it: a destination that was popular in March would sit at the
 * top for ever, and "featured" would quietly mean "featured once". One zset
 * per day means the row is built from the trailing week and last season's
 * favourite falls out on its own.
 *
 * The bucket expires itself after nine days — two more than the seven the
 * reader wants, so a bucket is never mid-expiry while still inside the
 * window, and an abandoned key cleans up without a cron.
 *
 * Slugs only, and only things shaped like slugs. The value arrives from the
 * client, and unlike a search term it is joined back against the published
 * destination list before anything renders — an invented slug costs a redis
 * member and nothing else.
 */
const FEATURED_KEY_PREFIX = "white-glove:featured";
const FEATURED_BUCKET_TTL_SECONDS = 9 * 24 * 60 * 60;

function featuredDayKey(daysAgo = 0) {
  return `${FEATURED_KEY_PREFIX}:${new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`;
}

export async function trackDestinationOpen(slug: string) {
  const label = cleanLabel(slug, 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(label)) return;
  const key = featuredDayKey();
  // Sequential on purpose: EXPIRE on a key that does not exist yet is a no-op,
  // so the increment has to land first.
  await redis(`zincrby/${key}/1/${encodeURIComponent(label)}`);
  await redis(`expire/${key}/${FEATURED_BUCKET_TTL_SECONDS}`);
}

/**
 * The trailing week's day buckets, merged. Pure, and exported so the merge
 * can be tested without a redis to talk to.
 *
 * Ties break alphabetically rather than by whichever bucket answered first,
 * so the same week of data always produces the same front page.
 */
export function mergeDayCounts(
  days: ReadonlyArray<ReadonlyArray<{ label: string; count: number }>>,
): Array<{ label: string; count: number }> {
  const totals = new Map<string, number>();
  for (const day of days) {
    for (const { label, count } of day) totals.set(label, (totals.get(label) ?? 0) + count);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
}

export function mergeDestinationDayBuckets(
  days: ReadonlyArray<ReadonlyArray<{ label: string; count: number }>>,
): string[] {
  // One merge, expressed twice rather than written twice — the front page
  // wants the order and the reports screen wants the numbers, and a second
  // copy of the tie-breaking is how the two quietly start disagreeing.
  return mergeDayCounts(days).map((entry) => entry.label);
}

/** Most-opened destination slugs over the trailing `days`, busiest first. */
export async function topSearchedDestinations(days = 7): Promise<string[]> {
  if (!analyticsIsConfigured()) return [];
  const buckets = await Promise.all(
    Array.from({ length: Math.max(1, days) }, (_, daysAgo) =>
      redis<unknown>(`zrange/${featuredDayKey(daysAgo)}/0/-1/WITHSCORES`),
    ),
  );
  return mergeDestinationDayBuckets(buckets.map((bucket) => pairs(bucket?.result)));
}

/**
 * A filter chip or facet used on search — privacy-safe labels only
 * (e.g. "country:Italy", "kind:hotel"), never free-text PII.
 */
export async function trackSearchFilter(filter: string) {
  const label = cleanLabel(filter, 60);
  if (!label) return;
  await redis(`zincrby/white-glove:search-filters/1/${encodeURIComponent(label)}`);
}

/** Alert signup topic (+ optional destination slug) for the growth dashboard. */
export async function trackAlertSignup(topic: string, destinationSlug?: string) {
  const label = cleanLabel(topic, 40);
  if (!label) return;
  await Promise.all([
    redis(`incr/white-glove:alerts:all`),
    redis(`zincrby/white-glove:alert-topics/1/${encodeURIComponent(label)}`),
    destinationSlug
      ? redis(`zincrby/white-glove:alert-destinations/1/${encodeURIComponent(cleanLabel(destinationSlug, 80))}`)
      : undefined,
  ]);
}

export async function getTopSearchFilters(limit = 20): Promise<Array<{ label: string; count: number }>> {
  if (!analyticsIsConfigured()) return [];
  const found = await redis<unknown>(`zrevrange/white-glove:search-filters/0/${Math.max(0, limit - 1)}/WITHSCORES`);
  return pairs(found?.result);
}

export async function getSearchKinds(limit = 20): Promise<Array<{ label: string; count: number }>> {
  if (!analyticsIsConfigured()) return [];
  const found = await redis<unknown>(`zrevrange/white-glove:search-kinds/0/${Math.max(0, limit - 1)}/WITHSCORES`);
  return pairs(found?.result);
}

export async function getAlertTopicCounts(limit = 20): Promise<Array<{ label: string; count: number }>> {
  if (!analyticsIsConfigured()) return [];
  const found = await redis<unknown>(`zrevrange/white-glove:alert-topics/0/${Math.max(0, limit - 1)}/WITHSCORES`);
  return pairs(found?.result);
}

export async function getAlertDestinationCounts(limit = 20): Promise<Array<{ label: string; count: number }>> {
  if (!analyticsIsConfigured()) return [];
  const found = await redis<unknown>(`zrevrange/white-glove:alert-destinations/0/${Math.max(0, limit - 1)}/WITHSCORES`);
  return pairs(found?.result);
}

export async function getAlertSignupTotal(): Promise<number> {
  if (!analyticsIsConfigured()) return 0;
  const total = await redis<number>("get/white-glove:alerts:all");
  return Number(total?.result || 0);
}

/** Top search terms (not only empty ones), for demand reporting. */
export async function getTopSearches(limit = 40): Promise<Array<{ label: string; count: number }>> {
  if (!analyticsIsConfigured()) return [];
  const found = await redis<unknown>(`zrevrange/white-glove:searches/0/${Math.max(0, limit - 1)}/WITHSCORES`);
  return pairs(found?.result);
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

/**
 * Whether the whole site is behind the access code right now. The node-side
 * mirror of edgeSiteIsLocked() in lib/edge-lock.ts, for pages that need to know
 * (e.g. /access, which is an orphan once the site is public).
 */
export async function siteIsLocked(): Promise<boolean> {
  if (process.env.SITE_LOCK_ENABLED === "true") return true;
  if (!analyticsIsConfigured()) return false;
  const response = await redis<string>("get/white-glove:site-lock");
  return response?.result === "on";
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
  if (!response) return false;

  // Locking or unlocking a section changes where every public "Flights, hotels
  // & cars" link on the site points (lib/booking-access.ts). Both halves are
  // needed and for the same reasons as the words store: the tag throws away the
  // stored answer, and the layout revalidation throws away the prerendered HTML
  // that already has the old link baked into its footer.
  //
  // Imported here rather than at the top of the file: this module is also read
  // by the middleware's neighbours and by scripts, and next/cache is only
  // callable inside a request.
  try {
    const { revalidatePath, updateTag } = await import("next/cache");
    const { BOOKING_ACCESS_TAG } = await import("@/lib/booking-access-store");
    updateTag(BOOKING_ACCESS_TAG);
    revalidatePath("/", "layout");
  } catch {
    // Called from somewhere with no request behind it. The hourly backstop in
    // lib/booking-access-store.ts still picks the change up.
  }
  return true;
}
