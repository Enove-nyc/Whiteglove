/**
 * The limits as the owner set them, and the printable copies each account has taken.
 *
 * TWO THINGS, ONE FILE, because they are the same concern read at the same
 * moment: deciding whether this person may print this now.
 *
 * THE NUMBERS ARE NOT IN THE CODE. "2 trips" and "1 print a week" are where the
 * owner put them today; a month of watching people hit them is what tells him
 * whether they are right, and he should not need a deploy to move them. The
 * built-in numbers are the floor, so a store that is away costs him his changes
 * and not the site.
 *
 * THE PRINT LOG IS PER ACCOUNT AND SMALL. Only what is needed to answer "how
 * many in the last seven days": the trip and the moment. Anything older than a
 * fortnight is dropped on the next write, so this cannot grow forever and there
 * is no long record of what anybody printed sitting around.
 */

import { unstable_cache, updateTag } from "next/cache";
import { type AccountPlan, ACCOUNT_PLANS } from "@/lib/account-plans";
import { describePrints, describeTrips, type LimitOverrides, type PlanLimits, type PrintEvent, WEEK_MS } from "@/lib/account-limits";
import { identityKey } from "@/lib/identity";

const LIMITS_KEY = "white-glove:plan-limits";
const PRINTS_PREFIX = "white-glove:prints:";
export const LIMITS_TAG = "plan-limits";

/** Kept twice as long as the window it answers, so a clock skew cannot lose one. */
const KEEP_MS = 2 * WEEK_MS;

export function limitsStoreAvailable() {
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

/* ---- the numbers -------------------------------------------------------- */

async function readOverrides(): Promise<LimitOverrides> {
  const raw = await redis<string>(`get/${LIMITS_KEY}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as LimitOverrides;
    if (!parsed || typeof parsed !== "object") return {};
    // Only the three plans, so nothing else can arrive through the door.
    const clean: LimitOverrides = {};
    for (const plan of ACCOUNT_PLANS) if (parsed[plan]) clean[plan] = parsed[plan];
    return clean;
  } catch {
    return {};
  }
}

const cachedOverrides = unstable_cache(readOverrides, ["plan-limits"], { tags: [LIMITS_TAG], revalidate: 3600 });

/** Read on every trip creation and every print, so it is cached. */
export async function getLimitOverrides(): Promise<LimitOverrides> {
  if (!limitsStoreAvailable()) return {};
  return cachedOverrides();
}

/** Uncached, for the admin screen. */
export async function getLimitOverridesFresh(): Promise<LimitOverrides> {
  if (!limitsStoreAvailable()) return {};
  return readOverrides();
}

export async function saveLimitOverrides(next: LimitOverrides): Promise<boolean> {
  if (!limitsStoreAvailable()) return false;
  if ((await redis(`set/${LIMITS_KEY}`, JSON.stringify(next))) === null) return false;
  updateTag(LIMITS_TAG);
  return true;
}

/* ---- the printable copies somebody has taken ---------------------------- */

function printsKey(account: string) {
  return encodeURIComponent(`${PRINTS_PREFIX}${identityKey(account)}`);
}

/** Never cached: it is read to make a decision that then writes to it. */
export async function getPrints(account: string): Promise<PrintEvent[]> {
  if (!limitsStoreAvailable()) return [];
  const raw = await redis<string>(`get/${printsKey(account)}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PrintEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.tripId === "string" && typeof p.at === "string");
  } catch {
    return [];
  }
}

/**
 * Write one down.
 *
 * Returns false when it could not be stored — and the caller lets the print
 * through anyway. A store that is away must not stop somebody printing their
 * own itinerary; the cost of failing open is one extra copy, and the cost of
 * failing closed is a traveller standing at a printer being told no for a
 * reason that is nothing to do with them.
 */
export async function recordPrint(account: string, event: PrintEvent): Promise<boolean> {
  if (!limitsStoreAvailable()) return false;
  const now = Date.parse(event.at);
  const kept = [...(await getPrints(account)), event].filter((p) => {
    const at = Date.parse(p.at);
    return Number.isFinite(at) && now - at < KEEP_MS;
  });
  return (await redis(`set/${printsKey(account)}`, JSON.stringify(kept))) !== null;
}

/** For the owner, on a person's account: how many copies they have taken lately. */
export async function printsFor(account: string): Promise<PrintEvent[]> {
  return getPrints(account);
}

/**
 * Where somebody stands against their limits, in one sentence.
 *
 * COMPOSED HERE, NOT ON THE PAGE, because saying when the next printable copy
 * is due means reading the clock — and a component may not call an impure
 * function while it renders. The lint rule caught exactly that and was right
 * to: a page that reads a clock mid-render can show two different answers for
 * the same request.
 */
export async function usageLineFor(account: string, limits: PlanLimits, tripCount: number): Promise<string> {
  const prints = account ? await getPrints(account) : [];
  const now = Date.now();
  return `${describeTrips(tripCount, limits)} ${describePrints(prints, limits, now)}`;
}

export type { AccountPlan };
