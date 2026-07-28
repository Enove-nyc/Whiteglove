import { createHmac, timingSafeEqual } from "crypto";

type AccessScope = "admin" | "site";

/**
 * The secret every access cookie is signed with.
 *
 * Returns null when the deployment has not been given one. That matters: the
 * fallback used to be a constant string compiled into the source, which meant a
 * deployment with neither variable set signed its admin cookie with a value
 * anybody could read here and compute offline. Signing in was impossible in
 * that state — but forging the cookie was trivial, which is the wrong way round.
 *
 * With no secret, no token can be minted and no token validates. The site fails
 * closed.
 */
function secret(): string | null {
  const configured = process.env.WHITE_GLOVE_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (configured) return configured;
  // Development only, and only when it cannot reach a real deployment.
  if (process.env.NODE_ENV !== "production") return "white-glove-development-secret";
  return null;
}

/** True when this deployment can mint access cookies at all. */
export function accessConfigured(): boolean {
  return secret() !== null;
}

export function accessToken(scope: AccessScope): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(`white-glove:${scope}`).digest("base64url");
}

export function isValidAccessToken(scope: AccessScope, value?: string) {
  if (!value) return false;
  const expected = accessToken(scope);
  if (!expected) return false;
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

/**
 * Is this request allowed to change something?
 *
 * Next.js checks Origin against Host for server actions, but a plain API route
 * gets no such check — so a page on another site could POST to one of ours and
 * the browser would attach the admin cookie, which is SameSite=Lax and
 * therefore sent on a top-level cross-site POST.
 *
 * A request with no Origin at all is allowed: that is a same-origin form post
 * or a server-to-server call, neither of which a hostile page can produce.
 */
export function sameOrigin(request: {
  headers: { get(name: string): string | null };
  nextUrl?: { host: string };
}): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl?.host || "";
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
