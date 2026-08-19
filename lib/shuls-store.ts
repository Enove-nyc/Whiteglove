/**
 * Shuls the owner adds from the admin.
 *
 * The public shul directory is assembled from the seeded minyanim, the
 * database rows and the notable-shuls flat file (see lib/shuls.ts). This is the
 * parallel store for the ones the owner adds by hand, kept in the same private
 * Upstash store as the site notice, the added eruvin and the rest of the
 * owner-editable settings. It fails open: with no store connected the directory
 * is exactly what it was before an editor existed. A disconnected store is a
 * directory with fewer shuls, never a broken one.
 *
 * WHY NOT A PRISMA ROW. The database path already exists for shuls, but it
 * hangs a minyan off a destination — you add it under a town in the editor.
 * These are the ones that belong to no town on the site, added on their own,
 * so a small JSON value under one key is the honest size of it and needs no
 * migration.
 */

import { revalidatePath, unstable_cache } from "next/cache";
import type { ShulListing } from "@/lib/shuls";

const KEY = "white-glove:shuls-added";
const TAG = "shuls-added";

export function shulsStoreAvailable(): boolean {
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
async function read(): Promise<ShulListing[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as ShulListing[]) : [];
  } catch {
    return [];
  }
}

const cached = unstable_cache(read, ["shuls-added"], { tags: [TAG], revalidate: 3600 });

/** The owner-added shuls, cached until one is saved. */
export function getStoredShuls(): Promise<ShulListing[]> {
  return cached();
}

async function write(list: ShulListing[]): Promise<boolean> {
  if ((await redis(`set/${KEY}`, JSON.stringify(list))) === null) return false;
  // The public directory, the map and the admin screen all read this.
  revalidatePath("/shuls");
  revalidatePath("/map");
  revalidatePath("/admin/shuls");
  return true;
}

/** Add one, newest first. Returns false only when the store is unreachable. */
export async function addStoredShul(shul: ShulListing): Promise<boolean> {
  const list = await read();
  return write([shul, ...list.filter((item) => item.id !== shul.id)]);
}

/** Remove one by id. Only owner-added shuls have a removable id. */
export async function removeStoredShul(id: string): Promise<boolean> {
  const list = await read();
  return write(list.filter((item) => item.id !== id));
}
