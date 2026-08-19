/**
 * Published eruv listings for the public site.
 *
 * A flat, source-backed list (data/notable-eruvin.ts) — the parallel to the
 * shuls and mikvaos, but the most time-sensitive of the three. An eruv's
 * status changes weekly, so a listing never asserts the eruv is up: it names
 * the community's eruv and links its own status page, which is republished
 * each Erev Shabbos. No coordinate is stored, so none of these appears as a
 * pin on the map — an eruv is an area on the community's map, not a point on
 * ours.
 */

import { notableEruvin, WORLDWIDE_ERUV_DIRECTORY } from "@/data/notable-eruvin";

export { WORLDWIDE_ERUV_DIRECTORY };

export type EruvListing = {
  id: string;
  name: string;
  city: string;
  country: string;
  covers: string | null;
  statusUrl: string;
  /** True for an owner-added eruv — the only kind the admin can remove. */
  added?: boolean;
};

function byCountryCityName(a: EruvListing, b: EruvListing): number {
  return a.country.localeCompare(b.country) || a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
}

/** Every community eruv from the built-in flat file, sorted by country and city. */
export function listEruvin(): EruvListing[] {
  return notableEruvin
    .filter((eruv) => eruv.statusUrl.startsWith("http"))
    .map((eruv) => ({
      id: `eruv-${eruv.slug}`,
      name: eruv.name,
      city: eruv.city,
      country: eruv.country,
      covers: eruv.covers ?? null,
      statusUrl: eruv.statusUrl,
    }))
    .sort(byCountryCityName);
}

/**
 * What the owner types when adding an eruv, before it becomes a listing.
 * The status URL is the one field that is not optional and not cosmetic: the
 * whole point of an eruv listing is to route to the community's live status,
 * so a listing with no working link is not a listing.
 */
export type EruvInput = { name: string; city: string; country: string; covers?: string | null; statusUrl: string };

/** Why this eruv cannot be saved, or null. Checked in the admin action. */
export function eruvProblem(input: EruvInput): string | null {
  if (!input.name.trim()) return "Give the eruv a name.";
  if (!input.city.trim()) return "Say which city it is in.";
  if (!input.country.trim()) return "Say which country it is in.";
  if (!/^https?:\/\//i.test(input.statusUrl.trim())) return "The status link must be a full web address (https://…).";
  return null;
}

/** A stable id for an owner-added eruv, from its city and name. */
export function eruvId(input: EruvInput): string {
  const slug = `${input.city} ${input.name}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `eruv-added-${slug || "eruv"}`;
}

/** Turn validated input into the listing shape the public page renders. */
export function eruvFromInput(input: EruvInput): EruvListing {
  return {
    id: eruvId(input),
    name: input.name.trim(),
    city: input.city.trim(),
    country: input.country.trim(),
    covers: input.covers?.trim() || null,
    statusUrl: input.statusUrl.trim(),
    added: true,
  };
}

/**
 * The built-in eruvin and the owner-added ones, together.
 *
 * The owner's own additions come first when a status link clashes, since an
 * edit is how he corrects a built-in entry. Everything is re-sorted so the two
 * sources read as one list.
 */
export async function listAllEruvin(): Promise<EruvListing[]> {
  // Fails open: if the store cannot be read, the page is the built-in list.
  let stored: EruvListing[] = [];
  try {
    const { getStoredEruvin } = await import("@/lib/eruvin-store");
    stored = await getStoredEruvin();
  } catch {
    /* store unavailable — the page is the built-in list */
  }
  const built = listEruvin();
  const byUrl = new Map<string, EruvListing>();
  for (const eruv of built) byUrl.set(eruv.statusUrl, eruv);
  for (const eruv of stored) byUrl.set(eruv.statusUrl, eruv);
  return [...byUrl.values()].sort(byCountryCityName);
}
