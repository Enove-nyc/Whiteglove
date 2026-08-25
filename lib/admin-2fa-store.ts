import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { randomSecret, verifyTotp } from "@/lib/totp";

/**
 * The admin's second factor.
 *
 * WHAT THIS IS FOR. Until now the admin had one credential per door and both
 * were only a password: one shared code, held by everybody who has ever been
 * given it and never taken back, and a named administrator's own account
 * password. Behind either is the finances, every visitor's email and phone
 * number, every shomer's number, and the switch that closes the site. A
 * password that leaked two years ago still opens all of it, and nothing
 * anywhere would show that it had.
 *
 * TWO DOORS, TWO KINDS OF SECRET, ONE MECHANISM. A named administrator gets
 * their own — enrolled from their own screen, on their own phone. The shared
 * password gets exactly one, set by the owner, which every holder of that
 * password must then also have. That is deliberately awkward: the shared
 * password is the weaker door and this makes it feel like it. It is also the
 * only thing that helps at all with a password somebody still has from a year
 * ago, since there is no account to disable.
 *
 * NOTHING IS REQUIRED UNTIL IT IS ENROLLED. Neither door demands a code until
 * a secret exists for it. An owner who never sets this up is exactly where
 * they were; one who does cannot be locked out by having done so, because of
 * the recovery codes below.
 *
 * RECOVERY CODES, WHICH ARE THE PART THAT IS USUALLY MISSING. A phone is lost,
 * dropped, wiped or replaced, and second factors are how people lock
 * themselves out of their own systems permanently. Ten single-use codes are
 * issued at enrolment. They are stored HASHED, exactly like a password, so
 * this store never holds anything that opens the door — somebody reading the
 * database gets a list of hashes and a TOTP secret they would still need a
 * clock and the algorithm for, rather than ten working keys.
 *
 * THE LAST STEP IS REMEMBERED, so a code cannot be used twice. See
 * verifyTotp's own note: without it a code is short-lived rather than
 * one-time, and ninety seconds is long enough for one to be shoulder-surfed,
 * screen-shared or left sitting in a chat message.
 */

/** The shared password's own factor is filed under this rather than an email. */
export const SHARED_DOOR = "shared-password";

export type TwoFactorRecord = {
  /** base32, as the authenticator app took it. */
  secret: string;
  /** ISO, when it was confirmed with a working code — never at the moment it was generated. */
  confirmedAt: string;
  /** The last TOTP step this secret was let in on. Replay is refused at or below it. */
  lastStep?: number;
  /** sha256 of each unused recovery code. Used ones are removed, not marked. */
  recoveryHashes: string[];
};

const PREFIX = "white-glove:admin-2fa:";

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function twoFactorStorageAvailable() {
  return Boolean(redisConfig());
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const config = redisConfig();
  if (!config) return null;
  try {
    const res = await fetch(`${config.url}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${config.token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return ((await res.json()) as { result?: T }).result ?? null;
  } catch {
    return null;
  }
}

/** Emails are keyed the way every other store here keys them. */
export function twoFactorKeyFor(who: string): string {
  return who === SHARED_DOOR ? SHARED_DOOR : who.trim().toLowerCase();
}

export async function readTwoFactor(who: string): Promise<TwoFactorRecord | null> {
  const raw = await redis<string>(`get/${encodeURIComponent(PREFIX + twoFactorKeyFor(who))}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TwoFactorRecord;
    return parsed?.secret && parsed.confirmedAt ? parsed : null;
  } catch {
    return null;
  }
}

async function writeTwoFactor(who: string, record: TwoFactorRecord): Promise<boolean> {
  const written = await redis(`set/${encodeURIComponent(PREFIX + twoFactorKeyFor(who))}`, JSON.stringify(record));
  return written !== null;
}

/** Turning it off again. Only ever by somebody already through the door. */
export async function clearTwoFactor(who: string): Promise<boolean> {
  return (await redis(`del/${encodeURIComponent(PREFIX + twoFactorKeyFor(who))}`)) !== null;
}

/** Whether this door demands a code at all. Nothing enrolled means nothing demanded. */
export async function twoFactorRequired(who: string): Promise<boolean> {
  return (await readTwoFactor(who)) !== null;
}

function hashRecovery(code: string): string {
  return createHash("sha256").update(`white-glove:recovery:${code.replace(/[\s-]/g, "").toLowerCase()}`).digest("hex");
}

/**
 * Ten codes, shown once and never again.
 *
 * Grouped in fours with a dash because they are written on paper or pasted
 * into a password manager, and an unbroken run of characters is the shape
 * people mistype. Lowercase for the same reason.
 */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(6).toString("hex"); // 12 hex characters, 48 bits
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
}

