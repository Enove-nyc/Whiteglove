import { destinationHref, destinations } from "@/data/destinations";
import { getCemeteryList } from "@/lib/cemeteries-view";
import { NOTHING_ENTERED, readCemeteryFacts, readDestinationFacts } from "@/lib/completeness-source";
import { type DemandReport, type Held, demandReport, keverMissing, townMissing } from "@/lib/demand";
import { analyticsIsConfigured, getEmptySearches, getTopVisitedPaths } from "@/lib/site-analytics";

/**
 * Everything the demand report needs, gathered.
 *
 * The rules live in lib/demand.ts and know nothing about a database. This is
 * the part that reads: what the site holds, what has been entered on it, and
 * what people have been opening and searching for.
 *
 * A record whose facts cannot be read is treated as EMPTY rather than skipped.
 * The database being away is not evidence that the work is done, and a queue
 * that quietly shortens itself is the failure mode this codebase has been
 * bitten by before.
 */
export async function buildDemandReport(): Promise<DemandReport & { visitsCounted: number }> {
  const counting = analyticsIsConfigured();
  const [visitedRaw, emptySearches, townFacts, keverFacts, cemeteries] = await Promise.all([
    getTopVisitedPaths(400),
    getEmptySearches(40),
    readDestinationFacts(),
    readCemeteryFacts(),
    getCemeteryList(),
  ]);

  const held: Held[] = [];

  for (const destination of destinations) {
    const facts = townFacts?.get(destination.slug) ?? NOTHING_ENTERED;
    const missing = townMissing(facts);
    held.push({
      path: destinationHref(destination),
      title: destination.city,
      kind: "town",
      filled: !missing,
      missing,
      editHref: `/admin/destinations?slug=${encodeURIComponent(destination.slug)}`,
    });
  }

  for (const cemetery of cemeteries) {
    const facts = keverFacts?.get(cemetery.slug) ?? {
      burials: cemetery.burialCount,
      burialsWithCoordinates: 0,
      contacts: 0,
      hasLocation: false,
      hasAccessNote: false,
    };
    const missing = keverMissing(facts);
    held.push({
      path: `/cemeteries/${cemetery.slug}`,
      title: `${cemetery.name}, ${cemetery.city}`,
      kind: "beis hachaim",
      filled: !missing,
      missing,
      editHref: `/admin/kevarim?slug=${encodeURIComponent(cemetery.slug)}`,
    });
  }

  const visited = visitedRaw.map((row) => ({ path: row.path, visits: row.count }));
  return {
    ...demandReport({ counting, held, visited, emptySearches }),
    visitsCounted: visited.reduce((sum, row) => sum + row.visits, 0),
  };
}
