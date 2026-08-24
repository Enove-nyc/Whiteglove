/**
 * Where a Business account's own Stripe Connect account is kept.
 *
 * One record per account, the same shape as lib/business-brand-store.ts and
 * lib/app-prefs-store.ts — a planner's connected account id has no business
 * being inside the account record half a dozen routes read and write whole.
 * Losing this store loses the connection to Stripe, not a login, and not a
 * single trip's ledger (that lives on the trip itself — see
 * lib/account-store.ts's balance field).
 */

import { identityKey } from "@/lib/identity";

export type ConnectAccount = {
  /** Stripe's "acct_..." id for this planner's own connected account. */
  accountId: string;
  /** Whether Stripe has finished onboarding this account enough to accept a charge. */
  chargesEnabled: boolean;
  /** Whether Stripe will actually pay this account out. A charge can succeed before this is true. */
  payoutsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const PREFIX = "white-glove:stripe-connect:";

export function connectStoreAvailable() {
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

const key = (account: string) => `${PREFIX}${identityKey(account)}`;

export async function getConnectAccount(account: string): Promise<ConnectAccount | null> {
  if (!account || !connectStoreAvailable()) return null;
  const raw = await redis<string>(`get/${encodeURIComponent(key(account))}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConnectAccount;
  } catch {
    return null;
  }
}

export async function saveConnectAccount(account: string, patch: Partial<Omit<ConnectAccount, "createdAt" | "updatedAt">>): Promise<boolean> {
  if (!account || !connectStoreAvailable()) return false;
  const existing = await getConnectAccount(account);
  const now = new Date().toISOString();
  const next: ConnectAccount = {
    accountId: patch.accountId ?? existing?.accountId ?? "",
    chargesEnabled: patch.chargesEnabled ?? existing?.chargesEnabled ?? false,
    payoutsEnabled: patch.payoutsEnabled ?? existing?.payoutsEnabled ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (!next.accountId) return false;
  return (await redis(`set/${encodeURIComponent(key(account))}`, JSON.stringify(next))) !== null;
}
