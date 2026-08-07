/**
 * Where the three Travelpayouts links are kept.
 *
 * NOT ENVIRONMENT VARIABLES, and that is the point. A redirect link is a long
 * address carrying an account number, a project number and a programme number,
 * it is different for every partner, and it changes when a programme is added
 * or dropped. Putting it in the environment means a redeploy to change where
 * the money goes, and a support message every time. The owner pastes it on a
 * screen, presses Save, and the next search goes through it.
 *
 * ITS OWN KEY, like the border crossings and the planner figures. /book reads
 * this on every visit and nothing else needs it.
 *
 * CACHED, because /book is on the fast path and this changes about once a year.
 * The save clears the tag, so a change still lands immediately.
 *
 * With no Redis there is nothing stored, the searches open the partner directly
 * and earn nothing — which is exactly where the site was before any of this.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { linkProblem, SLOTS, type TravelpayoutsLinks } from "@/lib/travelpayouts";

const KEY = "white-glove:travelpayouts";
export const TRAVELPAYOUTS_TAG = "travelpayouts";

export function travelpayoutsStoreAvailable() {
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

async function readStored(): Promise<TravelpayoutsLinks> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as TravelpayoutsLinks;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const cached = unstable_cache(readStored, ["travelpayouts-links"], { tags: [TRAVELPAYOUTS_TAG], revalidate: 3600 });

/** The links to route this visitor's searches through. Never throws. */
export async function readTravelpayoutsLinks(): Promise<TravelpayoutsLinks> {
  if (!travelpayoutsStoreAvailable()) return {};
  return cached();
}

/** Uncached, for the admin screen — it must show what was just saved. */
export async function readTravelpayoutsLinksFresh(): Promise<TravelpayoutsLinks> {
  if (!travelpayoutsStoreAvailable()) return {};
  return readStored();
}

export async function saveTravelpayoutsLinks(next: TravelpayoutsLinks): Promise<{ ok: boolean; message: string }> {
  if (!travelpayoutsStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected. Ask for UPSTASH_REDIS_REST_URL and _TOKEN to be set." };
  }

  // Refuse the whole save rather than storing a link that cannot earn. A link
  // for the wrong partner is the one mistake with no symptom — the search still
  // opens, and the money just never arrives.
  for (const { slot, label } of SLOTS) {
    const problem = linkProblem(next[slot] ?? "", slot);
    if (problem) return { ok: false, message: `${label}: ${problem}` };
  }

  const keep: TravelpayoutsLinks = {};
  for (const { slot } of SLOTS) {
    const value = next[slot]?.trim();
    if (value) keep[slot] = value;
  }

  if ((await redis(`set/${KEY}`, JSON.stringify(keep))) === null) {
    return { ok: false, message: "The private store could not be reached. Nothing was changed — try again." };
  }
  updateTag(TRAVELPAYOUTS_TAG);
  // /book is the only page that reads these, but it is prerendered along with
  // everything else, so the rendered copy has to go too.
  revalidatePath("/book");

  const count = Object.keys(keep).length;
  return {
    ok: true,
    message:
      count === 0
        ? "Saved. All three searches now open the partner directly and earn nothing."
        : `Saved. ${count} of the ${SLOTS.length} searches ${count === 1 ? "goes" : "go"} through Travelpayouts.`,
  };
}
