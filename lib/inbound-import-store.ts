/**
 * Where a forwarded confirmation waits, and which account an address belongs to.
 *
 * TWO KEYS, AND THE FIRST ONE IS THE CREDENTIAL. The token in an inbound
 * address is the only thing proving a message may touch an account, so it is
 * stored as its own lookup — token to account — and never derived from
 * anything the sender controls. Rotating an account's address deletes the old
 * lookup, which is what makes rotation mean something.
 *
 * The queue is per account and deliberately small: it exists to be cleared,
 * not to become a second inbox.
 */

import { randomBytes } from "crypto";
import { identityKey } from "@/lib/identity";
import { MAX_PENDING, TOKEN_LENGTH, isStale, type PendingImport } from "@/data/inbound-import";

const TOKEN_PREFIX = "white-glove:inbound-token:";
const QUEUE_PREFIX = "white-glove:inbound-pending:";
const ADDRESS_PREFIX = "white-glove:inbound-address:";

export function inboundStoreAvailable() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

const key = (prefix: string, value: string) => encodeURIComponent(`${prefix}${value}`);

/**
 * This account's forwarding token, made on first use and stable after.
 *
 * Both directions are written: the token finds the account when a message
 * arrives, and the account finds its own token so the screen can show the
 * address without a scan.
 */
export async function ensureInboundToken(account: string): Promise<string> {
  if (!account || !inboundStoreAvailable()) return "";
  const id = identityKey(account);
  const existing = await redis<string>(`get/${key(ADDRESS_PREFIX, id)}`);
  if (existing) return existing;
  const token = randomBytes(TOKEN_LENGTH).toString("base64url").slice(0, TOKEN_LENGTH);
  const wrote = await redis(`set/${key(TOKEN_PREFIX, token)}`, JSON.stringify({ account, at: new Date().toISOString() }));
  if (wrote === null) return "";
  await redis(`set/${key(ADDRESS_PREFIX, id)}`, token);
  return token;
}

/** Whose address is this? The only thing that decides a message's destination. */
export async function accountForToken(token: string): Promise<string> {
  if (!token || !inboundStoreAvailable()) return "";
  const raw = await redis<string>(`get/${key(TOKEN_PREFIX, token)}`);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { account?: unknown };
    return typeof parsed.account === "string" ? parsed.account : "";
  } catch {
    return "";
  }
}

/** Retire the old address and issue a new one — the point of a rotatable credential. */
export async function rotateInboundToken(account: string): Promise<string> {
  if (!account || !inboundStoreAvailable()) return "";
  const id = identityKey(account);
  const old = await redis<string>(`get/${key(ADDRESS_PREFIX, id)}`);
  if (old) await redis(`del/${key(TOKEN_PREFIX, old)}`);
  await redis(`del/${key(ADDRESS_PREFIX, id)}`);
  return ensureInboundToken(account);
}

export async function readPending(account: string): Promise<PendingImport[]> {
  if (!account || !inboundStoreAvailable()) return [];
  const raw = await redis<string>(`get/${key(QUEUE_PREFIX, identityKey(account))}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PendingImport[]) : [];
  } catch {
    return [];
  }
}

async function writePending(account: string, entries: PendingImport[]): Promise<boolean> {
  return (await redis(`set/${key(QUEUE_PREFIX, identityKey(account))}`, JSON.stringify(entries))) !== null;
}

/**
 * Put one forwarded confirmation on the queue.
 *
 * Stale entries are dropped on the way in, so the queue tidies itself without
 * anything having to run on a schedule.
 */
export async function addPending(account: string, entry: PendingImport): Promise<boolean> {
  if (!account || !inboundStoreAvailable()) return false;
  const now = new Date().toISOString();
  const kept = (await readPending(account)).filter((e) => !isStale(e, now));
  return writePending(account, [entry, ...kept].slice(0, MAX_PENDING));
}

/** Taken off the queue once the planner has kept or discarded its rows. */
export async function clearPending(account: string, id: string): Promise<boolean> {
  if (!account || !inboundStoreAvailable()) return false;
  return writePending(account, (await readPending(account)).filter((e) => e.id !== id));
}
