// Public read layer for cemeteries that merges the built-in static list
// (data/cemeteries.ts, which carries the rich arrival notes + nearby places)
// with owner-added cemeteries and tzaddikim stored in the database.
//
// FAIL SAFE: with the DB off/unreachable it returns the static content only, so
// the cemetery pages always work.

import { cemeteries as staticCemeteries, getCemetery as getStaticCemetery, type Cemetery } from "@/data/cemeteries";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

export type CemeteryListItem = {
  slug: string;
  city: string;
  yiddishCity: string;
  name: string;
  yiddishName: string;
  country: string;
  burialCount: number;
  ownerAdded: boolean;
};

const staticSlugs = new Set(staticCemeteries.map((c) => c.slug));

function staticListItem(c: Cemetery): CemeteryListItem {
  return {
    slug: c.slug,
    city: c.city,
    yiddishCity: c.yiddishCity,
    name: c.name,
    yiddishName: c.yiddishName,
    country: c.country,
    burialCount: c.burials.length,
    ownerAdded: false,
  };
}

/** The cemetery directory list: built-in cemeteries plus owner-added ones. */
export async function getCemeteryList(): Promise<CemeteryListItem[]> {
  const base = staticCemeteries.map(staticListItem);
  if (!DB_ENABLED) return base;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.cemetery.findMany({
      where: { slug: { notIn: [...staticSlugs] } },
      select: {
        slug: true, city: true, yiddishCity: true, name: true, yiddishName: true, country: true,
        _count: { select: { burials: true } },
      },
      orderBy: [{ country: "asc" }, { city: "asc" }],
    });
    const added = rows.map((r) => ({
      slug: r.slug, city: r.city, yiddishCity: r.yiddishCity, name: r.name,
      yiddishName: r.yiddishName, country: r.country, burialCount: r._count.burials, ownerAdded: true,
    }));
    return [...base, ...added];
  } catch {
    return base;
  }
}

/** One cemetery for its detail page. For a built-in cemetery, returns the rich
 *  static record with any owner-added tzaddikim appended; for an owner-added
 *  cemetery, builds the record from the database. */
export async function getCemeteryView(slug: string): Promise<Cemetery | null> {
  const staticRecord = getStaticCemetery(slug);

  if (!DB_ENABLED) return staticRecord ?? null;

  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.cemetery.findUnique({
      where: { slug },
      include: {
        burials: { orderBy: { name: "asc" } },
        contacts: { orderBy: { label: "asc" } },
      },
    });

    if (staticRecord) {
      // Append owner-added tzaddikim (names not already listed statically).
      if (!row) return staticRecord;
      const known = new Set(staticRecord.burials.map((b) => b.name.toLowerCase()));
      const extra = row.burials
        .filter((b) => !known.has(b.name.toLowerCase()))
        .map((b) => ({
          name: b.name, yiddishName: b.yiddishName, knownAs: b.knownAs ?? undefined,
          seforim: b.seforim ?? undefined, yahrzeit: b.yahrzeit ?? undefined, note: b.note ?? undefined,
        }));
      if (!extra.length) return staticRecord;
      return { ...staticRecord, burials: [...staticRecord.burials, ...extra] };
    }

    if (!row) return null;
    // Owner-added cemetery — build the static shape from the DB row.
    return {
      slug: row.slug,
      city: row.city,
      yiddishCity: row.yiddishCity,
      name: row.name,
      yiddishName: row.yiddishName,
      country: row.country,
      address: row.address ?? "",
      coordinates: row.coordinates ?? undefined,
      arrivalNotes: row.arrivalNotes ?? [],
      accessNote: row.accessNote ?? undefined,
      accessContacts: row.contacts.map((c) => ({
        label: c.label, phone: c.phone ?? undefined, email: c.email ?? undefined, note: c.note ?? "",
      })),
      burials: row.burials.map((b) => ({
        name: b.name, yiddishName: b.yiddishName, knownAs: b.knownAs ?? undefined,
        seforim: b.seforim ?? undefined, yahrzeit: b.yahrzeit ?? undefined, note: b.note ?? undefined,
      })),
      sourceUrl: row.sourceUrl ?? "",
    };
  } catch {
    return staticRecord ?? null;
  }
}
