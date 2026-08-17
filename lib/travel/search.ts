/**
 * Ask every enabled provider at once, and answer with whatever arrived.
 *
 * THE RULE. One slow company must not decide how slow White Glove is. Every
 * provider in a category is asked in parallel, they share a single deadline,
 * and the search returns when the last one finishes OR when the clock runs
 * out — whichever comes first. A provider that misses it contributes nothing
 * to the results and one line to the record.
 *
 * A provider that throws does not fail the search either. The traveler sees
 * the offers that came back; the admin sees which company let us down and how.
 * Nobody is ever shown an API error, because an API error is not a thing a
 * traveler can do anything about.
 */

import { categoriseError, recordAttempts } from "@/lib/travel/telemetry";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { ProviderAttempt, SearchOutcome, SearchQuery, TravelCategory, TravelOffer } from "@/lib/travel/types";

/**
 * How long a whole search may take.
 *
 * Six seconds is a judgement, not a measurement: long enough for a real flight
 * search on a cold connection, short enough that a person has not yet decided
 * the site is broken. Callers may lower it; the admin comparison screen raises
 * it, because there a slow honest answer is the thing being measured.
 */
export const DEFAULT_DEADLINE_MS = 6000;

export type SearchOptions = {
  deadlineMs?: number;
  /** Set false on the admin comparison screen — measuring is not real traffic. */
  record?: boolean;
  /** Injectable so tests do not need a clock. */
  now?: () => number;
};

export async function searchProviders(
  category: TravelCategory,
  providers: ProviderSearch[],
  query: SearchQuery,
  options: SearchOptions = {},
): Promise<SearchOutcome> {
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const now = options.now ?? (() => Date.now());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);

  const attempts: ProviderAttempt[] = [];
  const offers: TravelOffer[] = [];

  try {
    await Promise.all(
      providers.map(async (provider) => {
        // A company we have not signed up with is not a failure. It is asked
        // nothing, counted nowhere, and never turns the admin amber.
        if (!provider.configured()) {
          attempts.push({ provider: provider.id, category, ok: false, ms: 0, count: 0, error: "not-configured" });
          return;
        }
        const started = now();
        try {
          const found = await provider.search(query, controller.signal);
          attempts.push({ provider: provider.id, category, ok: true, ms: now() - started, count: found.length });
          offers.push(...found);
        } catch (error) {
          const kind = categoriseError(error);
          attempts.push({
            provider: provider.id,
            category,
            ok: false,
            ms: now() - started,
            count: 0,
            error: kind,
            timedOut: kind === "timeout",
          });
        }
      }),
    );
  } finally {
    clearTimeout(timer);
  }

  // Bookkeeping never blocks the answer, and never fails it.
  if (options.record !== false) {
    void recordAttempts(attempts, new Date().toISOString()).catch(() => undefined);
  }

  return {
    category,
    offers,
    tried: attempts,
    // "not-configured" is not a fault, so it does not make a search partial.
    partial: attempts.some((attempt) => !attempt.ok && attempt.error !== "not-configured"),
  };
}

/**
 * A fetch that cannot outlive the search that started it.
 *
 * Adapters use this rather than bare fetch, so a provider ignoring the shared
 * signal still cannot hold a page open: its own timeout fires first.
 */
export async function providerFetch(
  url: string,
  init: RequestInit & { signal: AbortSignal; timeoutMs?: number },
): Promise<Response> {
  const own = AbortSignal.timeout(init.timeoutMs ?? DEFAULT_DEADLINE_MS);
  const signal = AbortSignal.any([init.signal, own]);
  const response = await fetch(url, { ...init, signal, cache: "no-store" });
  if (!response.ok) {
    // Carries the status so categoriseError can tell auth from rate limit from
    // outage, without keeping whatever the provider wrote in its body.
    const error = new Error(`provider responded ${response.status}`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return response;
}
