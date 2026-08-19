/**
 * Heritage cemeteries the owner adds from the admin.
 *
 * The built-in set in data/heritage-cemeteries.ts is the Nesiya Tova locator —
 * generated, not hand-edited. This is the parallel store for the ones the owner
 * adds himself, kept in the same private Upstash store as the added eruvin and
 * shuls. It fails open: with no store connected the locator is exactly the
 * built-in set, so a disconnected store is a locator with fewer entries, never
 * a broken one.
 *
 * Same shape as a built-in entry plus an `added` flag, so the map, the locator
 * on /cemeteries and each entry's own page read one merged list.
 */

import { revalidatePath, unstable_cache } from "next/cache";
import type { HeritageCemeteryListing } from "@/lib/heritage-cemeteries";

const KEY = "white-glove:heritage-cemeteries-added";
const TAG = "heritage-cemeteries-added";

export function heritageStoreAvailable(): boolean {
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
async function read(): Promise<HeritageCemeteryListing[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as HeritageCemeteryListing[]) : [];
  } catch {
    return [];
  }
}

const cached = unstable_cache(read, ["heritage-cemeteries-added"], { tags: [TAG], revalidate: 3600 });

/** The owner-added heritage cemeteries, cached until one is saved. */
export function getStoredHeritageCemeteries(): Promise<HeritageCemeteryListing[]> {
  return cached();
}

async function write(list: HeritageCemeteryListing[]): Promise<boolean> {
  if ((await redis(`set/${KEY}`, JSON.stringify(list))) === null) return false;
  // The locator on /cemeteries, the map, each entry's page and the admin screen.
  revalidatePath("/cemeteries");
  revalidatePath("/map");
  revalidatePath("/admin/heritage-cemeteries");
  return true;
}

/** Add one, newest first. Returns false only when the store is unreachable. */
export async function addStoredHeritageCemetery(entry: HeritageCemeteryListing): Promise<boolean> {
  const list = await read();
  const next = [entry, ...list.filter((item) => item.slug !== entry.slug)];
  if (!(await write(next))) return false;
  revalidatePath(`/cemeteries/heritage/${entry.slug}`);
  return true;
}

/** Remove one by slug. Only owner-added entries are in this store. */
export async function removeStoredHeritageCemetery(slug: string): Promise<boolean> {
  const list = await read();
  if (!(await write(list.filter((item) => item.slug !== slug)))) return false;
  revalidatePath(`/cemeteries/heritage/${slug}`);
  return true;
}
