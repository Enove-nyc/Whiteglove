import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Time-based one-time passwords — RFC 6238, the six digits an authenticator
 * app shows.
 *
 * WRITTEN OUT RATHER THAN INSTALLED. This is a small, frozen, fully specified
 * algorithm: HMAC-SHA1 over a 30-second counter, truncated. The RFC publishes
 * test vectors for it, so an implementation can be proved right rather than
 * trusted — see tests/totp.test.ts, which runs every one of them. A dependency
 * here would be a package with its own supply chain sitting in front of the
 * admin's second factor, in exchange for about forty lines.
 *
 * SHA1 IS CORRECT HERE and is not a lapse. TOTP is HMAC-SHA1 by default and
 * that is what every authenticator app implements; HMAC-SHA1 is not affected
 * by the collision attacks that retired SHA1 for signatures, and a code that
 * lives thirty seconds is not a thing anybody is finding a preimage for.
 * Choosing SHA256 here would simply mean the codes did not match the app.
 */

/** Thirty seconds, per the RFC and every authenticator that implements it. */
export const STEP_SECONDS = 30;

/**
 * How far either side of now a code is accepted.
 *
 * One step — thirty seconds back and thirty forward. Somebody typing the code
 * as it rolls over, or a phone whose clock is slightly off, still gets in;
 * anything wider starts meaningfully lengthening the window in which a code
 * shoulder-surfed off a screen still works.
 */
export const DRIFT_STEPS = 1;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Tolerant of the spaces and lowercase somebody gets from typing a key by hand. */
export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error("not base32");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A fresh 160-bit secret, as base32 — the length RFC 4226 recommends. */
export function randomSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Which 30-second step a moment falls in. */
export function stepFor(atMs: number): number {
  return Math.floor(atMs / 1000 / STEP_SECONDS);
}

/**
 * The code for one step.
 *
 * `digits` exists only so the RFC's own eight-digit test vectors can be run
 * against this; everything real uses the default six.
 */
export function totpCode(secret: string, step: number, digits = 6): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  // Dynamic truncation, RFC 4226 §5.3: the low nibble of the last byte picks
  // where in the digest to read the number from.
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) | ((mac[offset + 1] & 0xff) << 16) | ((mac[offset + 2] & 0xff) << 8) | (mac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export type TotpCheck =
  /** Good, and the step it was for — the caller must store this. See below. */
  | { ok: true; step: number }
  | { ok: false; reason: "malformed" | "wrong" | "reused" };

/**
 * Whether this code is currently valid for this secret.
 *
 * REPLAY IS REFUSED, which is the part an implementation usually forgets. A
 * code is good for up to ninety seconds across the drift window, and in that
 * time it can be read over somebody's shoulder, left in a chat message, or
 * caught in a screen share. `lastUsedStep` is whatever this function returned
 * the last time it let this secret in; anything at or below it is refused even
 * though the arithmetic still says the digits are right. That is what makes a
 * code one-time rather than merely short-lived.
 */
export function verifyTotp(
  secret: string,
  code: string,
  options: { now?: number; lastUsedStep?: number; drift?: number } = {},
): TotpCheck {
  const candidate = code.replace(/[\s-]/g, "");
  if (!/^\d{6}$/.test(candidate)) return { ok: false, reason: "malformed" };

  const now = options.now ?? Date.now();
  const drift = options.drift ?? DRIFT_STEPS;
  const current = stepFor(now);

  for (let offset = -drift; offset <= drift; offset += 1) {
    const step = current + offset;
    if (step < 0) continue;
    const expected = totpCode(secret, step);
    // Constant-time: comparing digit by digit leaks which prefix was right,
    // and six digits is few enough for that to matter.
    if (expected.length === candidate.length && timingSafeEqual(Buffer.from(expected), Buffer.from(candidate))) {
      if (options.lastUsedStep !== undefined && step <= options.lastUsedStep) return { ok: false, reason: "reused" };
      return { ok: true, step };
    }
  }
  return { ok: false, reason: "wrong" };
}

/**
 * The otpauth:// URI an authenticator app understands.
 *
 * Tapped on the phone itself it opens the app with everything filled in; the
 * secret is also shown as text, because manual entry is how somebody sets this
 * up on a phone that is not the one they are reading the screen on.
 */
export function otpauthUri({ secret, account, issuer }: { secret: string; account: string; issuer: string }): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}
