// Where deleted records wait to be put back.
//
// In the private store rather than the database, deliberately: the point of
// this is to survive a mistake made IN the database, and a bin that lives in
// the same tables it protects goes with them. It also needs no migration, so
// it works the moment it is deployed rather than after the next import.
//
// With no Redis nothing is kept and nothing is offered. Deleting still works —
// it always did — and the screen says plainly that there is no bin, rather
// than showing an empty one that looks like "nothing has been deleted".

import { type Deleted, type RecycleKind, expired, stillKept } from "@/lib/recycle";

const KEY = "white-glove:recycle-bin";

export function recycleStoreAvailable() {
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

async function readAll(): Promise<Deleted[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Deleted[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: Deleted[]): Promise<boolean> {
  return (await redis(`set/${KEY}`, JSON.stringify(rows))) !== null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Keep a copy of something about to be deleted.
 *
 * NEVER THROWS AND NEVER BLOCKS THE DELETE. The owner pressed remove; if the
 * bin cannot record it, the right outcome is that the thing is still deleted
 * and the bin is one entry short — not an error on a screen where they were
 * trying to tidy up.
 *
 * The entry's own id carries the row id and the moment, so the same row
 * deleted twice (restored, deleted again) does not collide.
 */
export async function remember(entry: Omit<Deleted, "id" | "deletedAt">): Promise<void> {
  if (!recycleStoreAvailable()) return;
  try {
    const deletedAt = new Date().toISOString();
    const rows = await readAll();
    const next = [{ ...entry, id: `${entry.kind}:${entry.rowId}:${deletedAt}`, deletedAt }, ...rows];
    // Trimmed on the way in as well as on the way out, so the stored value
    // cannot grow without bound between two readings of the screen.
    await writeAll(stillKept(next, today()));
  } catch (error) {
    console.error("[recycle] could not record a deletion", error);
  }
}

/** What is still in the bin, newest first. */
export async function listDeleted(): Promise<Deleted[]> {
  if (!recycleStoreAvailable()) return [];
  const rows = await readAll();
  const kept = stillKept(rows, today());
  // Aged-out entries are dropped as soon as anybody looks, so the store is
  // tidied by use rather than needing anything scheduled.
  if (expired(rows, today()).length) await writeAll(kept);
  return kept;
}

/** One entry, taken out of the bin. Null when it is not there any more. */
export async function takeFromBin(id: string): Promise<Deleted | null> {
  if (!recycleStoreAvailable()) return null;
  const rows = await readAll();
  const found = rows.find((row) => row.id === id);
  if (!found) return null;
  await writeAll(rows.filter((row) => row.id !== id));
  return found;
}

/** Throw one away for good, without restoring it. */
export async function forgetDeleted(id: string): Promise<boolean> {
  if (!recycleStoreAvailable()) return false;
  const rows = await readAll();
  if (!rows.some((row) => row.id === id)) return true;
  return writeAll(rows.filter((row) => row.id !== id));
}

/** Only the kinds this person is allowed to see. */
export function onlyKinds(rows: Deleted[], allowed: RecycleKind[] | null): Deleted[] {
  return allowed ? rows.filter((row) => allowed.includes(row.kind)) : rows;
}
