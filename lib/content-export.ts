// One portable copy of everything this site knows.
//
// WHY THIS EXISTS. The content on this site lives in three different places and
// only two of them are safe:
//
//   1. GIT / GITHUB — data/*.ts. Every kever, attraction, stay and quarter that
//      ships with the site. This is already independent of the website: it is
//      versioned, it is on GitHub, and it would survive the hosting being
//      deleted tomorrow. Nothing needs doing about this one.
//
//   2. NEON POSTGRES — everything the owner adds through the admin. New batei
//      hachaim, tzaddikim added to existing ones, shomer numbers, attractions,
//      places to stay, edited pages. Until this file existed, that content sat
//      in exactly ONE place with no copy anywhere, no export, and no way to get
//      it out except by querying the database by hand.
//
//   3. UPSTASH REDIS — accounts, sessions, the site lock, analytics counters.
//      Operational rather than content, and deliberately not exported.
//
// So this builds a single JSON file holding the whole corpus — the built-in
// content and the owner-added content merged into one — that can be kept
// anywhere: a drive, a different repository, an archive. Somewhere with no
// connection to the website at all, which is the point.
//
// WHAT IS DELIBERATELY LEFT OUT. No passwords, no API keys, no sessions, no
// visitor accounts, and no edit suggestions — those carry the name and email of
// whoever sent them, and a backup is not a reason to copy strangers' details
// around. What IS in here is content, including shomer phone numbers.
//
// THE FILE IS THEREFORE NOT PUBLIC. It holds contact numbers for the people who
// open cemetery gates. Treat it as you would treat the admin password: keep it,
// but do not post it.

import { attractions as staticAttractions } from "@/data/attractions";
import { cemeteries as staticCemeteries } from "@/data/cemeteries";
import { kosherAreas as staticAreas, kosherStays as staticStays } from "@/data/kosher-stays";
import { destinations } from "@/data/destinations";
import { directoryProviders } from "@/data/directory";

/**
 * Bumped when the SHAPE of the export changes, so a future importer can tell
 * what it is looking at. Not the site's version — the file format's.
 */
export const EXPORT_SCHEMA_VERSION = 1;

export type ContentExport = {
  schemaVersion: number;
  exportedAt: string;
  /** Where each part came from, so the file explains itself years later. */
  about: string;
  counts: Record<string, number>;
  cemeteries: unknown[];
  attractions: unknown[];
  stays: unknown[];
  areas: unknown[];
  destinations: unknown[];
  directory: unknown[];
  pages: unknown[];
  /** True when the database could not be reached — built-in content only. */
  builtInOnly: boolean;
};

const ABOUT =
  "White Glove Itineraries — complete content export. Built-in content comes from the data/*.ts files in the repository; " +
  "owner-added content comes from the Postgres database. Contains shomer and access phone numbers: keep private. " +
  "Excludes passwords, API keys, visitor accounts, sessions and visitor-submitted edit suggestions.";

/**
 * Build the export.
 *
 * Fail-safe in the same way the rest of the read layer is: with the database
 * off or unreachable it returns the built-in content and sets builtInOnly, so
 * you always get a usable file rather than an error. That flag matters — a
 * backup that quietly omits every owner-added entry is worse than no backup,
 * because you would not know until you needed it.
 */
export async function buildContentExport(now: Date): Promise<ContentExport> {
  const out: ContentExport = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    about: ABOUT,
    counts: {},
    cemeteries: [...staticCemeteries],
    attractions: [...staticAttractions],
    stays: [...staticStays],
    areas: [...staticAreas],
    destinations: [...destinations],
    directory: [...directoryProviders],
    pages: [],
    builtInOnly: true,
  };

  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const staticCemeterySlugs = new Set(staticCemeteries.map((c) => c.slug));
      const staticAttractionSlugs = new Set(staticAttractions.map((a) => a.slug));
      const staticStaySlugs = new Set(staticStays.map((s) => s.slug));
      const staticAreaSlugs = new Set(staticAreas.map((a) => a.slug));

      const [dbCemeteries, dbAttractions, dbStays, dbAreas, dbPages] = await Promise.all([
        // Every cemetery row with its people and its contacts. Built-in slugs
        // are included too, because a tzadik or a shomer number the owner added
        // to a BUILT-IN beis hachaim lives only in the database — that is
        // exactly the content this export exists to rescue.
        prisma.cemetery.findMany({
          include: { burials: true, contacts: true },
          orderBy: [{ country: "asc" }, { city: "asc" }],
        }),
        prisma.attraction.findMany({ orderBy: [{ country: "asc" }, { city: "asc" }] }),
        prisma.kosherStay.findMany({ orderBy: [{ country: "asc" }, { city: "asc" }] }),
        prisma.kosherArea.findMany({ orderBy: [{ country: "asc" }, { city: "asc" }] }),
        prisma.page.findMany({ orderBy: { slug: "asc" } }),
      ]);

      // Owner-added rows are appended and tagged, so a reader can tell which
      // half of the corpus each entry came from without diffing against a repo.
      const tag = (rows: unknown[]) => rows.map((r) => ({ ...(r as object), _source: "database" }));
      out.cemeteries = [
        ...staticCemeteries.map((c) => ({ ...c, _source: "built-in" })),
        ...tag(dbCemeteries.filter((c) => !staticCemeterySlugs.has(c.slug))),
      ];
      // A built-in beis hachaim that has picked up database rows: carried
      // separately rather than merged, so nothing shadows the file version.
      out.cemeteries.push(
        ...tag(
          dbCemeteries
            .filter((c) => staticCemeterySlugs.has(c.slug) && (c.burials.length > 0 || c.contacts.length > 0))
            .map((c) => ({ ...c, _note: "additions saved against a built-in beis hachaim" })),
        ),
      );
      out.attractions = [
        ...staticAttractions.map((a) => ({ ...a, _source: "built-in" })),
        ...tag(dbAttractions.filter((a) => !staticAttractionSlugs.has(a.slug))),
      ];
      out.stays = [
        ...staticStays.map((s) => ({ ...s, _source: "built-in" })),
        ...tag(dbStays.filter((s) => !staticStaySlugs.has(s.slug))),
      ];
      out.areas = [
        ...staticAreas.map((a) => ({ ...a, _source: "built-in" })),
        ...tag(dbAreas.filter((a) => !staticAreaSlugs.has(a.slug))),
      ];
      out.pages = tag(dbPages);
      out.builtInOnly = false;
    } catch {
      // Leave the built-in content in place and leave builtInOnly true. The UI
      // says so plainly rather than handing over a partial file that looks whole.
    }
  }

  out.counts = {
    cemeteries: out.cemeteries.length,
    kevarim: countKevarim(out.cemeteries),
    attractions: out.attractions.length,
    stays: out.stays.length,
    areas: out.areas.length,
    destinations: out.destinations.length,
    directory: out.directory.length,
    pages: out.pages.length,
  };
  return out;
}

/** People, not places — the number that actually matters about this corpus. */
function countKevarim(rows: unknown[]): number {
  let total = 0;
  for (const row of rows) {
    const r = row as { burials?: unknown[] };
    if (Array.isArray(r.burials)) total += r.burials.length;
  }
  return total;
}

/** A stable, sortable filename. Timestamped so copies do not overwrite. */
export function exportFilename(now: Date): string {
  return `white-glove-content-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
}
