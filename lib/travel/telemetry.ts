/**
 * What each travel company actually did for us, kept where the admin can read it.
 *
 * THE QUESTION THIS ANSWERS. "Which provider is better for White Glove" is
 * unanswerable today, because nothing records that a search happened. Not the
 * response time, not the number of results, not the failures. Every argument
 * about a provider is therefore a matter of opinion, and every new integration
 * is a guess.
 *
 * So: one small rolling record per provider per category. Enough to see that
 * Duffel answered in 900ms with 14 offers and RouteStack timed out twice this
 * afternoon, and no more than that.
 *
 * WHAT IS DELIBERATELY NOT STORED. No query. No destination, no dates, no
 * passenger counts, no prices, no traveler. A search is somebody's plans; the
 * fact that a provider was slow is ours. Error messages are reduced to a
 * category before they are written, so a provider echoing a traveler's input
 * back to us in an error cannot end up in the log either.
 */

import type { ErrorCategory, ProviderAttempt, ProviderId, TravelCategory } from "@/lib/travel/types";

const KEY = "white-glove:travel-health";
/** Kept small on purpose: this is a health light, not an analytics warehouse. */
const RECENT_ERRORS = 5;

export type ProviderHealth = {
  provider: ProviderId;
  category: TravelCategory;
  /** ISO timestamps. */
  lastSuccessAt?: string;
  lastFailureAt?: string;
  calls: number;
  failures: number;
  /** Rolling mean, milliseconds. */
  averageMs: number;
  lastMs?: number;
  /** Most recent first. Categories only — never a provider's own words. */
  recentErrors: Array<{ at: string; error: ErrorCategory }>;
};

type HealthTable = Record<string, ProviderHealth>;

const rowKey = (provider: ProviderId, category: TravelCategory) => `${provider}:${category}`;

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

export async function readTravelHealth(): Promise<HealthTable> {
  const stored = await redis<string>(`get/${encodeURIComponent(KEY)}`);
  if (!stored?.result) return {};
  try {
    const parsed = JSON.parse(stored.result) as HealthTable;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Fold one attempt into the record.
 *
 * Pure, so the arithmetic can be tested without a store: given the row as it
 * was and what just happened, this is the row as it should be.
 */
export function foldAttempt(previous: ProviderHealth | undefined, attempt: ProviderAttempt, at: string): ProviderHealth {
  const base: ProviderHealth = previous ?? {
    provider: attempt.provider,
    category: attempt.category,
    calls: 0,
    failures: 0,
    averageMs: 0,
    recentErrors: [],
  };
  const calls = base.calls + 1;
  // Running mean, so nothing has to be kept to compute it.
  const averageMs = Math.round((base.averageMs * base.calls + attempt.ms) / calls);
  return {
    ...base,
    calls,
    failures: base.failures + (attempt.ok ? 0 : 1),
    averageMs,
    lastMs: attempt.ms,
    lastSuccessAt: attempt.ok ? at : base.lastSuccessAt,
    lastFailureAt: attempt.ok ? base.lastFailureAt : at,
    recentErrors: attempt.ok
      ? base.recentErrors
      : [{ at, error: attempt.error ?? "unexpected" }, ...base.recentErrors].slice(0, RECENT_ERRORS),
  };
}

/**
 * Write a search's attempts away.
 *
 * Never awaited by a page: a traveler must not wait on our bookkeeping, and a
 * store that is down must not turn a working search into a failed one.
 */
export async function recordAttempts(attempts: ProviderAttempt[], now: string): Promise<void> {
  if (!attempts.length || !redisConfig()) return;
  try {
    const table = await readTravelHealth();
    for (const attempt of attempts) {
      const key = rowKey(attempt.provider, attempt.category);
      table[key] = foldAttempt(table[key], attempt, now);
    }
    await redis(`set/${encodeURIComponent(KEY)}/${encodeURIComponent(JSON.stringify(table))}`);
  } catch {
    /* health is never worth failing a search over */
  }
}

/**
 * Reduce anything thrown to one of the counted kinds.
 *
 * Deliberately coarse. The point is to tell "they are refusing our key" apart
 * from "they were slow" apart from "we sent rubbish" — three problems with
 * three different fixes — without keeping the sentence a provider wrote.
 */
export function categoriseError(error: unknown): ErrorCategory {
  if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "AbortError") {
    return "timeout";
  }
  const status = error && typeof error === "object" && "status" in error ? Number((error as { status?: number }).status) : undefined;
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate-limited";
  if (status === 400 || status === 422) return "bad-request";
  if (typeof status === "number" && status >= 500) return "provider-error";
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  if (message.includes("abort") || message.includes("timeout")) return "timeout";
  if (message.includes("fetch failed") || message.includes("network") || message.includes("enotfound")) return "network";
  if (message.includes("not configured")) return "not-configured";
  return "unexpected";
}

/** What the admin reads: every row, worst first. */
export function healthRows(table: HealthTable): ProviderHealth[] {
  return Object.values(table).sort((a, b) => {
    const aRate = a.calls ? a.failures / a.calls : 0;
    const bRate = b.calls ? b.failures / b.calls : 0;
    if (aRate !== bRate) return bRate - aRate;
    return b.calls - a.calls;
  });
}