/**
 * Begin enrolment: a secret to show, not yet in force.
 *
 * NOT WRITTEN HERE, deliberately. A secret stored before it is proven to work
 * is how somebody ends up locked out by a phone whose clock is wrong or an app
 * that never finished adding it. It goes into the store only once a code
 * generated from it has been typed back — see confirmTwoFactor.
 */
export function beginTwoFactor(): { secret: string } {
  return { secret: randomSecret() };
}

/**
 * Finish enrolment, given a code the authenticator actually produced.
 *
 * Returns the recovery codes in the clear, once. They are not recoverable
 * afterwards: only their hashes are kept, so a later "show them again" is
 * answered by issuing fresh ones rather than by reading these back.
 */
export async function confirmTwoFactor(
  who: string,
  secret: string,
  code: string,
  now = Date.now(),
): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  if (!twoFactorStorageAvailable()) return { ok: false, error: "This needs the private store connected." };
  const check = verifyTotp(secret, code, { now });
  if (!check.ok) {
    return {
      ok: false,
      error:
        check.reason === "malformed"
          ? "Enter the six digits your app is showing."
          : "That code did not match. Check your phone's clock is set automatically, then try the next one.",
    };
  }
  const recoveryCodes = generateRecoveryCodes();
  const record: TwoFactorRecord = {
    secret,
    confirmedAt: new Date(now).toISOString(),
    lastStep: check.step,
    recoveryHashes: recoveryCodes.map(hashRecovery),
  };
  if (!(await writeTwoFactor(who, record))) return { ok: false, error: "Could not save it. Nothing was changed." };
  return { ok: true, recoveryCodes };
}

export type SecondFactorResult =
  | { ok: true; usedRecoveryCode: boolean; recoveryCodesLeft: number }
  | { ok: false; error: string };

/**
 * Check a code at the door — either the six digits, or one recovery code.
 *
 * Both are spent on success: the TOTP step is recorded so it cannot be
 * replayed, and a recovery code is deleted rather than flagged. Whichever
 * arrives, a failure says the same thing, because "that was a valid recovery
 * code but the wrong one" is not a sentence worth handing an attacker.
 */
export async function checkSecondFactor(who: string, code: string, now = Date.now()): Promise<SecondFactorResult> {
  const record = await readTwoFactor(who);
  // Nothing enrolled: this door does not ask, so it cannot refuse.
  if (!record) return { ok: true, usedRecoveryCode: false, recoveryCodesLeft: 0 };

  const entered = code.replace(/[\s-]/g, "");
  if (!entered) return { ok: false, error: "Enter the code from your authenticator app." };

  const totp = verifyTotp(record.secret, entered, { now, lastUsedStep: record.lastStep });
  if (totp.ok) {
    await writeTwoFactor(who, { ...record, lastStep: totp.step });
    return { ok: true, usedRecoveryCode: false, recoveryCodesLeft: record.recoveryHashes.length };
  }

  const hashed = hashRecovery(entered);
  const match = record.recoveryHashes.find(
    (stored) => stored.length === hashed.length && timingSafeEqual(Buffer.from(stored), Buffer.from(hashed)),
  );
  if (match) {
    const left = record.recoveryHashes.filter((stored) => stored !== match);
    // Spent whether or not the write lands: a recovery code that stayed usable
    // because a write failed is worse than one lost to a bad moment.
    await writeTwoFactor(who, { ...record, recoveryHashes: left });
    return { ok: true, usedRecoveryCode: true, recoveryCodesLeft: left.length };
  }

  return {
    ok: false,
    error:
      totp.reason === "reused"
        ? "That code has already been used. Wait for your app to show the next one."
        : "That code is not correct.",
  };
}

/** Fresh recovery codes for somebody already through the door, replacing whatever is left. */
export async function regenerateRecoveryCodes(who: string): Promise<{ ok: true; recoveryCodes: string[] } | { ok: false; error: string }> {
  const record = await readTwoFactor(who);
  if (!record) return { ok: false, error: "Two-factor is not set up on this account." };
  const recoveryCodes = generateRecoveryCodes();
  if (!(await writeTwoFactor(who, { ...record, recoveryHashes: recoveryCodes.map(hashRecovery) }))) {
    return { ok: false, error: "Could not save them. Your existing codes still work." };
  }
  return { ok: true, recoveryCodes };
}
