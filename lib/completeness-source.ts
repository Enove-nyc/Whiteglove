import { DESTINATION_SECTIONS } from "@/lib/destination-sections";

/**
 * What the database actually holds for a destination, for the work queue.
 *
 * The completeness tracker has only ever read `data/destination-database.ts` —
 * the built-in content compiled into the site. That record has five practical
 * sections baked into its type, from before the rest existed, so the eight
 * added since could only ever be counted as missing. The owner could enter a
 * hospital, a Shabbos note and davening times for a town and the queue would
 * still say the record was empty.
 *
 * This reads what is really there. Only the fields the tracker asks about —
 * which sections have a published listing, how many photos, whether anybody
 * has checked anything — so it is one small query rather than loading every
 * destination in full.
 */

export type DestinationFacts = {
  /** Section keys with at least one published listing. */
  sections: string[];
  photos: number;
  contacts: number;
  cemeteries: number;
  /** Any listing marked VERIFIED. */
  anyVerified: boolean;
  /** The most recent check, as YYYY-MM-DD. */
  lastVerified?: string;
};

const SECTION_KEYS = new Set(DESTINATION_SECTIONS.map((section) => section.key));

/**
 * Facts for every destination, keyed by slug.
 *
 * Returns null when there is no database, or when reading it fails. Null means
 * "ask the built-in record instead" — the queue then behaves exactly as it did
 * before this existed. A work queue that empties itself because a database
 * blinked is worse than one that is a little out of date: it says the work is
 * done.
 */
export async function readDestinationFacts(): Promise<Map<string, DestinationFacts> | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.destination.findMany({
      select: {
        slug: true,
        lastVerified: true,
        places: {
          where: { status: "PUBLISHED" },
          select: { category: true, verification: true, lastVerified: true },
        },
        _count: { select: { photos: true, contacts: true, cemeteries: true } },
      },
    });

    const facts = new Map<string, DestinationFacts>();
    for (const row of rows) {
      const sections = new Set<string>();
      let anyVerified = false;
      let latest: Date | null = row.lastVerified ?? null;
      for (const place of row.places) {
        if (SECTION_KEYS.has(place.category)) sections.add(place.category);
        if (place.verification === "VERIFIED") anyVerified = true;
        if (place.lastVerified && (!latest || place.lastVerified > latest)) latest = place.lastVerified;
      }
      facts.set(row.slug, {
        sections: [...sections],
        photos: row._count.photos,
        contacts: row._count.contacts,
        cemeteries: row._count.cemeteries,
        anyVerified,
        lastVerified: latest ? latest.toISOString().slice(0, 10) : undefined,
      });
    }
    return facts;
  } catch (error) {
    // Loud enough to find, quiet enough not to break the page.
    console.error("[completeness] could not read the database — falling back to the built-in content", error);
    return null;
  }
}
