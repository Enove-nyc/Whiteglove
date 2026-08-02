/**
 * Where the "this is new" notice's words live.
 *
 * Its own key rather than a field on SiteSettings, so switching the notice off
 * — the thing the owner will eventually want to do in a hurry — cannot go
 * wrong alongside a save of the hero title. It is also the one setting whose
 * absence has a sensible answer: with no store at all the notice still shows,
 * with the wording in lib/beta-notice.ts, because a site that is new is new
 * whether or not Redis is connected.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { type BetaNotice, DEFAULT_NOTICE, noticeFrom } from "@/lib/beta-notice";

const KEY = "white-glove:beta-notice";
const TAG = "beta-notice";

export function betaStoreAvailable() {
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

/**
 * The notice as it should be shown.
 *
 * Never throws and never returns nothing: an unreachable store, an unparseable
 * value and an empty one all give the default, because the alternative is a
 * launch where the warning quietly stopped appearing and nobody noticed.
 */
async function read(): Promise<BetaNotice> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return DEFAULT_NOTICE;
  try {
    return noticeFrom(JSON.parse(raw) as Partial<BetaNotice>);
  } catch {
    return DEFAULT_NOTICE;
  }
}

/**
 * CACHED, and it has to be. This is read in the root layout, so it is on every
 * page on the site — including the hundreds that are prerendered.
 *
 * An uncached read here was a landmine, found by running it: a `no-store` fetch
 * inside a page Next is regenerating fails with "page changed from static to
 * dynamic at runtime", and the page 500s. That never showed up because nothing
 * had ever triggered a regeneration; the moment anything did — a revalidate
 * firing, or the site-words save — every prerendered page on the site went to
 * a 500. Caching it takes the fetch out of the render, and saving the notice
 * clears the cache.
 */
const cached = unstable_cache(read, ["beta-notice"], { tags: [TAG], revalidate: 3600 });

export async function getBetaNotice(): Promise<BetaNotice> {
  if (!betaStoreAvailable()) return DEFAULT_NOTICE;
  return cached();
}

/** Uncached, for the admin screen — it must show what was just saved. */
export async function getBetaNoticeFresh(): Promise<BetaNotice> {
  if (!betaStoreAvailable()) return DEFAULT_NOTICE;
  return read();
}

export async function saveBetaNotice(notice: BetaNotice): Promise<boolean> {
  if (!betaStoreAvailable()) return false;
  if ((await redis(`set/${KEY}`, JSON.stringify(notice))) === null) return false;
  // The notice is in the root layout, so a change to it makes every page stale.
  updateTag(TAG);
  revalidatePath("/", "layout");
  return true;
}
