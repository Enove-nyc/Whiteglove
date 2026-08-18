/**
 * How many calls a provider has left this month.
 *
 * RouteStack's plan allows four hundred calls a month. That is not a lot: a
 * car search costs two of them, a hotel search up to six, a flight search one
 * or two. A public page calling them on every visit would spend the month's
 * allowance in a few busy days and then start failing in front of travelers,
 * with nothing on any screen having warned anybody.
 *
 * SO THE SITE COUNTS, AND STOPS. Every call to a metered provider is counted
 * against the calendar month, and when the allowance is gone that provider is
 * simply not asked again until the month turns. A page that loses a provider
 * shows what it showed before the provider existed — for cars, the partner
 * search panel — which is a working page rather than an error.
 *
 * COUNTED FOR EVERYBODY, INCLUDING THE ADMIN. Testing a provider spends the
 * same allowance a traveler does. Exempting the comparison screen would make
 * the number on it a lie, and running out while proving a provider works is
 * exactly the way to run out.
 *
 * NOT A LIMIT OF OURS. The number belongs to the plan the owner is on, so it
 * lives in the environment beside the keys and changes when he changes plan,
 * without a deploy.
 */

import type { ProviderId } from "@/lib/travel/types";

const PREFIX = "white-glove:travel-calls:";
/** Two months, so last month is still readable while this month runs. */
const TTL_SECONDS = 62 * 24 * 60 * 60;

/**
 * What each provider's plan allows per calendar month.
 *
 * A provider absent from here is unmetered as far as this site knows — Stay22
 * and Travelpayouts are affiliate integrations with no published call ceiling,
 * and inventing one for them would turn a working page off for no reason.
 */
/**
 * Written out rather than assembled from the provider's name.
 *
 * `process.env[\`${provider.toUpperCase()}_...\`]` worked and was invisible:
 * Next substitutes environment variables by name at build time, and nothing
 * that reads the source — including the check that every variable this site
 * uses is described on the Connections screen — can see a name that is built
 * at runtime. One line per metered provider is the price of being findable.
 */
const LIMIT_VARS: Partial<Record<ProviderId, () => string | undefined>> = {
  // Read when asked rather than when this file loads: a value fixed at module
  // load cannot be changed without a restart, and could not be tested at all.
  routestack: () => process.env.ROUTESTACK_MONTHLY_CALL_LIMIT,
};

/** What each plan allows per calendar month. */
export function monthlyLimit(provider: ProviderId): number | null {
  const named = LIMIT_VARS[provider]?.()?.trim();
  if (named) {
    const parsed = Number(named);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return provider === "routestack" ? 400 : null;
}

/** The calendar month a call belongs to, in UTC. */
export function monthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis<T>(path: string): Promise<T | undefined> {
  const config = redisConfig();
  if (!config) return undefined;
  try {
    const response = await fetch(`${config.url}/${path}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    return ((await response.json()) as { result: T }).result;
  } catch {
    return undefined;
  }
}

function key(provider: ProviderId, month: string): string {
  return encodeURIComponent(`${PREFIX}${provider}:${month}`);
}

/** Calls already made this month, or null when we cannot tell. */
export async function callsThisMonth(provider: ProviderId, month = monthKey()): Promise<number | null> {
  const value = await redis<string | number | null>(`get/${key(provider, month)}`);
  if (value === undefined) return null;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Whether this provider may be asked anything at all right now.
 *
 * WITHOUT A COUNTER, THE ANSWER IS YES. If Redis is unreachable the site
 * cannot tell how much of the allowance is spent, and the choice is between
 * calling a provider that might be over its limit — where the provider itself
 * refuses, visibly, and the page falls back — or refusing to call a provider
 * that is probably fine. Silently disabling a working provider because a cache
 * is down is the worse of the two.
 */
export async function providerHasBudget(provider: ProviderId, reserve = 0): Promise<boolean> {
  const limit = monthlyLimit(provider);
  if (limit === null) return true;
  const used = await callsThisMonth(provider);
  if (used === null) return true;
  return used < limit - reserve;
}

/**
 * How many searches the admin's own comparison screen leaves for travelers.
 *
 * TESTING AND SERVING SHARE ONE ALLOWANCE, and on the free plan that allowance
 * is four hundred a month. An afternoon of comparing providers could spend the
 * lot and leave the public car search with nothing, which is the wrong way
 * round: the screen exists to decide whether a provider is worth showing
 * people, and it must not be able to stop showing them.
 *
 * So the comparison stops first, while there is still a month's worth of
 * ordinary use left. The number on that screen keeps counting both, because a
 * counter that hid the admin's own spending would be lying about the bill.
 */
export const ADMIN_RESERVE = 50;

/** Count one call. Never throws, and never blocks the call it is counting. */
export async function spendProviderCall(provider: ProviderId): Promise<void> {
  if (monthlyLimit(provider) === null) return;
  const month = monthKey();
  const config = redisConfig();
  if (!config) return;
  try {
    await fetch(`${config.url}/incr/${key(provider, month)}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    // Expiry is set every time rather than only on creation: one round trip
    // more, against a counter that never expires if a SET race loses.
    await fetch(`${config.url}/expire/${key(provider, month)}/${TTL_SECONDS}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
  } catch {
    /* A counter that cannot be written must not fail the search it counts. */
  }
}
