// Content-access layer for DB-backed destination content.
//
// Every function here is designed to FAIL SAFE: if DATABASE_URL is not set,
// or the database is unreachable, or the destination isn't in the DB yet,
// it returns null / an empty result. Callers fall back to the existing
// static `data/*.ts` content, so the live site keeps working before Neon is
// connected and automatically upgrades to DB-backed content afterwards.

import type { Contact, Photo, PracticalPlace } from "@prisma/client";
import type { GalleryPhoto } from "@/components/PhotoGallery";

/**
 * One listing, with pictures of that listing.
 *
 * Separate from the town's pictures on purpose. A town photo says what the
 * place looks like; this says what THIS hotel looks like, which is the
 * question somebody choosing between two of them is actually asking.
 */
export type PublicPlace = PracticalPlace & { photos: GalleryPhoto[] };

export type DestinationContent = {
  contacts: Contact[];
  places: PublicPlace[];
  /** Published pictures only — a draft is one nobody has credited yet. */
  photos: Photo[];
};

import { DESTINATION_SECTIONS } from "@/lib/destination-sections";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

// The order and headings come from lib/destination-sections.ts — the same
// list the admin editor offers and the completeness tracker counts.
//
// This used to be a fourth copy with seven entries, and groupPlacesByCategory
// filters to it: a hospital or a Shabbos note recorded in the admin was
// silently dropped on the way to the page. Nobody would have seen an error;
// the section simply would not have been there.
export const PLACE_CATEGORY_ORDER = DESTINATION_SECTIONS.map((section) => section.key);

export const PLACE_CATEGORY_LABELS: Record<string, { english: string; yiddish?: string }> = Object.fromEntries(
  DESTINATION_SECTIONS.map((section) => [section.key, { english: section.label, yiddish: section.yiddish }]),
);

/**
 * Published contacts + practical places for one destination slug.
 * Returns null when the DB is off/unreachable or the slug isn't stored yet.
 */
export async function getPublishedDestinationContent(
  slug: string,
): Promise<DestinationContent | null> {
  if (!DB_ENABLED) return null;
  try {
    const { prisma } = await import("@/lib/prisma");
    const destination = await prisma.destination.findUnique({
      where: { slug },
      include: {
        contacts: { orderBy: { label: "asc" } },
        places: {
          where: { status: "PUBLISHED" },
          orderBy: [{ category: "asc" }, { name: "asc" }],
          include: {
            photos: {
              where: { status: "PUBLISHED" },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              select: { id: true, url: true, caption: true, credit: true, sourceUrl: true },
            },
          },
        },
        // Published only. A draft is a picture nobody has credited yet, and
        // the whole point of drafting it was to keep it off the page.
        photos: {
          where: { status: "PUBLISHED" },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });
    if (!destination) return null;
    return { contacts: destination.contacts, places: destination.places, photos: destination.photos };
  } catch (error) {
    console.error("[content] DB read failed for", slug, "- using static fallback", error);
    return null;
  }
}

/**
 * Which categories each destination has something published in.
 *
 * One query for the whole directory. The alternative — asking per destination
 * — is 297 round trips to render one page, which is not a directory filter,
 * it is an outage. Returns an empty map with no database, which the caller
 * reads as "nothing published yet" and falls back to the built-in content.
 */
export async function publishedCategoriesBySlug(): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (!DB_ENABLED) return map;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.practicalPlace.findMany({
      where: { status: "PUBLISHED" },
      select: { category: true, destination: { select: { slug: true } } },
    });
    for (const row of rows) {
      const slug = row.destination?.slug;
      if (!slug) continue;
      const set = map.get(slug) ?? new Set<string>();
      set.add(row.category);
      map.set(slug, set);
    }
    return map;
  } catch (error) {
    console.error("[content] could not read published categories for the directory", error);
    return map;
  }
}

/** Group a place list by category, in display order. */
export function groupPlacesByCategory(places: PracticalPlace[]) {
  const groups = new Map<string, PracticalPlace[]>();
  for (const place of places) {
    const list = groups.get(place.category) ?? [];
    list.push(place);
    groups.set(place.category, list);
  }
  return PLACE_CATEGORY_ORDER.filter((category) => groups.has(category)).map(
    (category) => ({
      category,
      label: PLACE_CATEGORY_LABELS[category],
      places: groups.get(category)!,
    }),
  );
}
