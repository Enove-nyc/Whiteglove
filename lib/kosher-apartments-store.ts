/**
 * Kosher-apartment providers the owner adds from the admin.
 *
 * The built-in list in data/kosher-apartment-hosts.ts is a curated flat file
 * (empty for now); this is the parallel store for the ones the owner adds
 * himself, kept in the same private Upstash store as the site notice and the
 * eruvin. It fails open: with no store connected, the public page shows the
 * built-in list, exactly as before an editor existed. A disconnected store is a
 * page with fewer providers, never a broken one.
 *
 * WHY NOT A PRISMA TABLE. A provider is a few short strings and a link — no
 * relations, no query beyond "list them all". A JSON value under one key is the
 * honest size of it, and it needs no migration to ship.
 */

import { revalidatePath, unstable_cache } from "next/cache";
import type { ApartmentProvider } from "@/lib/kosher-apartments";

const KEY = "white-glove:kosher-apartments-added";
const TAG = "kosher-apartments-added";

export function apartmentsStoreAvailable(): boolean {
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

/** Never throws: an unreachable or unparseable store reads as no additions. */
async function read(): Promise<ApartmentProvider[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as ApartmentProvider[]) : [];
  } catch {
    return [];
  }
}

const cached = unstable_cache(read, ["kosher-apartments-added"], { tags: [TAG], revalidate: 3600 });

/** The owner-added providers, cached until one is saved. */
export function getStoredApartments(): Promise<ApartmentProvider[]> {
  return cached();
}

async function write(list: ApartmentProvider[]): Promise<boolean> {
  if ((await redis(`set/${KEY}`, JSON.stringify(list))) === null) return false;
  // The public list (on Where to stay) and the admin screen both read this.
  revalidatePath("/hotels");
  revalidatePath("/admin/kosher-apartments");
  return true;
}

/** Add one, newest first. Returns false only when the store is unreachable. */
export async function addStoredApartment(provider: ApartmentProvider): Promise<boolean> {
  const list = await read();
  return write([provider, ...list.filter((item) => item.id !== provider.id)]);
}

/** Remove one by id. Only owner-added providers have a removable id. */
export async function removeStoredApartment(id: string): Promise<boolean> {
  const list = await read();
  return write(list.filter((item) => item.id !== id));
}
