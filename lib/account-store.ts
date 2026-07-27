import { createHmac, pbkdf2Sync, randomBytes } from "crypto";
import type { Itinerary } from "@/data/itinerary";
import type { SavedPlace } from "@/data/route-utils";
import { accountCookieName, createAccountSession, parseAccountSession } from "@/lib/account-session";

type RedisResult<T> = { result?: T };

export type AccountRecord = {
  email: string;
  name?: string;
  phone?: string;
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
  itinerary?: Itinerary;
  itineraryShareId?: string; // public read-only share token for this account's trip
  itineraryCollaborators?: string[]; // emails the owner added to the trip
  updatedAt?: string;
};

// One entry in a person's "shared with me" index.
export type SharedTrip = {
  ownerEmail: string;
  ownerName?: string;
  title: string;
  shareId: string;
};

export type AccountSummary = {
  email: string;
  name?: string;
  phone?: string;
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

export type AdminAccountSummary = {
  email: string;
  name?: string;
  phone?: string;
  createdAt?: string;
  verifiedAt?: string;
  routeCount: number;
  favoriteCount: number;
  hasItinerary: boolean;
};

const ACCOUNT_PREFIX = "white-glove:account:";

/**
 * Every registered account, for the owner's admin view. Scans the Redis
 * keyspace (SCAN) rather than needing an index, so it includes accounts made
 * before this feature. Returns only owner-appropriate fields — never the
 * password hash or salt.
 */
export async function listAllAccounts(): Promise<AdminAccountSummary[]> {
  if (!hasAccountStorage()) return [];
  const keys: string[] = [];
  let cursor = "0";
  let guard = 0;
  do {
    const res = await redis<[string, string[]]>(
      `scan/${cursor}/match/${encodeURIComponent(`${ACCOUNT_PREFIX}*`)}/count/500`,
    );
    const [next, batch] = res?.result ?? ["0", []];
    cursor = typeof next === "string" ? next : "0";
    if (Array.isArray(batch)) keys.push(...batch);
    guard += 1;
  } while (cursor !== "0" && guard < 100);

  const emails = keys.map((k) => k.slice(ACCOUNT_PREFIX.length)).filter(Boolean);
  const summaries = await Promise.all(
    emails.map(async (email): Promise<AdminAccountSummary | null> => {
      const [record, data] = await Promise.all([getAccountRecord(email), getAccountData(email)]);
      if (!record) return null;
      return {
        email: record.email,
        name: record.name,
        phone: record.phone,
        createdAt: record.createdAt,
        verifiedAt: record.verifiedAt,
        routeCount: data.route?.length ?? 0,
        favoriteCount: data.favorites?.length ?? 0,
        hasItinerary: Boolean(data.itinerary),
      };
    }),
  );
  return summaries
    .filter((s): s is AdminAccountSummary => s !== null)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function createAccount(email: string, password: string, name?: string) {
  if (!hasAccountStorage()) return { ok: false as const, error: "Connect the private database first." };
  const normalized = normalizeEmail(email);
  if (!normalized || !password) return { ok: false as const, error: "Enter an email and password." };
  const existing = await getAccountRecord(normalized);
  if (existing) return { ok: false as const, error: "An account already exists for that email." };
  const salt = randomBytes(16).toString("hex");
  const cleanName = name?.trim();
  const record: AccountRecord = {
    email: normalized,
    name: cleanName || undefined,
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

export async function saveAccountItinerary(email: string, itinerary: Itinerary) {
  if (!hasAccountStorage()) return false;
  const normalized = normalizeEmail(email);
  const current = await getAccountData(normalized);
  const next: AccountData = {
    ...current,
    itinerary: { ...itinerary, updatedAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
  return writeJson(dataKey(normalized), next);
}

// ---- Itinerary sharing ------------------------------------------------

function shareKey(shareId: string) {
  return `white-glove:itinerary-share:${shareId}`;
}
function sharedWithKey(email: string) {
  return `white-glove:shared-with:${normalizeEmail(email)}`;
}
function shareToken() {
  return randomBytes(9).toString("base64url"); // ~12 url-safe chars
}

async function patchAccountData(email: string, patch: Partial<AccountData>) {
  const normalized = normalizeEmail(email);
  const current = await getAccountData(normalized);
  const next: AccountData = { ...current, ...patch, updatedAt: new Date().toISOString() };
  const ok = await writeJson(dataKey(normalized), next);
  return ok ? next : null;
}

/** Current share state for the owner's trip. */
export async function getItineraryShareState(email: string) {
  const data = await getAccountData(email);
  return { shareId: data.itineraryShareId, collaborators: data.itineraryCollaborators ?? [] };
}

/** Ensure a public share token exists for this account's trip; returns it. */
export async function ensureItineraryShare(email: string): Promise<string | null> {
  if (!hasAccountStorage()) return null;
  const normalized = normalizeEmail(email);
  const data = await getAccountData(normalized);
  if (data.itineraryShareId) {
    // Make sure the reverse lookup exists (self-heal).
    await writeJson(shareKey(data.itineraryShareId), { ownerEmail: normalized, createdAt: new Date().toISOString() });
    return data.itineraryShareId;
  }
  const token = shareToken();
  const wrote = await writeJson(shareKey(token), { ownerEmail: normalized, createdAt: new Date().toISOString() });
  if (!wrote) return null;
  await patchAccountData(normalized, { itineraryShareId: token });
  return token;
}

/** Stop sharing: remove the public link and every collaborator's access. */
export async function stopItineraryShare(email: string) {
  if (!hasAccountStorage()) return false;
  const normalized = normalizeEmail(email);
  const data = await getAccountData(normalized);
  if (data.itineraryShareId) await deleteKey(shareKey(data.itineraryShareId));
  for (const collaborator of data.itineraryCollaborators ?? []) {
    await removeFromSharedWith(collaborator, normalized);
  }
  await patchAccountData(normalized, { itineraryShareId: undefined, itineraryCollaborators: [] });
  return true;
}

export async function getShareOwnerEmail(shareId: string): Promise<string | null> {
  const rec = await readJson<{ ownerEmail: string }>(shareKey(shareId));
  return rec?.ownerEmail ?? null;
}

/** Read a shared trip by its public token (read-only view). */
export async function getSharedItineraryByShareId(shareId: string) {
  const ownerEmail = await getShareOwnerEmail(shareId);
  if (!ownerEmail) return null;
  const [data, record] = await Promise.all([getAccountData(ownerEmail), getAccountRecord(ownerEmail)]);
  if (!data.itinerary) return null;
  return { itinerary: data.itinerary, ownerName: record?.name, ownerEmail };
}

async function upsertSharedWith(collaboratorEmail: string, entry: SharedTrip) {
  const key = sharedWithKey(collaboratorEmail);
  const list = (await readJson<SharedTrip[]>(key)) ?? [];
  const next = [entry, ...list.filter((e) => normalizeEmail(e.ownerEmail) !== normalizeEmail(entry.ownerEmail))].slice(0, 50);
  await writeJson(key, next);
}
async function removeFromSharedWith(collaboratorEmail: string, ownerEmail: string) {
  const key = sharedWithKey(collaboratorEmail);
  const list = (await readJson<SharedTrip[]>(key)) ?? [];
  const next = list.filter((e) => normalizeEmail(e.ownerEmail) !== normalizeEmail(ownerEmail));
  await writeJson(key, next);
}

/** Add a person (by email) to the owner's trip. Returns the share token + list. */
export async function addItineraryCollaborator(ownerEmail: string, collaboratorEmail: string) {
  if (!hasAccountStorage()) return { ok: false as const, error: "Connect the private database first." };
  const owner = normalizeEmail(ownerEmail);
  const person = normalizeEmail(collaboratorEmail);
  if (!person || !person.includes("@")) return { ok: false as const, error: "Enter a valid email address." };
  if (person === owner) return { ok: false as const, error: "That's your own account." };
  const shareId = await ensureItineraryShare(owner);
  if (!shareId) return { ok: false as const, error: "Could not create the share link." };
  const data = await getAccountData(owner);
  const current = data.itineraryCollaborators ?? [];
  const collaborators = current.includes(person) ? current : [...current, person].slice(0, 50);
  await patchAccountData(owner, { itineraryCollaborators: collaborators });
  const [record] = await Promise.all([getAccountRecord(owner)]);
  await upsertSharedWith(person, { ownerEmail: owner, ownerName: record?.name, title: data.itinerary?.title || "Shared trip", shareId });
  return { ok: true as const, shareId, collaborators };
}

export async function removeItineraryCollaborator(ownerEmail: string, collaboratorEmail: string) {
  if (!hasAccountStorage()) return { ok: false as const, error: "Connect the private database first." };
  const owner = normalizeEmail(ownerEmail);
  const person = normalizeEmail(collaboratorEmail);
  const data = await getAccountData(owner);
  const collaborators = (data.itineraryCollaborators ?? []).filter((e) => e !== person);
  await patchAccountData(owner, { itineraryCollaborators: collaborators });
  await removeFromSharedWith(person, owner);
  return { ok: true as const, collaborators };
}

/** Trips other people have shared with this person (still-valid ones only). */
export async function listSharedWithMe(email: string): Promise<SharedTrip[]> {
  const list = (await readJson<SharedTrip[]>(sharedWithKey(email))) ?? [];
  const valid = await Promise.all(
    list.map(async (e): Promise<SharedTrip | null> => {
      const owner = await getShareOwnerEmail(e.shareId);
      if (!owner || normalizeEmail(owner) !== normalizeEmail(e.ownerEmail)) return null;
      const data = await getAccountData(owner);
      // Confirm the person is still a collaborator (owner may have removed them).
      if (!(data.itineraryCollaborators ?? []).includes(normalizeEmail(email))) return null;
      return { ...e, title: data.itinerary?.title || e.title };
    }),
  );
  return valid.filter((e): e is SharedTrip => e !== null);
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
    name: record.name,
    phone: record.phone,
    routeCount: data.route.length,
    favoriteCount: data.favorites.length,
    createdAt: record.createdAt,
    verifiedAt: record.verifiedAt,
  };
}

async function deleteKey(key: string) {
  const response = await redis(`del/${encodeURIComponent(key)}`);
  return Boolean(response);
}

export async function updateAccountProfile(email: string, updates: { name?: string; phone?: string }) {
  if (!hasAccountStorage()) return { ok: false as const, error: "Connect the private database first." };
  const normalized = normalizeEmail(email);
  const record = await getAccountRecord(normalized);
  if (!record) return { ok: false as const, error: "Account not found." };
  const next: AccountRecord = {
    ...record,
    name: updates.name !== undefined ? updates.name.trim() || undefined : record.name,
    phone: updates.phone !== undefined ? updates.phone.trim() || undefined : record.phone,
  };
  const saved = await writeJson(accountKey(normalized), next);
  if (!saved) return { ok: false as const, error: "Could not save your changes." };
  return { ok: true as const };
}

// Move the account (and its saved data) to a new email key. Email is the
// record key, so changing it re-keys both records and removes the old ones.
export async function changeAccountEmail(currentEmail: string, newEmail: string) {
  if (!hasAccountStorage()) return { ok: false as const, error: "Connect the private database first." };
  const from = normalizeEmail(currentEmail);
  const to = normalizeEmail(newEmail);
  if (!to || !to.includes("@")) return { ok: false as const, error: "Enter a valid email address." };
  if (to === from) return { ok: true as const, email: from };
  if (await getAccountRecord(to)) return { ok: false as const, error: "An account already exists for that email." };
  const record = await getAccountRecord(from);
  if (!record) return { ok: false as const, error: "Account not found." };
  const data = await getAccountData(from);
  const moved = await writeJson(accountKey(to), { ...record, email: to });
  if (!moved) return { ok: false as const, error: "Could not update your email." };
  await writeJson(dataKey(to), data);
  await deleteKey(accountKey(from));
  await deleteKey(dataKey(from));
  return { ok: true as const, email: to };
}

export async function deleteAccount(email: string) {
  if (!hasAccountStorage()) return { ok: false as const, error: "Connect the private database first." };
  const normalized = normalizeEmail(email);
  await deleteKey(accountKey(normalized));
  await deleteKey(dataKey(normalized));
  return { ok: true as const };
}

export async function getCurrentAccountData(cookieValue?: string) {
  const email = readSessionEmail(cookieValue);
  if (!email) return null;
  const [record, data] = await Promise.all([getAccountRecord(email), getAccountData(email)]);
  if (!record) return null;
  return { email, record, data };
}

export { accountCookieName };