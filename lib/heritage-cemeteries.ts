/**
 * The heritage-cemetery locator — built-in set plus the owner's additions.
 *
 * The built-in entries come from data/heritage-cemeteries.ts (the Nesiya Tova
 * locator, generated). The owner-added ones come from the private store
 * (lib/heritage-cemeteries-store.ts). Everything on this side reads through
 * listAllHeritageCemeteries so the map, the locator on /cemeteries and each
 * entry's own page show one merged list.
 *
 * These are locations with a source, not rich pages: no invented details, and
 * every entry forwards to its source for access, hours and contacts.
 */

import { heritageCemeteries, type HeritageCemetery } from "@/data/heritage-cemeteries";

export type { HeritageCemetery };

/** A locator entry as rendered: a built-in one, or one the owner added. */
export type HeritageCemeteryListing = HeritageCemetery & {
  /** True for an owner-added entry — the only removable kind. */
  added?: boolean;
};

/** What the owner types when adding a heritage cemetery. */
export type HeritageInput = {
  name: string;
  city: string;
  country: string;
  address?: string | null;
  coordinates: string;
  sourceUrl: string;
};

/** Why this entry cannot be saved, or null. Checked in the admin action. */
export function heritageProblem(input: HeritageInput): string | null {
  if (!input.name.trim()) return "Give the bais hachaim a name.";
  if (!input.city.trim()) return "Say which city it is in.";
  if (!input.country.trim()) return "Say which country it is in.";
  if (!/^-?\d{1,3}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?$/.test((input.coordinates ?? "").trim())) {
    return "Coordinates must look like 47.4979, 19.0402 — a locator entry is a point on the map.";
  }
  if (!/^https?:\/\//i.test((input.sourceUrl ?? "").trim())) {
    return "The details link must be a full web address (https://…) — this is where it forwards for access and hours.";
  }
  return null;
}

/** A stable slug for an owner-added entry, from its city and name. */
export function heritageSlug(input: HeritageInput): string {
  const base = `${input.city} ${input.name}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `bh-added-${base || "cemetery"}`;
}

/** Turn validated input into the listing shape the map and pages render. */
export function heritageFromInput(input: HeritageInput): HeritageCemeteryListing {
  return {
    slug: heritageSlug(input),
    name: input.name.trim(),
    city: input.city.trim(),
    country: input.country.trim(),
    address: input.address?.trim() || "",
    coordinates: input.coordinates.trim(),
    sourceUrl: input.sourceUrl.trim(),
    added: true,
  };
}

/** The built-in locator set, synchronous. */
export function builtInHeritageCemeteries(): HeritageCemeteryListing[] {
  return heritageCemeteries;
}

/**
 * The built-in locator and the owner's additions, together.
 *
 * Owner-added entries win a slug clash, since adding one is how the owner fixes
 * a built-in entry. Fails open: if the store cannot be read, the list is the
 * built-in set, exactly as before an editor existed.
 */
export async function listAllHeritageCemeteries(): Promise<HeritageCemeteryListing[]> {
  let stored: HeritageCemeteryListing[] = [];
  try {
    const { getStoredHeritageCemeteries } = await import("@/lib/heritage-cemeteries-store");
    stored = await getStoredHeritageCemeteries();
  } catch {
    /* store unavailable — the locator is the built-in set */
  }
  if (!stored.length) return heritageCemeteries;
  const bySlug = new Map<string, HeritageCemeteryListing>();
  for (const entry of heritageCemeteries) bySlug.set(entry.slug, entry);
  for (const entry of stored) bySlug.set(entry.slug, entry);
  return [...bySlug.values()];
}

/** One entry by slug, built-in or owner-added. */
export async function heritageCemeteryBySlug(slug: string): Promise<HeritageCemeteryListing | undefined> {
  const built = heritageCemeteries.find((c) => c.slug === slug);
  if (built) return built;
  let stored: HeritageCemeteryListing[] = [];
  try {
    const { getStoredHeritageCemeteries } = await import("@/lib/heritage-cemeteries-store");
    stored = await getStoredHeritageCemeteries();
  } catch {
    /* store unavailable */
  }
  return stored.find((c) => c.slug === slug);
}
