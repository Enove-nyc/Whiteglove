// Getting into the site while it is closed.
//
// There are two codes, and the difference between them is how long they last:
//
//   • the full code — you put it in once and you stay in.
//   • the five-minute code — for handing to somebody who needs to look at one
//     thing. It stops working on its own.
//
// The five minutes have to be enforced somewhere that cannot be edited by the
// person they were given to. A short cookie lifetime is not that: a browser's
// expiry is only a suggestion to the browser, and anyone who copies the cookie
// value keeps it forever. So the expiry is signed into the cookie itself, and
// checked on every request.
//
// The cookie reads:  <expires>.<generation>.<signature>
//
//   expires     — milliseconds since the epoch, or 0 for "does not expire"
//   generation  — bumped when the owner revokes everybody at once. Every cookie
//                 signed against an older generation stops working the moment
//                 it changes, which is the only honest meaning of "revoke".
//   signature   — HMAC over the other two, so neither can be edited.
//
// A cookie in the old format — the bare scope token, with no expiry — is still
// accepted while the generation is 0, so nobody signed in today is thrown out
// by this arriving. The first revoke ends that.

import { createHmac, timingSafeEqual } from "crypto";

export const SITE_COOKIE = "white_glove_site_access";

/** How long the short code lasts. Five minutes, as asked. */
export const PREVIEW_MINUTES = 5;

function secret(): string | null {
  const configured = process.env.WHITE_GLOVE_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "white-glove-development-secret";
  return null;
}

function sign(expires: number, generation: number): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(`white-glove:site:${expires}:${generation}`).digest("base64url");
}

/**
 * Mint a cookie value.
 *
 * `minutes` undefined means it does not expire — the full code. Any number
 * means it stops working then, whatever the browser does with the cookie.
 */
export function mintSiteAccess(generation: number, minutes?: number): string | null {
  const expires = minutes === undefined ? 0 : Date.now() + minutes * 60_000;
  const signature = sign(expires, generation);
  return signature ? `${expires}.${generation}.${signature}` : null;
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export type SiteAccessCheck = { ok: boolean; expiresAt?: number; expired?: boolean };

/**
 * Is this cookie still good?
 *
 * `legacyToken` is the old bare token, accepted only at generation 0 so that
 * people already signed in are not thrown out the day this ships.
 */
export function checkSiteAccess(value: string | undefined, generation: number, legacyToken?: string | null): SiteAccessCheck {
  if (!value) return { ok: false };
  if (legacyToken && generation === 0 && safeEqual(value, legacyToken)) return { ok: true };

  const parts = value.split(".");
  if (parts.length !== 3) return { ok: false };
  const expires = Number(parts[0]);
  const cookieGeneration = Number(parts[1]);
  if (!Number.isFinite(expires) || !Number.isFinite(cookieGeneration)) return { ok: false };
  if (cookieGeneration !== generation) return { ok: false };

  const expected = sign(expires, cookieGeneration);
  if (!expected || !safeEqual(parts[2], expected)) return { ok: false };
  if (expires !== 0 && Date.now() > expires) return { ok: false, expired: true, expiresAt: expires };
  return { ok: true, expiresAt: expires || undefined };
}
