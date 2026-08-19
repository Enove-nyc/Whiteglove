/**
 * Eruvin the owner adds from the admin.
 *
 * The built-in list in data/notable-eruvin.ts is a curated flat file; this is
 * the parallel store for the ones the owner adds himself, kept in the same
 * private Upstash store as the site notice and the rest of the owner-editable
 * settings. It fails open: with no store connected, the public page simply
 * shows the built-in list, exactly as it did before an editor existed. So a
 * disconnected store is a site with fewer eruvin, never a broken one.
 *
 * WHY NOT A PRISMA TABLE. An eruv listing is five short strings and a link —
 * no relations, no query beyond "list them all". A JSON value under one key is
 * the honest size of it, and it needs no migration to ship.
 */

import { revalidatePath, unstable_cache } from "next/cache";
import type { EruvListing } from "@/lib/eruvin";

const KEY = "white-glove:eruvin-added";
const TAG = "eruvin-added";

export function eruvinStoreAvailable(): boolean {
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
async function read(): Promise<EruvListing[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as EruvListing[]) : [];
  } catch {
    return [];
  }
}

const cached = unstable_cache(read, ["eruvin-added"], { tags: [TAG], revalidate: 3600 });

/** The owner-added eruvin, cached until one is saved. */
export function getStoredEruvin(): Promise<EruvListing[]> {
  return cached();
}

async function write(list: EruvListing[]): Promise<boolean> {
  if ((await redis(`set/${KEY}`, JSON.stringify(list))) === null) return false;
  // The public list and the admin screen both read this.
  revalidatePath("/eruvin");
  revalidatePath("/admin/eruvin");
  return true;
}

/** Add one, newest first. Returns false only when the store is unreachable. */
export async function addStoredEruv(eruv: EruvListing): Promise<boolean> {
  const list = await read();
  return write([eruv, ...list.filter((item) => item.id !== eruv.id)]);
}

/** Remove one by id. Only owner-added eruvin have a removable id. */
export async function removeStoredEruv(id: string): Promise<boolean> {
  const list = await read();
  return write(list.filter((item) => item.id !== id));
}
