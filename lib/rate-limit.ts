/**
 * How many times somebody may try something, before they have to wait.
 *
 * The verification code is six digits. Six digits is a million combinations,
 * which sounds like a lot until you notice that a script making a hundred
 * guesses a second walks the whole space in under three hours — and it does
 * not need the whole space, only half of it on average. With no limit at all,
 * a six-digit code is a formality. That is what this exists for.
 *
 * It also stops the resend button being used as a way to send somebody
 * hundreds of texts, which costs real money and is somebody else's phone.
 */

import { createHash } from "node:crypto";

type Config = { limit: number; windowSeconds: number };

export type RateLimitResult = {
  ok: boolean;
  /** Attempts left in this window. */
  remaining: number;
  /** Seconds until they can try again. 0 when they still may. */
  retryAfter: number;
  /**
   * WHICH COUNTER ANSWERED — and this is the field that matters in production.
   *
   * "upstash" means the shared store counted the attempt and the limit holds
   * across every serverless instance. "memory" means it did not, and the count
   * lives in one process that the next request may never land on: the limit is
   * then advisory at best. The two are indistinguishable from the outside
   * otherwise, which is how a guard on a paid API key sat inert long enough to
   * be found only by firing sixteen requests at it and reading the status
   * codes. A caller that cares can now say so in a response header instead of
   * hoping somebody finds a log line.
   */
  store: "upstash" | "memory";
};

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/**
 * The fallback when there is no Redis: a counter in this process.
 *
 * Honest about what it is. Serverless runs many instances, so an attacker
 * spread across instances gets more attempts than the limit says. It is still
 * far better than nothing — it stops a single script hammering one endpoint —
 * and the accounts system already requires Upstash to work at all, so in any
 * real deployment the Redis path is the one that runs.
 */
const local = new Map<string, { count: number; resetAt: number }>();

function localLimit(key: string, config: Config): RateLimitResult {
  const now = Date.now();
  const entry = local.get(key);
  if (!entry || entry.resetAt <= now) {
    local.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    // Keep the map from growing without bound on a long-lived instance.
    if (local.size > 5000) {
      for (const [k, v] of local) if (v.resetAt <= now) local.delete(k);
    }
    return { ok: true, remaining: config.limit - 1, retryAfter: 0, store: "memory" };
  }
  entry.count += 1;
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count > config.limit) return { ok: false, remaining: 0, retryAfter, store: "memory" };
  return { ok: true, remaining: config.limit - entry.count, retryAfter: 0, store: "memory" };
}

/**
 * Counts one attempt against `key` and says whether it is allowed.
 *
 * Call it once per attempt, before doing the work. A refusal is not an error
 * to be retried — it is the answer.
 *
 * Fails OPEN if Redis is unreachable, deliberately: a limiter that locks
 * everybody out of their own account because a cache is down has done more
 * damage than the attack it was guarding against. The in-process counter
 * still applies in that case, so it is never wide open.
 */
export async function rateLimit(key: string, config: Config): Promise<RateLimitResult> {
  const localResult = localLimit(key, config);
  if (!localResult.ok) return localResult;

  const redis = redisConfig();
  if (!redis) {
    console.warn("[rate-limit] no UPSTASH_REDIS_REST_URL/TOKEN — the limit is per-process only, which does not hold on serverless");
    return localResult;
  }

  const full = `white-glove:rl:${key}`;
  try {
    const response = await fetch(`${redis.url}/incr/${encodeURIComponent(full)}`, {
      headers: { Authorization: `Bearer ${redis.token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      // SAY SO. This used to fall back to the in-process counter without a
      // word, and on serverless that counter is worthless — each request can
      // land on a different instance, so nothing ever accumulates. The limiter
      // then looks present in the code and does nothing in production, which
      // is how a guard on a paid API key was found to be inert only by firing
      // sixteen requests at it. Fail open, as before; fail open LOUDLY.
      console.warn("[rate-limit] upstash refused", response.status, "— falling back to the in-process counter");
      return localResult;
    }
    const { result } = (await response.json()) as { result?: number };
    const count = typeof result === "number" ? result : 1;

    // Start the window on the first attempt. NX so a later attempt cannot
    // extend it — otherwise somebody attacking continuously would keep
    // pushing the expiry out and the window would never close.
    if (count === 1) {
      await fetch(`${redis.url}/expire/${encodeURIComponent(full)}/${config.windowSeconds}/NX`, {
        headers: { Authorization: `Bearer ${redis.token}` },
        cache: "no-store",
      }).catch(() => undefined);
    }

    if (count > config.limit) {
      const ttl = await fetch(`${redis.url}/ttl/${encodeURIComponent(full)}`, {
        headers: { Authorization: `Bearer ${redis.token}` },
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { result?: number } | null) => (typeof d?.result === "number" && d.result > 0 ? d.result : config.windowSeconds))
        .catch(() => config.windowSeconds);
      return { ok: false, remaining: 0, retryAfter: ttl, store: "upstash" };
    }
    return { ok: true, remaining: config.limit - count, retryAfter: 0, store: "upstash" };
  } catch (error) {
    console.warn("[rate-limit] upstash unreachable — falling back to the in-process counter", error);
    return localResult;
  }
}

/**
 * Who is asking, for keying a limit.
 *
 * Behind Vercel the client address is in x-forwarded-for; the first entry is
 * the client and the rest are proxies. With no header at all this returns
 * "unknown", which buckets everybody together — the safe direction, since the
 * alternative is every request looking like a different person.
 */
export function requesterKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * A short, one-way tag for a limit key, safe to put in a response header.
 *
 * The limit is keyed on the caller's address, and the address is not something
 * to echo back. The tag is: the same caller gets the same eight characters
 * every time, a different caller gets different ones, and nothing about the
 * address can be read back out of them. That is enough to answer the only
 * question a header needs to answer — am I being counted as one visitor, or as
 * a new one on every request? — which is exactly the question that could not be
 * answered when the limiter appeared not to fire behind a rotating proxy.
 */
export function bucketTag(key: string): string {
  return createHash("sha256").update(`white-glove:rl:${key}`).digest("hex").slice(0, 8);
}

/** The message somebody sees. Says how long, because "try again later" does not. */
export function tooManyMessage(retryAfter: number): string {
  if (retryAfter >= 3600) {
    const hours = Math.ceil(retryAfter / 3600);
    return `Too many attempts. Try again in about ${hours} hour${hours === 1 ? "" : "s"}.`;
  }
  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
