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

type Config = { limit: number; windowSeconds: number };

export type RateLimitResult = {
  ok: boolean;
  /** Attempts left in this window. */
  remaining: number;
  /** Seconds until they can try again. 0 when they still may. */
  retryAfter: number;
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
    return { ok: true, remaining: config.limit - 1, retryAfter: 0 };
  }
  entry.count += 1;
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  if (entry.count > config.limit) return { ok: false, remaining: 0, retryAfter };
  return { ok: true, remaining: config.limit - entry.count, retryAfter: 0 };
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
  if (!redis) return localResult;

  const full = `white-glove:rl:${key}`;
  try {
    const response = await fetch(`${redis.url}/incr/${encodeURIComponent(full)}`, {
      headers: { Authorization: `Bearer ${redis.token}` },
      cache: "no-store",
    });
    if (!response.ok) return localResult;
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
      return { ok: false, remaining: 0, retryAfter: ttl };
    }
    return { ok: true, remaining: config.limit - count, retryAfter: 0 };
  } catch {
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

/** The message somebody sees. Says how long, because "try again later" does not. */
export function tooManyMessage(retryAfter: number): string {
  if (retryAfter >= 3600) {
    const hours = Math.ceil(retryAfter / 3600);
    return `Too many attempts. Try again in about ${hours} hour${hours === 1 ? "" : "s"}.`;
  }
  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
