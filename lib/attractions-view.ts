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
import { isDisallowedImportSource } from "@/lib/bulk-content";

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
 * Narrowing a read to a handful of towns.
 *
 * ONE DESTINATION PAGE NEEDS ONE DESTINATION'S TOWNS. It used to read every
 * attraction, every stay and every quarter on the site and then filter the
 * result in memory — so opening /vacation-ideas/rome waited on three
 * unfiltered table scans in order to show a page about Rome. Passing the cities
 * down means the database returns the rows the page will actually render, and
 * the built-in lists are filtered before they are mapped.
 *
 * `undefined` means everything, which is what the hub and the front page want.
 */
type CityFilter = readonly string[] | undefined;

function onlyIn<T extends { city: string }>(items: readonly T[], cities: CityFilter): readonly T[] {
  if (!cities) return items;
  const wanted = new Set(cities);
  return items.filter((item) => wanted.has(item.city));
}

function cityWhere(cities: CityFilter) {
  return cities ? { city: { in: [...cities] } } : {};
}

function isAllowedPublicSource(sourceUrl: string | null): boolean {
  return !isDisallowedImportSource({
    sourceUrl: sourceUrl ?? "",
    sourceName: "",
    attribution: "",
  });
}

/**
 * Owner-added rows only.
 *
 * Built-in entries are read from the data files rather than the database even
 * when both exist, because the file is the edited copy — a re-import refreshes
 * the row from it. Asking the database for rows whose slug ships in the file
 * would just return a stale duplicate of what we already have.
 */
export async function getAttractionList(cities?: CityFilter): Promise<AttractionItem[]> {
  const base: AttractionItem[] = onlyIn(staticAttractions, cities).map((a) => ({ ...a, ownerAdded: false }));
  if (!DB_ENABLED) return base;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.attraction.findMany({
      where: { slug: { notIn: staticAttractionSlugs }, status: "PUBLISHED", ...cityWhere(cities) },
      orderBy: [{ country: "asc" }, { city: "asc" }],
    });
    return [
      ...base,
      ...rows.filter((row) => isAllowedPublicSource(row.sourceUrl)).map((r) => ({
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

export async function getStayList(cities?: CityFilter): Promise<KosherStayItem[]> {
  const base: KosherStayItem[] = onlyIn(staticStays, cities).map((s) => ({ ...s, ownerAdded: false }));
  if (!DB_ENABLED) return base;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.kosherStay.findMany({
      where: { slug: { notIn: staticStaySlugs }, status: "PUBLISHED", ...cityWhere(cities) },
      orderBy: [{ country: "asc" }, { city: "asc" }],
    });
    return [
      ...base,
      ...rows.filter((row) => isAllowedPublicSource(row.sourceUrl)).map((r) => ({
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

export async function getAreaList(cities?: CityFilter): Promise<KosherAreaItem[]> {
  const base: KosherAreaItem[] = onlyIn(staticAreas, cities).map((a) => ({ ...a, ownerAdded: false }));
  if (!DB_ENABLED) return base;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.kosherArea.findMany({
      where: { slug: { notIn: staticAreaSlugs }, status: "PUBLISHED", ...cityWhere(cities) },
      orderBy: [{ country: "asc" }, { city: "asc" }],
    });
    return [...base, ...rows.filter((row) => isAllowedPublicSource(row.sourceUrl)).map((r) => ({
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
