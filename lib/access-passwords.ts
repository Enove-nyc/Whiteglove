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

type Scope = "admin" | "site";
type Stored = { salt: string; hash: string };

type RedisResult<T> = { result?: T };

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis<T>(command: string) {
  const config = redisConfig();
  if (!config) return undefined;
  try {
    const response = await fetch(`${config.url}/${command}`, {
      headers: { Authorization: `Bearer ${config.token}` },
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
  return scope === "admin" ? process.env.ADMIN_PASSWORD : process.env.SITE_ACCESS_PASSWORD;
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
  if (!password) return false;
  const stored = await readStored(scope);
  if (stored) {
    const candidate = hashPassword(password, stored.salt);
    return (
      candidate.length === stored.hash.length &&
      timingSafeEqual(Buffer.from(candidate), Buffer.from(stored.hash))
    );
  }
  const env = envPassword(scope);
  return Boolean(env && password === env);
}

export async function setAccessPassword(scope: Scope, newPassword: string) {
  if (!passwordStorageAvailable()) {
    return { ok: false as const, error: "Connect the private database to change passwords." };
  }
  if (!newPassword || newPassword.trim().length < 6) {
    return { ok: false as const, error: "Use a password of at least 6 characters." };
  }
  const salt = randomBytes(16).toString("hex");
  const payload = encodeURIComponent(JSON.stringify({ salt, hash: hashPassword(newPassword.trim(), salt) }));
  const response = await redis(`set/${encodeURIComponent(storageKey(scope))}/${payload}`);
  if (!response) return { ok: false as const, error: "Could not save the new password." };
  return { ok: true as const };
}
