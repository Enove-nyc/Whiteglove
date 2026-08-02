/**
 * Where the owner's planning figures are kept.
 *
 * With no Redis there is simply nothing stored and every trip on the site is
 * planned with the built-in figures — which is exactly what it did before this
 * existed. That is correct rather than degraded: the built-in set is a complete,
 * working set of numbers, not a placeholder.
 *
 * Only what he CHANGED is written. The built-in figures stay in the file, so a
 * later correction to one of them reaches every trip that never overrode it,
 * instead of being shadowed by a copy nobody remembers making.
 */

import { type PlannerAssumptions } from "@/data/planner-assumptions";
import { mergeAssumptions, onlyChanges, type StoredAssumptions } from "@/lib/planner-settings";

const KEY = "white-glove:planner-assumptions";

export function plannerStoreAvailable() {
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

async function readStored(): Promise<StoredAssumptions> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StoredAssumptions;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * The figures the planner should use.
 *
 * Never throws and never returns a partial set — the built-in figures are the
 * floor, so a store that is away costs the owner his adjustments and not the
 * planner.
 */
export async function readAssumptions(): Promise<PlannerAssumptions> {
  if (!plannerStoreAvailable()) return mergeAssumptions(null);
  return mergeAssumptions(await readStored());
}

export async function saveAssumptions(next: PlannerAssumptions): Promise<{ ok: boolean; message: string }> {
  if (!plannerStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected. Ask for UPSTASH_REDIS_REST_URL and _TOKEN to be set." };
  }
  const changes = onlyChanges(next);
  const written = await redis(`set/${KEY}`, JSON.stringify(changes));
  if (written === null) return { ok: false, message: "Could not save. Try again." };
  const count = Object.keys(changes).length;
  return {
    ok: true,
    message: count === 0 ? "Back to the figures the site ships with." : `Saved. ${count} figure${count === 1 ? "" : "s"} differ${count === 1 ? "s" : ""} from the built-in set.`,
  };
}

/** Put every figure back to what the site ships with. */
export async function resetAssumptions(): Promise<boolean> {
  if (!plannerStoreAvailable()) return false;
  return (await redis(`del/${KEY}`)) !== null;
}
