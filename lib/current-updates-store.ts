/**
 * Where the dated notices live.
 *
 * One key for the lot, the same shape as the case studies and the site words:
 * this is a short list the owner curates by hand, not a table that grows with
 * traffic, and reading it whole is cheaper than the round trips a per-item
 * layout would cost on a page that also renders a destination.
 *
 * CACHED FOR THE PUBLIC READ, because a destination page is prerendered and
 * carries this. An uncached read here would turn hundreds of guide pages
 * dynamic to show a notice that changes a few times a month. The tag is
 * cleared on save, so a change still lands rather than waiting for a deploy.
 *
 * TODAY IS NOT CACHED WITH IT. The cache holds the LIST; which of them is
 * current is worked out at render from the server's date, so an update does
 * not sit on a page for an hour after it lapses just because nobody saved
 * anything. The revalidate window is a backstop for the list, not for the
 * dates — see currentUpdatesFor in data/current-updates.ts.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import {
  sortForAdmin,
  updateProblem,
  type CurrentUpdate,
  type CurrentUpdateDraft,
  type UpdateKind,
} from "@/data/current-updates";

const KEY = "white-glove:current-updates";
export const CURRENT_UPDATES_TAG = "current-updates";

export function currentUpdatesStoreAvailable() {
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

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const KINDS: UpdateKind[] = ["new", "moved", "closed", "temporary-minyan", "seasonal", "travel", "other"];

/** Anything unreadable is dropped rather than rendered half-formed. */
function clean(raw: unknown): CurrentUpdate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): CurrentUpdate | null => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      if (typeof e.id !== "string" || !e.id) return null;
      const kind = KINDS.includes(e.kind as UpdateKind) ? (e.kind as UpdateKind) : "other";
      return {
        id: e.id,
        kind,
        title: asString(e.title),
        detail: asString(e.detail),
        destinationSlug: asString(e.destinationSlug),
        startsOn: asString(e.startsOn),
        endsOn: asString(e.endsOn),
        source: asString(e.source),
        published: Boolean(e.published),
        createdAt: asString(e.createdAt) || new Date(0).toISOString(),
        updatedAt: asString(e.updatedAt) || new Date(0).toISOString(),
      };
    })
    .filter((entry): entry is CurrentUpdate => entry !== null);
}

async function readAll(): Promise<CurrentUpdate[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    return clean(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function writeAll(list: CurrentUpdate[]): Promise<boolean> {
  return (await redis(`set/${KEY}`, JSON.stringify(list))) !== null;
}

const cachedPublished = unstable_cache(
  async (): Promise<CurrentUpdate[]> => (await readAll()).filter((u) => u.published),
  ["current-updates-published"],
  { tags: [CURRENT_UPDATES_TAG], revalidate: 3600 },
);

/**
 * Every PUBLISHED update, whether or not it is current today.
 *
 * The date filtering is the caller's, on purpose — see the note at the top.
 */
export async function readPublishedUpdates(): Promise<CurrentUpdate[]> {
  if (!currentUpdatesStoreAvailable()) return [];
  return cachedPublished();
}

/** Uncached, for the owner's screen — it must show what was just saved. */
export async function readUpdatesFresh(today: string): Promise<CurrentUpdate[]> {
  if (!currentUpdatesStoreAvailable()) return [];
  return sortForAdmin(await readAll(), today);
}

function stale(slug: string) {
  updateTag(CURRENT_UPDATES_TAG);
  revalidatePath("/admin/updates");
  // Only the destination this belongs to — rebuilding every guide page for one
  // notice about Rome would be a poor trade on a site with hundreds of them.
  if (slug) revalidatePath(`/destinations/${slug}`);
}

function newId() {
  return `cu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function upsertUpdate(draft: CurrentUpdateDraft): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!currentUpdatesStoreAvailable()) return { ok: false, message: "This needs the private store connected." };

  const list = await readAll();
  const now = new Date().toISOString();
  const existing = draft.id ? list.find((u) => u.id === draft.id) : undefined;

  const next: CurrentUpdate = {
    id: existing?.id ?? draft.id ?? newId(),
    kind: draft.kind,
    title: draft.title.trim(),
    detail: draft.detail.trim(),
    destinationSlug: draft.destinationSlug.trim().toLowerCase(),
    startsOn: draft.startsOn.trim(),
    endsOn: draft.endsOn.trim(),
    source: draft.source.trim(),
    published: Boolean(draft.published),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  // Publishing is gated on the same rules the editor shows, so a half-written
  // notice cannot reach a destination page through a stale form or a retry.
  if (next.published) {
    const problem = updateProblem(next);
    if (problem) return { ok: false, message: problem };
    if (!next.destinationSlug) {
      return { ok: false, message: "Attach it to a destination — an update with no place shows nowhere." };
    }
  }

  const without = list.filter((u) => u.id !== next.id);
  if (!(await writeAll([next, ...without]))) return { ok: false, message: "Could not save. Try again." };
  stale(next.destinationSlug);
  if (existing?.destinationSlug && existing.destinationSlug !== next.destinationSlug) {
    // Moved to another destination: the old page has to lose it too.
    stale(existing.destinationSlug);
  }
  return {
    ok: true,
    id: next.id,
    message: next.published ? "Published — it shows until it lapses." : "Saved. Nothing public until you publish it.",
  };
}

export async function setUpdatePublished(id: string, published: boolean): Promise<{ ok: boolean; message: string }> {
  if (!currentUpdatesStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  const list = await readAll();
  const existing = list.find((u) => u.id === id);
  if (!existing) return { ok: false, message: "That update was not found." };

  if (published) {
    const problem = updateProblem(existing);
    if (problem) return { ok: false, message: problem };
    if (!existing.destinationSlug) {
      return { ok: false, message: "Attach it to a destination first." };
    }
  }

  const next = { ...existing, published, updatedAt: new Date().toISOString() };
  if (!(await writeAll(list.map((u) => (u.id === id ? next : u))))) {
    return { ok: false, message: "Could not update. Try again." };
  }
  stale(next.destinationSlug);
  return { ok: true, message: published ? "Published." : "Taken down." };
}

export async function deleteUpdate(id: string): Promise<{ ok: boolean; message: string }> {
  if (!currentUpdatesStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  const list = await readAll();
  const existing = list.find((u) => u.id === id);
  if (!existing) return { ok: false, message: "That update was not found." };
  if (!(await writeAll(list.filter((u) => u.id !== id)))) {
    return { ok: false, message: "Could not delete. Try again." };
  }
  stale(existing.destinationSlug);
  return { ok: true, message: "Deleted." };
}
