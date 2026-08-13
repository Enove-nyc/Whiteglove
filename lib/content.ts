// Content-access layer for DB-backed destination content.
//
// Every function here is designed to FAIL SAFE: if DATABASE_URL is not set,
// or the database is unreachable, or the destination isn't in the DB yet,
// it returns null / an empty result. Callers fall back to the existing
// static `data/*.ts` content, so the live site keeps working before Neon is
// connected and automatically upgrades to DB-backed content afterwards.

import type { Contact, Photo, PracticalPlace } from "@prisma/client";
import type { GalleryPhoto } from "@/components/PhotoGallery";
import { isDisallowedImportSource } from "@/lib/bulk-content";
import { optionalRead } from "@/lib/db-optional";

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
  /** Somewhere else worth reading about this town. Owner-managed. */
  links: Array<{ id: string; label: string; url: string; note: string | null }>;
};

import { DESTINATION_SECTIONS } from "@/lib/destination-sections";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

function isAllowedPublicSource(sourceUrl: string | null): boolean {
  return !isDisallowedImportSource({
    sourceUrl: sourceUrl ?? "",
    sourceName: "",
    attribution: "",
  });
}

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

    // The listings and the contacts, on their own. This is everything the
    // owner typed, and it must not depend on anything newer than itself —
    // pictures used to be joined on here, and when the Photo table did not
    // exist yet this whole read threw and the page fell back to the built-in
    // content. Every listing and every phone number he had entered vanished,
    // silently, on a page that had said "Saved." every time.
    const destination = await prisma.destination.findUnique({
      where: { slug },
      include: {
        // NAMED, AND THEY HAVE TO STAY NAMED. `include: true` selects every
        // column the generated client knows about, so the day a column is
        // added to Contact in schema.prisma this whole read starts throwing
        // P2022 against a database that has not had the migration run yet —
        // and the page silently falls back to built-in content, losing every
        // listing and phone number the owner entered. That is the failure the
        // paragraph above describes, and adding Contact.lastVerified caused it
        // again: /ropshitz threw "The column (not available) does not exist"
        // in production while the schema and the database disagreed.
        //
        // Naming the columns means the schema can move ahead of the database
        // without taking a public page down with it. Anything new is read
        // separately and allowed to fail, exactly like the pictures below.
        contacts: {
          orderBy: { label: "asc" },
          select: {
            id: true,
            label: true,
            phone: true,
            email: true,
            note: true,
            source: true,
            status: true,
            destinationId: true,
            cemeteryId: true,
          },
        },
        places: {
          where: { status: "PUBLISHED" },
          orderBy: [{ category: "asc" }, { name: "asc" }],
        },
      },
    });
    if (!destination) return null;
    const places = destination.places.filter((place) => isAllowedPublicSource(place.sourceUrl));

    // Pictures, separately, and allowed to fail. Published only: a draft is
    // one nobody has credited yet, and drafting it was the point.
    const pictures = await optionalRead(
      `pictures for ${slug}`,
      async () =>
        prisma.photo.findMany({
          where: {
            status: "PUBLISHED",
            OR: [{ destinationId: destination.id }, { placeId: { in: places.map((place) => place.id) } }],
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        }),
      [] as Photo[],
    );

    const byPlace = new Map<string, GalleryPhoto[]>();
    for (const photo of pictures) {
      if (!photo.placeId) continue;
      const list = byPlace.get(photo.placeId) ?? [];
      list.push(photo);
      byPlace.set(photo.placeId, list);
    }

    // The last-checked dates, separately and allowed to fail — same reason the
    // pictures are. On a database that has not had the migration run yet this
    // returns nothing and the contacts simply carry no date, which is what
    // they showed before the column existed. It never costs the page.
    const contactDates = await optionalRead(
      `contact dates for ${slug}`,
      async () =>
        prisma.contact.findMany({
          where: { destinationId: destination.id },
          select: { id: true, lastVerified: true },
        }),
      [] as Array<{ id: string; lastVerified: Date | null }>,
    );
    const checkedById = new Map(contactDates.map((row) => [row.id, row.lastVerified]));

    // Whose number it is. Its own read, and its own permission to fail, for the
    // reason written above the select: it is newer than the table, and reading
    // it alongside anything else would take that something else down with it on
    // a database the upgrade has not reached yet. Separate from the dates for
    // the same reason — two new columns must not be able to fail each other.
    const contactNames = await optionalRead(
      `names on the contacts for ${slug}`,
      async () =>
        prisma.contact.findMany({
          where: { destinationId: destination.id },
          select: { id: true, name: true },
        }),
      [] as Array<{ id: string; name: string | null }>,
    );
    const nameById = new Map(contactNames.map((row) => [row.id, row.name]));

    // The useful links, separately and allowed to fail — the same rule as the
    // pictures and the contact dates above, and for the same reason: this
    // table is newer than most databases this runs against, and a page must
    // not lose every listing on it because one new table is missing.
    const links = await optionalRead(
      `useful links for ${slug}`,
      async () =>
        prisma.destinationLink.findMany({
          where: { destinationId: destination.id, status: "PUBLISHED" },
          orderBy: [{ position: "asc" }, { label: "asc" }],
          select: { id: true, label: true, url: true, note: true },
        }),
      [] as Array<{ id: string; label: string; url: string; note: string | null }>,
    );

    return {
      links,
      contacts: destination.contacts.map((contact) => ({
        ...contact,
        name: nameById.get(contact.id) ?? null,
        lastVerified: checkedById.get(contact.id) ?? null,
      })),
      places: destination.places.map((place) => ({ ...place, photos: byPlace.get(place.id) ?? [] })),
      photos: pictures.filter((photo) => photo.destinationId === destination.id),
    };
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
      select: { category: true, sourceUrl: true, destination: { select: { slug: true } } },
    });
    for (const row of rows) {
      if (!isAllowedPublicSource(row.sourceUrl)) continue;
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
