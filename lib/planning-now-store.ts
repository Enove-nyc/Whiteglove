/**
 * Where the "Planning now" chips live.
 *
 * One key for the lot, the same shape as the dated notices and the case
 * studies: a short list the owner curates by hand, not a table that grows with
 * traffic. Reading it whole is cheaper than the round trips a per-item layout
 * would cost on the homepage.
 *
 * CACHED FOR THE PUBLIC READ, because the homepage carries it and an uncached
 * read would make the busiest page on the site dynamic for a row that changes
 * a few times a year. The tag is cleared on save, so a change lands without
 * waiting for a deploy.
 *
 * TODAY IS NOT CACHED WITH IT. The cache holds the LIST; which chips are in
 * season is worked out at render from the server's date, so a chip cannot
 * outstay its window by an hour just because nobody saved anything. The
 * revalidate window is a backstop for the list, never for the dates — see
 * planningNow in data/planning-now.ts.
 */

import { randomBytes } from "crypto";
import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import {
  chipProblem,
  isChipIcon,
  sortForAdmin,
  type PlanningChip,
  type PlanningChipDraft,
} from "@/data/planning-now";

const KEY = "white-glove:planning-now";
export const PLANNING_NOW_TAG = "planning-now";

/** A hand-curated row. More than this is a menu, not a hint about the season. */
const MAX_STORED = 24;

export function planningNowStoreAvailable() {
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

/** Anything unreadable is dropped rather than rendered half-formed. */
function clean(raw: unknown): PlanningChip[] {
  if (!Array.isArray(raw)) return [];
  const out: PlanningChip[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    if (typeof c.id !== "string" || typeof c.label !== "string" || typeof c.href !== "string") continue;
    if (typeof c.startsOn !== "string" || typeof c.endsOn !== "string") continue;
    out.push({
      id: c.id,
      label: c.label,
      href: c.href,
      startsOn: c.startsOn,
      endsOn: c.endsOn,
      priority: typeof c.priority === "number" && Number.isFinite(c.priority) ? c.priority : 0,
      enabled: c.enabled !== false,
      ...(isChipIcon(c.icon) ? { icon: c.icon } : {}),
      updatedAt: typeof c.updatedAt === "string" ? c.updatedAt : "",
    });
  }
  return out;
}

async function readStored(): Promise<PlanningChip[]> {
  const raw = await redis<string>(`get/${encodeURIComponent(KEY)}`);
  if (!raw) return [];
  try {
    return clean(JSON.parse(raw));
  } catch {
    return [];
  }
}

const cachedStored = unstable_cache(readStored, ["planning-now"], { tags: [PLANNING_NOW_TAG], revalidate: 3600 });

/** The public read — cached, because the homepage carries it. */
export async function readPlanningChips(): Promise<PlanningChip[]> {
  return cachedStored();
}

/** The owner's read — never cached, so a save is visible the moment it lands. */
export async function readPlanningChipsFresh(today: string): Promise<PlanningChip[]> {
  return sortForAdmin(await readStored(), today);
}

function stale() {
  updateTag(PLANNING_NOW_TAG);
  revalidatePath("/admin/seasons");
  revalidatePath("/");
}

async function write(chips: PlanningChip[]): Promise<boolean> {
  return (await redis(`set/${encodeURIComponent(KEY)}`, JSON.stringify(chips.slice(0, MAX_STORED)))) !== null;
}

export async function savePlanningChip(
  draft: PlanningChipDraft & { id?: string },
): Promise<{ ok: boolean; message: string }> {
  if (!planningNowStoreAvailable()) return { ok: false, message: "Connect the private database first." };
  const problem = chipProblem(draft);
  if (problem) return { ok: false, message: problem };
  const chips = await readStored();
  const now = new Date().toISOString();
  const chip: PlanningChip = {
    id: draft.id || randomBytes(6).toString("base64url"),
    label: draft.label.trim(),
    href: draft.href.trim(),
    startsOn: draft.startsOn,
    endsOn: draft.endsOn,
    priority: draft.priority,
    enabled: draft.enabled,
    ...(draft.icon ? { icon: draft.icon } : {}),
    updatedAt: now,
  };
  const next = chips.some((c) => c.id === chip.id)
    ? chips.map((c) => (c.id === chip.id ? chip : c))
    : [...chips, chip];
  if (next.length > MAX_STORED) return { ok: false, message: `Keep it to ${MAX_STORED} — this is a row, not a menu.` };
  if (!(await write(next))) return { ok: false, message: "Could not save that just now." };
  stale();
  return { ok: true, message: `Saved “${chip.label}”.` };
}

export async function deletePlanningChip(id: string): Promise<{ ok: boolean; message: string }> {
  if (!planningNowStoreAvailable()) return { ok: false, message: "Connect the private database first." };
  const chips = await readStored();
  if (!chips.some((c) => c.id === id)) return { ok: false, message: "That one is already gone." };
  if (!(await write(chips.filter((c) => c.id !== id)))) return { ok: false, message: "Could not remove that just now." };
  stale();
  return { ok: true, message: "Removed." };
}
