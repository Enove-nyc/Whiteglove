// Content-access layer for DB-backed destination content.
//
// Every function here is designed to FAIL SAFE: if DATABASE_URL is not set,
// or the database is unreachable, or the destination isn't in the DB yet,
// it returns null / an empty result. Callers fall back to the existing
// static `data/*.ts` content, so the live site keeps working before Neon is
// connected and automatically upgrades to DB-backed content afterwards.

import type { Contact, PracticalPlace } from "@prisma/client";

export type DestinationContent = {
  contacts: Contact[];
  places: PracticalPlace[];
};

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

// Category order for public display (matches the practical-guide sections).
export const PLACE_CATEGORY_ORDER = [
  "ACCOMMODATION",
  "KOSHER_FOOD",
  "MINYAN",
  "MIKVAH",
  "TRANSPORT",
  "AIRPORT",
  "DRIVER",
] as const;

export const PLACE_CATEGORY_LABELS: Record<string, { english: string; yiddish: string }> = {
  ACCOMMODATION: { english: "Accommodations", yiddish: "אכסניא" },
  KOSHER_FOOD: { english: "Kosher food", yiddish: "כשרות עסן" },
  MINYAN: { english: "Minyanim", yiddish: "מנינים" },
  MIKVAH: { english: "Mikvaos", yiddish: "מקוה" },
  TRANSPORT: { english: "Transport & drivers", yiddish: "טראַנספארט" },
  AIRPORT: { english: "Airports", yiddish: "פליגפעלד" },
  DRIVER: { english: "Drivers", yiddish: "דרייווערס" },
};

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
        },
      },
    });
    if (!destination) return null;
    return { contacts: destination.contacts, places: destination.places };
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
