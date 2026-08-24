/**
 * Where an Advisor Pro account's own branding is kept.
 *
 * One record per account, beside the subscription rather than on the account
 * record itself — the account record is read and written whole by half a dozen
 * routes, and a logo id has no business being in the middle of that. Losing
 * this store loses a letterhead, not a login.
 *
 * AN AGENCY SHARES ONE. A client working with any advisor on the same agency
 * should see the same name and the same logo — that is the whole point of
 * being one business rather than several. So the record this reads and
 * writes is keyed by the agency (lib/agency.ts) when the account belongs to
 * one, and by the account itself otherwise; every caller keeps passing its
 * own account and never has to know which.
 */

import { agencyIdFor } from "@/lib/agency-store";
import { type BusinessBrand, cleanBrand } from "@/lib/business-brand";
import { identityKey } from "@/lib/identity";

const PREFIX = "white-glove:business-brand:";
const AGENCY_PREFIX = "white-glove:business-brand:agency:";

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

/** The record this account's brand actually lives under — its own, or its agency's. */
async function keyFor(account: string): Promise<string> {
  const agencyId = await agencyIdFor(account);
  return agencyId ? `${AGENCY_PREFIX}${agencyId}` : `${PREFIX}${identityKey(account)}`;
}

export async function readBrand(account: string): Promise<BusinessBrand | null> {
  if (!account || !brandStoreAvailable()) return null;
  const raw = await redis<string>(`get/${encodeURIComponent(await keyFor(account))}`);
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
  return (await redis(`set/${encodeURIComponent(await keyFor(account))}`, JSON.stringify(next))) !== null;
}
