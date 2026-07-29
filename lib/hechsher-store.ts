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

// ---- The list of agencies itself ---------------------------------------
//
// The site ships with a list of hechsherim, but no list of certifying bodies
// is ever finished — a town has its own vaad, a rov gives his own hechsher,
// and neither is in anybody's table. So the owner can add one, and can attach
// a picture of the mark to any agency, built-in or added.
//
// The picture is held as a data URI rather than written to a file. The site
// runs on a filesystem that is discarded on every deploy, so a written file
// would not survive the next one; a few kilobytes in the store does.

const AGENCY_KEY = "white-glove:hechsher-agencies";

/** An agency the owner added, or fields overlaid on one that ships with the site. */
export type StoredAgency = {
  id: string;
  name?: string;
  mark?: string;
  region?: string;
  aliases?: string[];
  /** data:image/… — see assertUsableLogo for what is allowed through. */
  logo?: string;
};

/**
 * How big an uploaded mark may be.
 *
 * These are circles about thirty pixels across. Anything approaching this
 * limit is a photograph somebody has not resized, and the editor shrinks the
 * picture in the browser before it ever gets here.
 */
const MAX_LOGO_BYTES = 64 * 1024;

/**
 * Is this something we are willing to put in an <img> on the site?
 *
 * Raster only, and deliberately so. An SVG is a document that can carry script
 * and external references; it is the one image format where "just show the
 * file somebody uploaded" is a decision with consequences. The editor produces
 * a PNG from a canvas, so refusing SVG costs the owner nothing.
 */
export function assertUsableLogo(logo: string): { ok: true } | { ok: false; message: string } {
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(logo.trim());
  if (!match) {
    return /^data:image\/svg/i.test(logo.trim())
      ? { ok: false, message: "SVG marks are not accepted — save it as a PNG and upload that." }
      : { ok: false, message: "That does not look like a PNG, JPEG or WebP picture." };
  }
  // base64 encodes 3 bytes as 4 characters.
  if (Math.floor((match[2].length * 3) / 4) > MAX_LOGO_BYTES) {
    return { ok: false, message: "That picture is too big. A mark only needs to be a couple of hundred pixels across." };
  }
  return { ok: true };
}

async function readAgencies(): Promise<Record<string, StoredAgency>> {
  const raw = await redis<string>(`get/${AGENCY_KEY}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, StoredAgency>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAgencies(all: Record<string, StoredAgency>): Promise<boolean> {
  const body = JSON.stringify(all);
  const res = await redis<string>(`set/${AGENCY_KEY}`, body);
  return res !== null;
}

/** Everything the owner has added or changed. Empty without a store, which reads as "only the built-in list". */
export async function listAgencies(): Promise<StoredAgency[]> {
  return Object.values(await readAgencies());
}

/** An id from a name: "Vaad of Golders Green" → "vaad-of-golders-green". */
export function agencyIdFrom(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function saveAgency(agency: StoredAgency): Promise<{ ok: boolean; message: string }> {
  if (!hechsherStoreAvailable()) return { ok: false, message: "Connect the private store first (UPSTASH_REDIS_REST_URL and _TOKEN)." };
  const id = agency.id.trim();
  if (!id) return { ok: false, message: "That needs a name." };
  if (agency.logo) {
    const check = assertUsableLogo(agency.logo);
    if (!check.ok) return { ok: false, message: check.message };
  }
  const all = await readAgencies();
  // Keep the logo already stored when this save is only changing the wording.
  const existing = all[id];
  all[id] = { ...existing, ...agency, id, logo: agency.logo ?? existing?.logo };
  const ok = await writeAgencies(all);
  return ok
    ? { ok: true, message: `Saved ${agency.name ?? id}.` }
    : { ok: false, message: "Could not save it. Is the private store connected?" };
}

/**
 * Forget an agency the owner added, or the changes overlaid on a built-in one.
 *
 * A place already marked with it keeps its record — the circle falls back to
 * the letters typed in its note. Deleting the agency is not a statement about
 * the kashrus of anywhere, and it must not quietly become one.
 */
export async function deleteAgency(id: string): Promise<boolean> {
  const all = await readAgencies();
  if (!(id in all)) return true;
  delete all[id];
  return writeAgencies(all);
}
