/**
 * "Don't ask me for the code on this phone every time."
 *
 * WHY THIS EXISTS. The owner turned on a second factor and then hit the cost
 * of it in his own words: he signs in many times a day, and typing six digits
 * off an authenticator every single time made him want the whole feature gone.
 * A second factor nobody can live with gets switched off, and then there is no
 * second factor — so the honest fix is to keep asking on doors that matter and
 * stop asking on a phone that has already proved itself.
 *
 * WHAT IT DOES AND DOES NOT PROTECT. The password is still required, every
 * time, on every device. This only remembers that THIS BROWSER once produced a
 * correct code, so the second factor is asked once per device per month rather
 * than once per sign-in. Somebody who steals the password alone still cannot
 * get in from their own machine — which is the threat the second factor was
 * added for. Somebody who steals the password AND this phone gets in, but they
 * had the phone the authenticator lives on anyway.
 *
 * SIGNED OVER THE TOTP SECRET, deliberately, and this closes a hole a
 * generation counter alone would leave open: turn the second factor off and
 * back on, and the record is deleted and recreated with a NEW secret. Any
 * device remembered under the old one stops verifying the moment the secret
 * changes, with nothing to remember to reset. The generation on top of that is
 * for the other case — a device lost while the secret stays the same — so
 * "forget every device" does not force a re-enrolment.
 *
 * Nothing is stored per device. The cookie carries its own expiry and its own
 * signature, so there is no list of devices to keep, leak, or get out of step
 * with reality.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** The browser cookie. httpOnly — the page never needs to read it. */
export const TRUSTED_DEVICE_COOKIE = "white_glove_admin_device";

/** How long a device stays remembered. */
export const TRUSTED_DEVICE_DAYS = 30;

function secret(): string | null {
  const configured = process.env.WHITE_GLOVE_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "white-glove-development-secret";
  return null;
}

/**
 * The signature over everything that should invalidate the cookie.
 *
 * `totpSecret` is in here so a re-enrolled second factor drops every device;
 * `generation` so the owner can drop them all without re-enrolling; `who` so a
 * cookie for one door is not a cookie for another; `expires` so the browser is
 * not the only thing deciding how long a month is.
 */
function sign(who: string, totpSecret: string, generation: number, expires: number): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key)
    .update(`white-glove:admin-device:${who}:${totpSecret}:${generation}:${expires}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * A cookie value for a device that has just produced a correct code.
 *
 * Null when there is no signing secret — the same rule the access token
 * follows. No secret means nothing can be trusted, so nothing is issued.
 */
export function mintTrustedDevice(
  who: string,
  totpSecret: string,
  generation: number,
  days = TRUSTED_DEVICE_DAYS,
  now = Date.now(),
): string | null {
  const expires = now + days * 86_400_000;
  const signature = sign(who, totpSecret, generation, expires);
  return signature ? `${expires}.${signature}` : null;
}

/**
 * Does this cookie let this device skip the code?
 *
 * Every reason to say no is checked before the signature, and the signature is
 * compared in constant time. An expiry in the past fails even if the browser
 * kept the cookie, because the browser's copy of "a month" is a convenience
 * and this is the part that is enforced.
 */
export function checkTrustedDevice(
  value: string | undefined | null,
  who: string,
  totpSecret: string,
  generation: number,
  now = Date.now(),
): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const expires = Number(parts[0]);
  if (!Number.isFinite(expires) || expires <= now) return false;
  const expected = sign(who, totpSecret, generation, expires);
  if (!expected) return false;
  return safeEqual(parts[1], expected);
}

/** Seconds, for the cookie's own maxAge. */
export function trustedDeviceMaxAge(days = TRUSTED_DEVICE_DAYS): number {
  return days * 24 * 60 * 60;
}
