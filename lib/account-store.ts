import { createHmac, pbkdf2Sync, randomBytes } from "crypto";
import type { SavedPlace } from "@/data/route-utils";
import { accountCookieName, createAccountSession, parseAccountSession } from "@/lib/account-session";

type RedisResult<T> = { result?: T };

export type AccountRecord = {
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  verifiedAt?: string;
  verificationCodeHash?: string;
  verificationCodeExpiresAt?: string;
  verificationRequestedAt?: string;
  resetCodeHash?: string;
  resetCodeExpiresAt?: string;
};

export type AccountData = {
  route: SavedPlace[];
  favorites: SavedPlace[];
  updatedAt?: string;
};

export type AccountSummary = {
  email: string;
  routeCount: number;
  favoriteCount: number;
  createdAt?: string;
  verifiedAt?: string;
};

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

function accountKey(email: string) {
  return `white-glove:account:${email}`;
}

function dataKey(email: string) {
  return `white-glove:account-data:${email}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 120000, 64, "sha256").toString("hex");
}

function verificationSecret() {
  return process.env.WHITE_GLOVE_SESSION_SECRET || process.env.ADMIN_PASSWORD || "white-glove-development-secret";
}

function verificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashVerificationCode(email: string, code: string) {
  return createHmac("sha256", verificationSecret()).update(`${normalizeEmail(email)}:${code}`).digest("base64url");
}

export function hasAccountStorage() {
  return Boolean(redisConfig());
}

export function createSessionCookie(email: string) {
  return createAccountSession(email);
}

export function readSessionEmail(cookieValue?: string) {
  return parseAccountSession(cookieValue);
}

async function readJson<T>(key: string) {
  const response = await redis<string>(`get/${encodeURIComponent(key)}`);
  if (!response?.result) return undefined;
  try {
    return JSON.parse(response.result) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(key: string, value: unknown) {
  const payload = encodeURIComponent(JSON.stringify(value));
  const response = await redis(`set/${encodeURIComponent(key)}/${payload}`);
  return Boolean(response);
}

export async function getAccountRecord(email: string) {
  const normalized = normalizeEmail(email);
  return readJson<AccountRecord>(accountKey(normalized));
}

export async function createAccount(email: string, password: string) {
  if (!hasAccountStorage()) return { ok: false as const, error: "Connect the private database first." };
  const normalized = normalizeEmail(email);
  if (!normalized || !password) return { ok: false as const, error: "Enter an email and password." };
  const existing = await getAccountRecord(normalized);
  if (existing) return { ok: false as const, error: "An account already exists for that email." };
  const salt = randomBytes(16).toString("hex");
  const record: AccountRecord = {
    email: normalized,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
    verificationRequestedAt: new Date().toISOString(),
  };
  const code = verificationCode();
  record.verificationCodeHash = hashVerificationCode(normalized, code);
  record.verificationCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const saved = await writeJson(accountKey(normalized), record);
  if (!saved) return { ok: false as const, error: "The account could not be created." };
  await writeJson(dataKey(normalized), { route: [], favorites: [], updatedAt: new Date().toISOString() } satisfies AccountData);
  return { ok: true as const, email: normalized, verificationCode: code };
}

export async function verifyAccount(email: string, password: string) {
  const normalized = normalizeEmail(email);
  const record = await getAccountRecord(normalized);
  if (!record) return false;
  return hashPassword(password, record.salt) === record.passwordHash;
}

export async function verifyAccountStatus(email: string, password: string) {
  const normalized = normalizeEmail(email);
  const record = await getAccountRecord(normalized);
  if (!record) return { ok: false as const, reason: "missing" as const };
  if (hashPassword(password, record.salt) !== record.passwordHash) return { ok: false as const, reason: "credentials" as const };
  if (!record.verifiedAt) return { ok: false as const, reason: "unverified" as const, record };
  return { ok: true as const, record };
}

export async function requestPasswordReset(email: string) {
  if (!hasAccountStorage()) return { ok: false as const, error: "Connect the private database first." };
  const normalized = normalizeEmail(email);
  const record = await getAccountRecord(normalized);
  if (!record) return { ok: false as const, error: "No account exists for that email." };
  const code = verificationCode();
  const next: AccountRecord = {
    ...record,
    resetCodeHash: hashVerificationCode(normalized, code),
    resetCodeExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
  const saved = await writeJson(accountKey(normalized), next);
  if (!saved) return { ok: false as const, error: "The reset code could not be created." };
  return { ok: true as const, email: normalized, resetCode: code };
}

export async function resetPassword(email: string, code: string, newPassword: string) {
  const normalized = normalizeEmail(email);
  const record = await getAccountRecord(normalized);
  if (!record) return { ok: false as const, error: "No account exists for that email." };
  if (!record.resetCodeHash || !record.resetCodeExpiresAt) return { ok: false as const, error: "No reset code is active. Request a new one." };
  if (new Date(record.resetCodeExpiresAt).getTime() < Date.now()) return { ok: false as const, error: "That reset code has expired. Request a new one." };
  if (hashVerificationCode(normalized, code) !== record.resetCodeHash) return { ok: false as const, error: "That reset code is not correct." };
  if (!newPassword || newPassword.length < 8) return { ok: false as const, error: "Choose a password with at least 8 characters." };
  const salt = randomBytes(16).toString("hex");
  const next: AccountRecord = {
    ...record,
    salt,
    passwordHash: hashPassword(newPassword, salt),
    resetCodeHash: undefined,
    resetCodeExpiresAt: undefined,
  };
  const saved = await writeJson(accountKey(normalized), next);
  if (!saved) return { ok: false as const, error: "The password could not be updated." };
  return { ok: true as const, email: normalized };
}

export async function verifyEmailCode(email: string, code: string) {
  if (!hasAccountStorage()) return { ok: false as const, error: "Connect the private database first." };
  const normalized = normalizeEmail(email);
  const record = await getAccountRecord(normalized);
  if (!record) return { ok: false as const, error: "No account exists for that email." };
  if (!record.verificationCodeHash || !record.verificationCodeExpiresAt) return { ok: false as const, error: "No verification code is active. Request a new one." };
  if (new Date(record.verificationCodeExpiresAt).getTime() < Date.now()) return { ok: false as const, error: "That verification code has expired. Request a new one." };
  if (hashVerificationCode(normalized, code) !== record.verificationCodeHash) return { ok: false as const, error: "That verification code is not correct." };
  const next: AccountRecord = {
    ...record,
    verifiedAt: new Date().toISOString(),
    verificationCodeHash: undefined,
    verificationCodeExpiresAt: undefined,
  };
  const saved = await writeJson(accountKey(normalized), next);
  if (!saved) return { ok: false as const, error: "The account could not be verified." };
  return { ok: true as const, email: normalized };
}

export async function resendVerificationCode(email: string) {
  if (!hasAccountStorage()) return { ok: false as const, error: "Connect the private database first." };
  const normalized = normalizeEmail(email);
  const record = await getAccountRecord(normalized);
  if (!record) return { ok: false as const, error: "No account exists for that email." };
  const code = verificationCode();
  const next: AccountRecord = {
    ...record,
    verificationRequestedAt: new Date().toISOString(),
    verificationCodeHash: hashVerificationCode(normalized, code),
    verificationCodeExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
  const saved = await writeJson(accountKey(normalized), next);
  if (!saved) return { ok: false as const, error: "The verification code could not be refreshed." };
  return { ok: true as const, email: normalized, verificationCode: code };
}

export async function isAccountVerified(email: string) {
  const record = await getAccountRecord(email);
  return Boolean(record?.verifiedAt);
}

export async function getAccountData(email: string) {
  const normalized = normalizeEmail(email);
  const data = await readJson<AccountData>(dataKey(normalized));
  return data ?? { route: [], favorites: [] };
}

export async function saveAccountCollection(email: string, collection: "route" | "favorites", items: SavedPlace[]) {
  if (!hasAccountStorage()) return false;
  const normalized = normalizeEmail(email);
  const current = await getAccountData(normalized);
  const next: AccountData = {
    ...current,
    [collection]: items.slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
  return writeJson(dataKey(normalized), next);
}

export async function toggleAccountPlace(email: string, collection: "route" | "favorites", place: SavedPlace) {
  const current = await getAccountData(email);
  const items = current[collection] ?? [];
  const exists = items.some((item) => item.id === place.id);
  const next = exists ? items.filter((item) => item.id !== place.id) : [...items, place];
  return saveAccountCollection(email, collection, next);
}

export async function getCurrentAccountSummary(cookieValue?: string): Promise<AccountSummary | null> {
  const email = readSessionEmail(cookieValue);
  if (!email) return null;
  const [record, data] = await Promise.all([getAccountRecord(email), getAccountData(email)]);
  if (!record) return null;
  return {
    email,
    routeCount: data.route.length,
    favoriteCount: data.favorites.length,
    createdAt: record.createdAt,
    verifiedAt: record.verifiedAt,
  };
}

export async function getCurrentAccountData(cookieValue?: string) {
  const email = readSessionEmail(cookieValue);
  if (!email) return null;
  const [record, data] = await Promise.all([getAccountRecord(email), getAccountData(email)]);
  if (!record) return null;
  return { email, record, data };
}

export { accountCookieName };