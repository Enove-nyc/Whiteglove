/**
 * Where a Business account's own branding is kept.
 *
 * One record per account, beside the subscription rather than on the account
 * record itself — the account record is read and written whole by half a dozen
 * routes, and a logo id has no business being in the middle of that. Losing
 * this store loses a letterhead, not a login.
 */

import { type BusinessBrand, cleanBrand } from "@/lib/business-brand";
import { identityKey } from "@/lib/identity";

const PREFIX = "white-glove:business-brand:";

export function brandStoreAvailable() {
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

export async function readBrand(account: string): Promise<BusinessBrand | null> {
  if (!account || !brandStoreAvailable()) return null;
  const raw = await redis<string>(`get/${encodeURIComponent(key(account))}`);
  if (!raw) return null;
  try {
    return cleanBrand(account, JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeBrand(account: string, brand: Partial<BusinessBrand>): Promise<boolean> {
  if (!account || !brandStoreAvailable()) return false;
  const next = cleanBrand(account, { ...brand, updatedAt: new Date().toISOString() });
  return (await redis(`set/${encodeURIComponent(key(account))}`, JSON.stringify(next))) !== null;
}
