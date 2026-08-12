// Editable access passwords (admin dashboard + public site lock).
//
// Passwords can be changed from the admin portal. A changed password is stored
// (salted + hashed) in Redis and takes priority; when none is stored we fall
// back to the ADMIN_PASSWORD / SITE_ACCESS_PASSWORD environment variables.
//
// Note: the signed access COOKIE is derived from WHITE_GLOVE_SESSION_SECRET
// (see lib/secure-access.ts), not from these passwords — so changing a password
// does not invalidate existing signed-in sessions, and does not depend on the
// env password staying constant.

import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

/**
 * "preview" is the five-minute code — a second way into the closed site, for
 * handing to somebody who needs to check one thing. It is stored and changed
 * exactly like the others; all that differs is how long the cookie it issues
 * survives, which is decided in lib/site-access.ts.
 */
type Scope = "admin" | "site" | "preview";
type Stored = { salt: string; hash: string };

type RedisResult<T> = { result?: T };

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis<T>(command: string, body?: string) {
  const config = redisConfig();
  if (!config) return undefined;
  try {
    const response = await fetch(`${config.url}/${command}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${config.token}` },
      body,
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    return (await response.json()) as RedisResult<T>;
  } catch {
    return undefined;
  }
}

function storageKey(scope: Scope) {
  return `white-glove:auth:${scope}-password`;
}

function hashPassword(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 120000, 64, "sha256").toString("hex");
}

function envPassword(scope: Scope) {
  if (scope === "admin") return process.env.ADMIN_PASSWORD;
  if (scope === "preview") return process.env.SITE_PREVIEW_PASSWORD;
  return process.env.SITE_ACCESS_PASSWORD;
}

async function readStored(scope: Scope): Promise<Stored | null> {
  const response = await redis<string>(`get/${encodeURIComponent(storageKey(scope))}`);
  if (!response?.result) return null;
  try {
    return JSON.parse(response.result) as Stored;
  } catch {
    return null;
  }
}

export function passwordStorageAvailable() {
  return Boolean(redisConfig());
}

/** Whether a custom (stored) password has been set for this scope. */
export async function hasStoredPassword(scope: Scope) {
  return (await readStored(scope)) !== null;
}

export async function verifyAccessPassword(scope: Scope, password: string): Promise<boolean> {
  // Trim so a short numeric code is not rejected for a trailing space or newline
  // from paste. Settings → Passwords already stores the trimmed value.
  const candidate = password.trim();
  if (!candidate) return false;
  const env = envPassword(scope)?.trim();
  const stored = await readStored(scope);
  if (stored) {
    const hashed = hashPassword(candidate, stored.salt);
    const matchesStored =
      hashed.length === stored.hash.length &&
      timingSafeEqual(Buffer.from(hashed), Buffer.from(stored.hash));
    if (matchesStored) return true;
    // Local DX: `next dev` often points at the same Upstash as production, so a
    // password changed under Settings → Passwords shadows `.env.local`. In
    // development, still accept the env password so localhost matches what the
    // owner put in `.env.local`. Production keeps Redis as the only source of
    // truth once a stored password exists.
    if (process.env.NODE_ENV !== "production" && env && candidate === env) return true;
    return false;
  }
  return Boolean(env && candidate === env);
}

export function minPasswordLength(scope: Scope) {
  return scope === "admin" ? 6 : 4;
}

/**
 * Which code was entered, if any.
 *
 * The two site codes are checked in turn so one form field can accept either —
 * the visitor should not have to be told which kind of code they were given.
 * The full code is tried first: if the same string were somehow set as both,
 * the longer-lasting reading is the one the owner meant.
 */
export async function identifySiteCode(password: string): Promise<"full" | "preview" | null> {
  if (!password) return null;
  if (await verifyAccessPassword("site", password)) return "full";
  if (await verifyAccessPassword("preview", password)) return "preview";
  // Local DX: owners often type ADMIN_PASSWORD on /access. That code only
  // opens /admin — except in development, where accepting it here saves the
  // "password is set but doesn't work" loop when Redis/env site codes differ.
  if (process.env.NODE_ENV !== "production" && (await verifyAccessPassword("admin", password))) {
    return "full";
  }
  return null;
}

export async function setAccessPassword(scope: Scope, newPassword: string) {
  if (!passwordStorageAvailable()) {
    return { ok: false as const, error: "Connect the private database to change passwords." };
  }
  const min = minPasswordLength(scope);
  if (!newPassword || newPassword.trim().length < min) {
    return { ok: false as const, error: `Use a password of at least ${min} characters.` };
  }
  const salt = randomBytes(16).toString("hex");
  const payload = JSON.stringify({ salt, hash: hashPassword(newPassword.trim(), salt) });
  const response = await redis(`set/${encodeURIComponent(storageKey(scope))}`, payload);
  if (!response) return { ok: false as const, error: "Could not save the new password." };
  return { ok: true as const };
}
