// Slow down password guessing.
//
// The admin password can be six characters and the check is a single request
// with no cost to the guesser. The PBKDF2 verification is expensive, but the
// server pays for it, so unlimited guessing is both a break-in route and a way
// to burn the site's CPU.
//
// Counting failures per caller per scope fixes both. Redis holds the counter
// with an expiry, so it clears itself; with no Redis there is no counter and
// the site behaves as it did before — this can never be the reason someone
// cannot sign in.

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 8;

function redisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redis<T>(path: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

/**
 * Who is asking.
 *
 * Behind Vercel the caller's address is in x-forwarded-for. When there is no
 * address to be had, everyone shares one bucket — which throttles harder than
 * intended rather than not at all, and that is the right way to be wrong.
 */
function callerKey(request: { headers: { get(name: string): string | null } }, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  return `white-glove:attempts:${scope}:${ip.replace(/[^a-zA-Z0-9.:_-]/g, "")}`;
}

/** How long the caller is shut out for, or null if they may try. */
export async function tooManyAttempts(
  request: { headers: { get(name: string): string | null } },
  scope: string,
): Promise<{ minutes: number } | null> {
  if (!redisConfigured()) return null;
  const key = callerKey(request, scope);
  const count = Number(await redis<string | number>(`get/${key}`)) || 0;
  if (count < MAX_ATTEMPTS) return null;
  const ttl = Number(await redis<string | number>(`ttl/${key}`)) || WINDOW_SECONDS;
  return { minutes: Math.max(1, Math.ceil(ttl / 60)) };
}

/** Count one wrong password. */
export async function recordFailedAttempt(
  request: { headers: { get(name: string): string | null } },
  scope: string,
): Promise<void> {
  if (!redisConfigured()) return;
  const key = callerKey(request, scope);
  const count = Number(await redis<string | number>(`incr/${key}`)) || 0;
  // Start the clock on the first failure, so the window is the last 15 minutes
  // rather than 15 minutes from whenever the last guess landed.
  if (count === 1) await redis(`expire/${key}/${WINDOW_SECONDS}`);
}
