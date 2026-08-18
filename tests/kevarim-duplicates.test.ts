import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cemeteries } from "@/data/cemeteries";
import { bulkDestinations } from "@/data/destinations-bulk";
import { getDestinationRecord } from "@/data/destination-database";

/**
 * One man, one kever, one listing.
 *
 * WHY THIS EXISTS. Adding beis hachaim listings for towns whose pages were
 * empty, I twice wrote a listing for a kever the site already had, because the
 * existing one was filed under a name I had not thought to search:
 *
 *   Nagykálló — already there as `nagykallo-kaliv`, and richer than what I
 *   wrote: it carries a caretaker's phone, a pilgrimage house and the nearest
 *   kosher food. The duplicate would have replaced none of that and sat beside
 *   it, so the page would have listed the Kaliver Rebbe twice.
 *   The Ruzhiner — already there as `sadhora-ruzhiner`. A check I ran myself
 *   reported him PRESENT and I researched Chernivtsi anyway. What was actually
 *   missing was the pairing that lets the Chernivtsi page find the Sadhora
 *   listing, not the listing.
 *
 * Both were caught by scanning for a name in two listings, which is what this
 * does on every run. A duplicated kever is not a cosmetic bug: the page says
 * the same tzaddik is buried in two places, which on this site is the one
 * thing that must never be said.
 */

/** The listing a burial's name appears in, for every name in the data. */
function listingsByName(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();
  for (const cemetery of cemeteries) {
    for (const burial of cemetery.burials) {
      const key = burial.name.trim().toLowerCase();
      const set = found.get(key) ?? new Set<string>();
      set.add(cemetery.slug);
      found.set(key, set);
    }
  }
  return found;
}

/**
 * Known and NOT yet resolved.
 *
 * Reb Asher Meir Halberstam is listed in both Bochnia and Nowy Wiśnicz, two
 * towns about ten kilometres apart. This predates the batches above and nobody
 * has read the stones; it is allowed here rather than quietly deleted, because
 * removing one at random is how the wrong one goes. Resolve it, then delete
 * this entry — do not add to this list to make a new duplicate pass.
 */
const UNRESOLVED = new Set(["rabbi asher meir halberstam"]);

describe("no kever is listed in two places", () => {
  it("names each burial in exactly one beis hachaim", () => {
    const offenders = [...listingsByName()]
      .filter(([name, slugs]) => slugs.size > 1 && !UNRESOLVED.has(name))
      .map(([name, slugs]) => `${name} → ${[...slugs].join(", ")}`);
    assert.deepEqual(offenders, [], `the same person is listed in more than one beis hachaim:\n${offenders.join("\n")}`);
  });

  it("gives every listing its own slug", () => {
    const slugs = cemeteries.map((cemetery) => cemetery.slug);
    assert.equal(new Set(slugs).size, slugs.length, "two listings share a slug");
  });

  it("does not put two listings on one town at the same address", () => {
    // The other shape the Nagykálló mistake could have taken: same ground,
    // two records, slightly different street text.
    const byTown = new Map<string, string[]>();
    for (const cemetery of cemeteries) {
      const key = `${cemetery.city.toLowerCase()}|${(cemetery.address ?? "").toLowerCase().slice(0, 25)}`;
      byTown.set(key, [...(byTown.get(key) ?? []), cemetery.slug]);
    }
    const doubled = [...byTown].filter(([, slugs]) => slugs.length > 1).map(([key, slugs]) => `${key} → ${slugs.join(", ")}`);
    assert.deepEqual(doubled, []);
  });
});

describe("a town's listing is reachable from its page", () => {
  it("every listing whose town is in the directory is paired to it", () => {
    // The real failure behind both duplicates: the listing existed and the
    // page could not find it, so the page looked empty and invited somebody to
    // write a second one. If this fails, add the pairing to
    // SAME_TOWN_OTHER_NAME rather than writing a new listing.
    const directorySlugs = new Set(bulkDestinations.map((d) => d.slug));
    const orphans: string[] = [];
    for (const cemetery of cemeteries) {
      // Only check listings whose slug clearly belongs to a directory town.
      const owner = [...directorySlugs].find(
        (slug) => cemetery.slug === slug || cemetery.slug.startsWith(`${slug}-`) || cemetery.slug.endsWith(`-${slug}`),
      );
      if (!owner) continue;
      const record = getDestinationRecord(owner);
      if (!record?.cemeteries.some((c) => c.id === cemetery.slug)) orphans.push(`${cemetery.slug} (town ${owner})`);
    }
    assert.deepEqual(orphans, []);
  });

  it("the towns paired by hand actually resolve", () => {
    for (const slug of ["mikulov", "anipoli", "pinsk", "stropkov", "chernivtsi"]) {
      const record = getDestinationRecord(slug);
      assert.ok(record, `${slug} is not a destination`);
      assert.ok(record.cemeteries.length > 0, `${slug} was paired but resolves to nothing`);
    }
  });
});

describe("every directory town has a slug its page can be reached at", () => {
  it("keeps slugs to lowercase ASCII, digits and hyphens", () => {
    // WHY. Žagarė's directory entry was written with its Lithuanian diacritic,
    // `zagarė`, and its town page returned 404 at every URL encoding for as
    // long as the entry existed. Nothing failed loudly, because a page nobody
    // can open does not complain — it was found only when a beis hachaim
    // listing was added to that town and the page still would not load. The
    // town's display name keeps its diacritics; the slug is the URL and must
    // not.
    const bad = bulkDestinations.map((d) => d.slug).filter((slug) => !/^[a-z0-9-]+$/.test(slug));
    assert.deepEqual(bad, [], `these slugs cannot be served as URLs: ${bad.join(", ")}`);
  });
});
