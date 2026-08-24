// Writing holiday destinations from the admin.
//
// THE FIRST SAVE CREATES THE ROW. The twenty built-in destinations live in
// data/vacation-destinations.ts and have no database row until the owner
// touches one — exactly as a beis hachaim has none until the first shomer's
// number is saved against it (lib/content-admin.ts, cemeteryPhotoOwner). So
// every write here is an upsert keyed on the slug, and editing Rome for the
// first time is indistinguishable, from the screen, from editing it again.
//
// EMPTY MEANS "LEAVE THE BUILT-IN TEXT ALONE", which is what makes this an
// overlay rather than a copy. Clearing a field in the editor does not blank it
// on the site; it hands the field back to the file. That is the behaviour the
// editor has to say out loud, because it is not what a form usually does.

import { bustTag } from "@/lib/cache-tags";
import { VACATION_DESTINATIONS_TAG } from "@/lib/vacation-destinations-view";

export const DB_OFF_MESSAGE = "The content database is not connected.";

function enabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function db() {
  if (!enabled()) throw new Error(DB_OFF_MESSAGE);
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export type VacationDestinationFields = {
  name: string | null;
  country: string | null;
  region: string | null;
  cities: string[];
  kosherBaseCities: string[];
  kosherBaseNote: string | null;
  themes: string[];
  seasons: string[];
  whyGo: string | null;
  bestFor: string[];
  suggestedLength: string | null;
  overview: string | null;
  whyVisit: string[];
  bestTime: string | null;
  suits: string | null;
  transport: string | null;
  outlineTitle: string | null;
  outlineDays: string[];
  cautions: string[];
  /** Real booleans, not "blank means leave alone" — always written explicitly. */
  seasonFeatured: boolean;
  seasonActive: boolean;
};

/**
 * Save the owner's version of one destination.
 *
 * `status` is left alone on an update: hiding and showing is its own action,
 * and folding it into every save would mean an ordinary edit could quietly
 * bring a hidden destination back.
 */
export async function saveVacationDestination(slug: string, fields: VacationDestinationFields) {
  const prisma = await db();
  const row = await prisma.vacationDestination.upsert({
    where: { slug },
    create: { slug, ...fields },
    update: fields,
  });
  await bustTag(VACATION_DESTINATIONS_TAG);
  return row;
}

/** Take a destination off the site, or put it back. */
export async function setVacationDestinationVisible(slug: string, visible: boolean) {
  const prisma = await db();
  const status = visible ? "PUBLISHED" : "DRAFT";
  const row = await prisma.vacationDestination.upsert({
    where: { slug },
    create: { slug, status },
    update: { status },
  });
  await bustTag(VACATION_DESTINATIONS_TAG);
  return row;
}

/**
 * Throw away the owner's edits to a built-in destination.
 *
 * Deleting the row is not deleting the destination — the built-in text comes
 * back, because the row was only ever laid over it. For a destination the file
 * never had, the row IS the destination and deleting it does remove it, which
 * is why the screen asks differently in the two cases.
 */
export async function deleteVacationDestinationRow(slug: string) {
  const prisma = await db();
  await prisma.vacationDestination.delete({ where: { slug } });
  await bustTag(VACATION_DESTINATIONS_TAG);
}

/**
 * The row a picture hangs off, made if it is not there yet.
 *
 * The first picture of Rome creates Rome's row the same way the first edit
 * does. Without this, uploading a picture of a built-in destination would have
 * nothing to attach it to.
 */
export async function vacationDestinationPhotoOwner(slug: string): Promise<{ kind: "vacation-destination"; id: string }> {
  const prisma = await db();
  const row = await prisma.vacationDestination.upsert({
    where: { slug },
    create: { slug },
    update: {},
    select: { id: true },
  });
  return { kind: "vacation-destination", id: row.id };
}

/** Every picture of one destination, drafts included — this is the admin. */
export async function vacationDestinationPhotos(slug: string) {
  if (!enabled()) return [];
  try {
    const prisma = await db();
    const row = await prisma.vacationDestination.findUnique({
      where: { slug },
      select: {
        photos: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });
    return row?.photos ?? [];
  } catch {
    return [];
  }
}

/**
 * Whether the table this screen writes to is actually there yet.
 *
 * IT IS NOT THERE THE DAY THIS SHIPS. The site has no migration step on
 * deploy — an older database is brought up to date by the button on the Towns
 * screen (lib/db-setup.ts). So the first person to open this screen after the
 * deploy has a database with no VacationDestination table in it, and without
 * this check the first save would fail with a raw Postgres error naming a
 * relation, which says nothing about what to press.
 */
export async function vacationDestinationsTableReady(): Promise<boolean> {
  if (!enabled()) return false;
  try {
    const prisma = await db();
    await prisma.vacationDestination.count();
    return true;
  } catch {
    return false;
  }
}
