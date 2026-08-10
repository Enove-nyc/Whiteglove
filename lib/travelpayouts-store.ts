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
import { AFFILIATE_CONFIG_TAG } from "@/lib/affiliate/config";
import { linkProblem, SLOTS, type TravelpayoutsLinks } from "@/lib/travelpayouts";
import { isPartnerKey, type PartnerChoices, TRAVEL_PARTNERS } from "@/lib/travel-partners";

const KEY = "white-glove:travelpayouts";

/**
 * What is stored: the pasted links, and which partner each search opens.
 *
 * THE SHAPE CHANGED and the old one still reads. Before the partner was a
 * choice, this key held the links alone — `{"flights":"https://tp.media/..."}`
 * — so a stored value with slot names at the top level is that older shape and
 * is read as links with no choices. Migrating on read costs three lines and
 * means nobody has to remember to run anything; getting it wrong would empty
 * the earnings settings on deploy.
 */
export type TravelpayoutsSettings = {
  links: TravelpayoutsLinks;
  partners: PartnerChoices;
};

export const NO_TRAVELPAYOUTS: TravelpayoutsSettings = { links: {}, partners: {} };

function readShape(raw: unknown): TravelpayoutsSettings {
  if (!raw || typeof raw !== "object") return NO_TRAVELPAYOUTS;
  const value = raw as Record<string, unknown>;

  const links: TravelpayoutsLinks = {};
  const partners: PartnerChoices = {};

  // The current shape.
  const storedLinks = (value.links && typeof value.links === "object" ? value.links : value) as Record<string, unknown>;
  for (const { slot } of SLOTS) {
    const link = storedLinks[slot];
    if (typeof link === "string" && link.trim()) links[slot] = link.trim();
  }

  const storedPartners = (value.partners && typeof value.partners === "object" ? value.partners : {}) as Record<string, unknown>;
  for (const { slot } of SLOTS) {
    const key = storedPartners[slot];
    // Only a key that really serves this slot — a stale one falls through to
    // the default rather than pinning a search to a partner that cannot serve it.
    if (isPartnerKey(key) && TRAVEL_PARTNERS.some((p) => p.slot === slot && p.key === key)) partners[slot] = key;
  }

  return { links, partners };
}
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

async function readStored(): Promise<TravelpayoutsSettings> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return NO_TRAVELPAYOUTS;
  try {
    return readShape(JSON.parse(raw));
  } catch {
    return NO_TRAVELPAYOUTS;
  }
}

const cached = unstable_cache(readStored, ["travelpayouts-links"], { tags: [TRAVELPAYOUTS_TAG], revalidate: 3600 });

/** The links and partner choices for this visitor's searches. Never throws. */
export async function readTravelpayouts(): Promise<TravelpayoutsSettings> {
  if (!travelpayoutsStoreAvailable()) return NO_TRAVELPAYOUTS;
  return cached();
}

/** Uncached, for the admin screen — it must show what was just saved. */
export async function readTravelpayoutsFresh(): Promise<TravelpayoutsSettings> {
  if (!travelpayoutsStoreAvailable()) return NO_TRAVELPAYOUTS;
  return readStored();
}

export async function saveTravelpayouts(next: TravelpayoutsSettings): Promise<{ ok: boolean; message: string }> {
  if (!travelpayoutsStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected. Ask for UPSTASH_REDIS_REST_URL and _TOKEN to be set." };
  }

  // Refuse the whole save rather than storing a link that cannot earn. A link
  // for the wrong partner is the one mistake with no symptom — the search still
  // opens, and the money just never arrives.
  // Checked against the partner being saved alongside it, not the stored one:
  // changing partner and pasting that partner's link is one action, and
  // validating against the old choice would refuse the correct pair.
  for (const { slot, label } of SLOTS) {
    const problem = linkProblem(next.links[slot] ?? "", slot, next.partners);
    if (problem) return { ok: false, message: `${label}: ${problem}` };
  }

  const keep = readShape(next);

  if ((await redis(`set/${KEY}`, JSON.stringify(keep))) === null) {
    return { ok: false, message: "The private store could not be reached. Nothing was changed — try again." };
  }
  updateTag(TRAVELPAYOUTS_TAG);
  // /book is the only page that reads these, but it is prerendered along with
  // everything else, so the rendered copy has to go too.
  revalidatePath("/book");
  // Every booking link on the site resolves through lib/affiliate/config.ts.
  updateTag(AFFILIATE_CONFIG_TAG);
  revalidatePath("/", "layout");

  // The links, not the partner choices — a chosen partner with no link pasted
  // against it is a search that still earns nothing, and counting it would
  // report money that is not coming.
  const count = Object.keys(keep.links).length;
  return {
    ok: true,
    message:
      count === 0
        ? "Saved. All three searches now open the partner directly and earn nothing."
        : `Saved. ${count} of the ${SLOTS.length} searches ${count === 1 ? "goes" : "go"} through Travelpayouts.`,
  };
}
