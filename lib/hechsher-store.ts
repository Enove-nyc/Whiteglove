// What the owner has confirmed about each place's hechsher.
//
// Nothing is written here by the site itself. OpenStreetMap's `diet:kosher` tag
// says a place serves kosher food; it does not say who certifies it, and the
// two are not the same question. So the store holds only what a person has
// checked, and anything absent reads back as unverified.
//
// With no Redis there is simply nothing stored, every place reads unverified,
// and the badge says so. That is correct behaviour rather than a degradation —
// unverified is the truth until somebody confirms it.

import { UNVERIFIED, type HechsherStatus } from "@/data/hechsherim";

const KEY = "white-glove:hechsherim";

export function hechsherStoreAvailable() {
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

export type HechsherRecord = HechsherStatus & {
  /** What the place is called, so the admin list is readable without OSM. */
  placeName?: string;
  placeAddress?: string;
};

type Stored = Record<string, HechsherRecord>;

async function readAll(): Promise<Stored> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Stored;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * The hechsher for each of these places.
 *
 * Every id asked about comes back with something, so a caller never has to
 * decide what a missing entry means.
 */
export async function hechsherimFor(ids: string[]): Promise<Record<string, HechsherStatus>> {
  const out: Record<string, HechsherStatus> = {};
  for (const id of ids) out[id] = UNVERIFIED;
  if (!hechsherStoreAvailable() || !ids.length) return out;
  const all = await readAll();
  for (const id of ids) {
    const found = all[id];
    if (found) out[id] = found;
  }
  return out;
}

/** Everything confirmed so far, for the admin list. */
export async function listHechsherim(): Promise<Array<HechsherRecord & { placeId: string }>> {
  const all = await readAll();
  return Object.entries(all)
    .map(([placeId, record]) => ({ placeId, ...record }))
    .sort((a, b) => (a.placeName ?? "").localeCompare(b.placeName ?? ""));
}

/** Record what somebody actually checked. */
export async function saveHechsher(
  placeId: string,
  record: HechsherRecord,
): Promise<{ ok: boolean; message: string }> {
  if (!placeId.trim()) return { ok: false, message: "No place to save that against." };
  if (!hechsherStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected before hechsherim can be saved." };
  }
  if (record.state === "certified" && !record.hechsherId && !record.note?.trim()) {
    return { ok: false, message: "Say which hechsher it is, or pick “not on the list” and type the name." };
  }
  if (record.state !== "unverified" && !record.source?.trim()) {
    return { ok: false, message: "Write down how you know. A hechsher on this site always says where it came from." };
  }

  const all = await readAll();
  all[placeId] = { ...record, confirmedAt: new Date().toISOString() };
  const wrote = await redis(`set/${KEY}`, JSON.stringify(all));
  if (wrote === null) return { ok: false, message: "Could not save. Try again." };

  const name = record.placeName || "That place";
  return {
    ok: true,
    message:
      record.state === "certified"
        ? `Saved. ${name} now shows its hechsher.`
        : record.state === "none"
          ? `Saved. ${name} shows as having no hechsher.`
          : record.state === "reported"
            ? `Saved as reported. ${name} still reads unverified until you confirm it.`
            : "Set back to unverified.",
  };
}

/** Forget a confirmation, putting the place back to unverified. */
export async function clearHechsher(placeId: string): Promise<boolean> {
  if (!hechsherStoreAvailable()) return false;
  const all = await readAll();
  delete all[placeId];
  return (await redis(`set/${KEY}`, JSON.stringify(all))) !== null;
}
