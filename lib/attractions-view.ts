// Public read layer for the non-kever half of a trip: things to do, places to
// stay, and the Jewish quarters they are measured from.
//
// WHY THIS FILE EXISTS. The built-in entries live in data/attractions.ts and
// data/kosher-stays.ts; anything the owner adds later lives in the database.
// If each page reached for whichever of the two it happened to know about, an
// entry added in the admin would show on one screen and be missing from the
// search on the next. Everything — the directories, the /stops search, the
// planner's pickers — reads through here instead, so a new entry is findable
// everywhere the moment it is saved.
//
// FAIL SAFE: with the DB off or unreachable this returns the built-in content
// only, so the pages never go blank.
//
// Coordinates here are public landmarks and are safe to navigate to. That is
// the opposite of the rule for kevarim (see data/cemeteries.ts) and the reason
// is simply that nobody is harmed by arriving at the wrong corner of a square.

import { attractions as staticAttractions, type Attraction } from "@/data/attractions";
import { kosherAreas as staticAreas, kosherStays as staticStays, type KosherStay } from "@/data/kosher-stays";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

export type KosherAreaItem = (typeof staticAreas)[number] & { ownerAdded: boolean };
export type AttractionItem = Attraction & { ownerAdded: boolean };
export type KosherStayItem = KosherStay & { ownerAdded: boolean };

const staticAttractionSlugs = staticAttractions.map((a) => a.slug);
const staticStaySlugs = staticStays.map((s) => s.slug);
const staticAreaSlugs = staticAreas.map((a) => a.slug);

/** Drop nulls Prisma returns for optional columns, which the types call absent. */
function opt(value: string | null): string | undefined {
  return value ?? undefined;
}

/**
 * Owner-added rows only.
 *
 * Built-in entries are read from the data files rather than the database even
 * when both exist, because the file is the edited copy — a re-import refreshes
 * the row from it. Asking the database for rows whose slug ships in the file
 * would just return a stale duplicate of what we already have.
 */
export async function getAttractionList(): Promise<AttractionItem[]> {
  const base: AttractionItem[] = staticAttractions.map((a) => ({ ...a, ownerAdded: false }));
  if (!DB_ENABLED) return base;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.attraction.findMany({
      where: { slug: { notIn: staticAttractionSlugs }, status: "PUBLISHED" },
      orderBy: [{ country: "asc" }, { city: "asc" }],
    });
    return [
      ...base,
      ...rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        city: r.city,
        country: r.country,
        // The column is free text so the owner is not boxed in by an enum the
        // code shipped with; anything unrecognised is shown as a Landmark.
        kind: (["Jewish heritage", "Museum", "Landmark", "Nature", "Family", "Viewpoint"] as const).find((k) => k === r.kind) ?? "Landmark",
        summary: r.summary,
        address: opt(r.address),
        coordinates: opt(r.coordinates),
        website: opt(r.website),
        notes: r.notes,
        shabbos: opt(r.shabbos),
        sourceUrl: r.sourceUrl,
        ownerAdded: true,
      })),
    ];
  } catch {
    return base;
  }
}

export async function getStayList(): Promise<KosherStayItem[]> {
  const base: KosherStayItem[] = staticStays.map((s) => ({ ...s, ownerAdded: false }));
  if (!DB_ENABLED) return base;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.kosherStay.findMany({
      where: { slug: { notIn: staticStaySlugs }, status: "PUBLISHED" },
      orderBy: [{ country: "asc" }, { city: "asc" }],
    });
    return [
      ...base,
      ...rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        city: r.city,
        country: r.country,
        kind: (["Kosher hotel", "Kosher B&B", "Seasonal kosher programme", "Kosher-friendly, in the Jewish quarter", "Ordinary hotel, well placed"] as const).find((k) => k === r.kind) ?? "Ordinary hotel, well placed",
        summary: r.summary,
        anchor: { name: r.anchorName, coordinates: r.anchorCoords },
        season: opt(r.season),
        // An unrecognised value is read as "none", never as "confirmed" — the
        // stronger claim is the one that must not be reached by accident.
        kosherClaim: (["none", "reported", "confirmed"] as const).find((k) => k === r.kosherClaim) ?? "none",
        notes: r.notes,
        website: opt(r.website),
        sourceUrl: r.sourceUrl,
        ownerAdded: true,
      })),
    ];
  } catch {
    return base;
  }
}

export async function getAreaList(): Promise<KosherAreaItem[]> {
  const base: KosherAreaItem[] = staticAreas.map((a) => ({ ...a, ownerAdded: false }));
  if (!DB_ENABLED) return base;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.kosherArea.findMany({
      where: { slug: { notIn: staticAreaSlugs }, status: "PUBLISHED" },
      orderBy: [{ country: "asc" }, { city: "asc" }],
    });
    return [...base, ...rows.map((r) => ({
      slug: r.slug,
      city: r.city,
      country: r.country,
      name: r.name,
      coordinates: r.coordinates,
      note: r.note,
      sourceUrl: r.sourceUrl,
      ownerAdded: true,
    }))];
  } catch {
    return base;
  }
}
