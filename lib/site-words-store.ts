/**
 * Where the owner's words are kept.
 *
 * ITS OWN KEY, not a field on the big content bundle. The footer is on every
 * page on the site, and reading a bundle carrying three hundred locations to
 * get one paragraph out of it would be a real cost on every request. Same rule
 * as the border crossings and the planner figures: one key per concern.
 *
 * CACHED, and this is the part that matters. Hundreds of pages here are
 * prerendered — every tzadik, every beis hachaim, every city guide — and all of
 * them carry the footer. An uncached store read in the footer would turn the
 * whole site dynamic to make two sentences editable, which is a bad trade.
 * `unstable_cache` keeps the read out of the render path, and the save clears
 * the tag, so a change still lands rather than waiting for a deploy.
 *
 * With no Redis there is simply nothing stored and the site says what it ships
 * with, which is what it said before any of this existed.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { type SiteWords } from "@/data/site-words";
import { mergeWords, onlyChangedWords, type StoredWords } from "@/lib/site-words";

const KEY = "white-glove:site-words";
export const WORDS_TAG = "site-words";

export function wordsStoreAvailable() {
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

async function readStored(): Promise<StoredWords> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StoredWords;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * The words to put on the page.
 *
 * Never throws and never returns a blank: the built-in words are the floor, so
 * a store that is away costs the owner his edits and not the front page.
 */
const cached = unstable_cache(
  async (): Promise<SiteWords> => mergeWords(await readStored()),
  ["site-words"],
  // An hour is the backstop for a change made somewhere this process cannot
  // see. The ordinary path is the tag, cleared the moment he presses Save.
  { tags: [WORDS_TAG], revalidate: 3600 },
);

export async function readWords(): Promise<SiteWords> {
  if (!wordsStoreAvailable()) return mergeWords(null);
  return cached();
}

/** Uncached, for the admin screen — it must show what was just saved. */
export async function readWordsFresh(): Promise<SiteWords> {
  if (!wordsStoreAvailable()) return mergeWords(null);
  return mergeWords(await readStored());
}

/**
 * Both halves of "these words have changed", and BOTH ARE NEEDED.
 *
 * `updateTag` clears the stored answer. It is updateTag rather than
 * revalidateTag because revalidateTag serves the STALE copy on the next request
 * and refreshes behind it — so the owner would press Save, reload, and see the
 * old words, which is indistinguishable from the bug this whole screen exists
 * to fix.
 *
 * `revalidatePath("/", "layout")` throws away the RENDERED PAGES. Measured, not
 * assumed: with only the tag cleared, the front page picked up a new headline
 * and every prerendered page — /terms, /contact, every tzadik, every city guide
 * — kept serving the old footer, because a data-cache invalidation does not
 * re-render HTML that has already been built. These words are in the root
 * layout's footer, so a change to them really does make every page on the site
 * out of date, and this says so.
 */
function everythingIsStale() {
  updateTag(WORDS_TAG);
  revalidatePath("/", "layout");
}

export async function saveWords(next: SiteWords): Promise<{ ok: boolean; message: string }> {
  if (!wordsStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected. Ask for UPSTASH_REDIS_REST_URL and _TOKEN to be set." };
  }
  const changes = onlyChangedWords(next);
  if ((await redis(`set/${KEY}`, JSON.stringify(changes))) === null) {
    return { ok: false, message: "Could not save. Try again." };
  }
  everythingIsStale();
  const count = Object.keys(changes).length;
  return {
    ok: true,
    message: count === 0 ? "Back to the words the site ships with." : `Saved. ${count} ${count === 1 ? "line differs" : "lines differ"} from the built-in wording.`,
  };
}

/** Put every word back to what the site ships with. */
export async function resetWords(): Promise<boolean> {
  if (!wordsStoreAvailable()) return false;
  if ((await redis(`del/${KEY}`)) === null) return false;
  everythingIsStale();
  return true;
}
