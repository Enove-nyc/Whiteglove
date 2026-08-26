/**
 * The owner's own seasonal windows, over the ones the calendar works out.
 *
 * ONE KEY FOR THE LOT, like the case studies and the current updates: this is
 * three rows the owner touches a few times a year, not a table.
 *
 * THE CALENDAR IS THE DEFAULT AND THE STORE IS THE OVERRIDE. With nothing
 * saved, Pesach and Sukkos already have the right windows every year
 * (lib/seasonal-calendar.ts) and yeshiva week has none, because it is not a
 * date anybody can compute. Saving a window for a key replaces the derived one
 * entirely — including its dates, so an owner who wants the Pesach prompt up
 * for four months rather than ten weeks says so once.
 *
 * CACHED, because the destinations hub and the front page both carry it and
 * both are prerendered. The tag is cleared on save. Today is not cached with
 * it — which window is open is worked out at render from the server's date, so
 * a prompt does not outstay its window by an hour because nobody saved
 * anything. Same reasoning as lib/current-updates-store.ts, written out there.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import {
  SPOTLIGHT_KEYS,
  isSpotlightKey,
  windowProblem,
  type SeasonalWindow,
  type SpotlightKey,
} from "@/data/seasonal-spotlight";
import { derivedWindows } from "@/lib/seasonal-calendar";

const KEY = "white-glove:seasonal-windows";
export const SEASONAL_WINDOWS_TAG = "seasonal-windows";

export function seasonalStoreAvailable() {
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

/** Anything unreadable is dropped rather than shown half-formed. */
function clean(raw: unknown): SeasonalWindow[] {
  if (!Array.isArray(raw)) return [];
  const out: SeasonalWindow[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.key !== "string" || !isSpotlightKey(e.key)) continue;
    out.push({
      key: e.key,
      startsOn: asString(e.startsOn),
      endsOn: asString(e.endsOn),
      active: Boolean(e.active),
      featured: Boolean(e.featured),
      note: asString(e.note),
    });
  }
  return out;
}

async function readStored(): Promise<SeasonalWindow[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    return clean(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function writeStored(list: SeasonalWindow[]): Promise<boolean> {
  return (await redis(`set/${KEY}`, JSON.stringify(list))) !== null;
}

/**
 * The owner's windows over the calendar's, for a given day.
 *
 * `today` is a parameter rather than read here so the caller decides, and so
 * the whole thing can be tested a year forward without moving a clock.
 */
export function mergeWindows(stored: readonly SeasonalWindow[], today: string): SeasonalWindow[] {
  const byKey = new Map<SpotlightKey, SeasonalWindow>();
  for (const window of derivedWindows(today)) byKey.set(window.key, window);
  for (const window of stored) byKey.set(window.key, { ...window, derived: false });
  // A key with neither a stored window nor a calendar one — yeshiva week, and
  // only yeshiva week — still comes back, with no dates and switched off. It
  // shows nothing (isOpen is false without dates) and it gives the owner a row
  // to fill in, which he would not have if the only way onto the list were
  // already being on it.
  return SPOTLIGHT_KEYS.map(
    (key): SeasonalWindow =>
      byKey.get(key) ?? { key, startsOn: "", endsOn: "", active: false, featured: false, note: "" },
  );
}

const cachedStored = unstable_cache(readStored, ["seasonal-windows"], {
  tags: [SEASONAL_WINDOWS_TAG],
  revalidate: 3600,
});

/** What the public surfaces read: the calendar, with the owner's changes on top. */
export async function readSeasonalWindows(today: string): Promise<SeasonalWindow[]> {
  const stored = seasonalStoreAvailable() ? await cachedStored() : [];
  return mergeWindows(stored, today);
}

/** Uncached, for the owner's screen — it must show what was just saved. */
export async function readSeasonalWindowsFresh(today: string): Promise<SeasonalWindow[]> {
  const stored = seasonalStoreAvailable() ? await readStored() : [];
  return mergeWindows(stored, today);
}

function stale() {
  updateTag(SEASONAL_WINDOWS_TAG);
  revalidatePath("/admin/seasons");
  revalidatePath("/destinations");
  revalidatePath("/");
}

export async function saveSeasonalWindow(
  next: SeasonalWindow,
): Promise<{ ok: boolean; message: string }> {
  if (!seasonalStoreAvailable()) return { ok: false, message: "This needs the private store connected." };

  const problem = windowProblem(next);
  if (problem) return { ok: false, message: problem };

  const stored = await readStored();
  // Featured is exclusive: two prompts at once is nothing prompted, so setting
  // one clears the rest rather than leaving the page to choose between them.
  const rest = stored
    .filter((window) => window.key !== next.key)
    .map((window) => (next.featured ? { ...window, featured: false } : window));

  if (!(await writeStored([{ ...next, derived: false }, ...rest]))) {
    return { ok: false, message: "Could not save. Try again." };
  }
  stale();
  return {
    ok: true,
    message: next.active ? "Saved — it shows inside those dates." : "Saved. It will not show while it is switched off.",
  };
}

/** Hand a key back to the calendar. Yeshiva week has none, so it simply goes away. */
export async function resetSeasonalWindow(key: SpotlightKey): Promise<{ ok: boolean; message: string }> {
  if (!seasonalStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  const stored = await readStored();
  if (!stored.some((window) => window.key === key)) return { ok: true, message: "Already on the calendar's dates." };
  if (!(await writeStored(stored.filter((window) => window.key !== key)))) {
    return { ok: false, message: "Could not reset. Try again." };
  }
  stale();
  return { ok: true, message: "Back on the calendar's own dates." };
}
