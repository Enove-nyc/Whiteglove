import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cemeteries } from "@/data/cemeteries";
import { bulkDestinations } from "@/data/destinations-bulk";
import { getDestinationRecord } from "@/data/destination-database";
import { coordinatesToPoint } from "@/data/route-utils";

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

describe("a surveyed coordinate belongs to the town it is filed under", () => {
  it("keeps every listing's map point near its own town pin", () => {
    // WHY. Coordinates were backfilled onto forty-eight listings from the ESJF
    // survey database by matching town names to survey slugs. A name match can
    // land on the wrong town, and a wrong coordinate is worse than none — it
    // sends somebody confidently to a field that is not the cemetery. This
    // compares each listing's map point against the town pin it already had
    // and fails if they disagree by more than fifteen kilometres.
    //
    // It has already earned its place: it caught Rotmistrivka, whose town pin
    // had been twenty-six kilometres off the village since long before the
    // backfill.
    // Parsed THROUGH coordinatesToPoint, not with a split on the comma. Three
    // entries on this site are written in degrees-minutes-seconds and are
    // perfectly good; a first draft of this suite reimplemented parsing and
    // failed them — the same mistake tests/kevarim-safety.test.ts already
    // records having made once.
    const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const rad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = rad(b.lat - a.lat);
      const dLng = rad(b.lng - a.lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * 6371 * Math.asin(Math.sqrt(h));
    };
    const far = cemeteries
      .filter((cemetery) => cemetery.coordinates && cemetery.airportRef)
      .map((cemetery) => ({
        slug: cemetery.slug,
        here: coordinatesToPoint(cemetery.coordinates),
        town: coordinatesToPoint(cemetery.airportRef),
      }))
      .filter((entry) => entry.here && entry.town)
      .map((entry) => ({ slug: entry.slug, d: km(entry.here!, entry.town!) }))
      .filter((entry) => entry.d > 15)
      .map((entry) => `${entry.slug} is ${entry.d.toFixed(0)}km from its own town pin`);
    assert.deepEqual(far, []);
  });

});

describe("a listing's notes belong to the listing they are on", () => {
  it("never carries another listing's street inside a note", () => {
    // WHY THIS EXISTS, and it is the worst mistake of the whole run.
    //
    // Sadhora and Peremyshlyany sit in the same file and both carried the
    // identical line "Confirm the cemetery and exact grave location locally."
    // Two edit scripts each replaced "the first occurrence" of that line, and
    // the second shifted the first one's target: four notes written for the
    // Ruzhiner's ohel at Sadhora — its street, its keyholder, its history —
    // were published on the page for the Zidichover's kever at Zhydachiv, a
    // different tzaddik in a different town. It went live before it was
    // caught, and it was caught by reading the page rather than by trusting
    // the script that wrote it.
    //
    // The check is deliberately narrow, because cross-references between towns
    // are normal and wanted on this site — "he is not here, he is in
    // Berditchev", "Tarcal is four kilometres from Tokaj". What is never right
    // is a note carrying a STREET that belongs to a different listing's
    // address. That is the signature of text landing on the wrong record.
    const streetsOf = (address: string) =>
      address
        .split(",")
        .map((part) => part.trim())
        // Only parts that actually say "street" in some language. An earlier
        // draft also accepted any capitalised two-word fragment and matched
        // "Jewish cemetery" as a street name in half the data.
        .filter((part) => /\b(street|streets|str\.|ulica|ul\.|utca|strada|trieda|hauptstra|gasse)\b/i.test(part))
        .filter((part) => !/jewish|cemetery|beis|section|site of/i.test(part))
        .map((part) => part.replace(/^\d+[a-zA-Z]?\s+/, "").trim())
        .filter((part) => part.length > 8);

    const owners = new Map<string, string>();
    for (const cemetery of cemeteries) {
      for (const street of streetsOf(cemetery.address ?? "")) {
        if (!owners.has(street.toLowerCase())) owners.set(street.toLowerCase(), cemetery.slug);
      }
    }
    const offenders: string[] = [];
    for (const cemetery of cemeteries) {
      const mine = new Set(streetsOf(cemetery.address ?? "").map((s) => s.toLowerCase()));
      for (const note of cemetery.arrivalNotes) {
        const lower = note.toLowerCase();
        for (const [street, owner] of owners) {
          if (owner === cemetery.slug || mine.has(street)) continue;
          if (lower.includes(street)) offenders.push(`${cemetery.slug} names "${street}", which is ${owner}'s street`);
        }
      }
    }
    assert.deepEqual(offenders, []);
  });
});

describe("no listing carries the same field twice", () => {
  it("never repeats a key inside one record", async () => {
    // WHY. An edit script inserted a coordinates line into a record that
    // already had one. The object then had two `coordinates:` keys, the
    // second silently won, and nothing complained — not the type checker, not
    // the build, not any test. The value that survived happened to be the
    // right one, which is luck rather than safety.
    const { readdir, readFile } = await import("node:fs/promises");
    const files = (await readdir("data")).filter((name) => /^cemeteries.*\.ts$/.test(name));
    const offenders: string[] = [];
    for (const file of files) {
      const source = await readFile(`data/${file}`, "utf8");
      // Split on record boundaries: every listing starts with a slug line.
      const records = source.split(/\n\s*slug: "/).slice(1);
      for (const record of records) {
        const slug = record.slice(0, record.indexOf('"'));
        const body = record.split("sourceUrl:")[0];
        for (const key of ["coordinates", "address", "airportRef", "city", "country"]) {
          const count = body.match(new RegExp(`\\n\\s{4}${key}:`, "g"))?.length ?? 0;
          if (count > 1) offenders.push(`${file}: ${slug} has ${count} ${key} lines`);
        }
      }
    }
    assert.deepEqual(offenders, []);
  });
});

describe("a listing does not tell people to find what it already published", () => {
  it("drops the bare 'confirm exact location locally' once a coordinate exists", () => {
    // WHY. Forty-nine listings gained a surveyed coordinate during the mapping
    // work and kept an address ending "— confirm exact location locally". That
    // sentence was written when the site genuinely could not say where the
    // ground was. Once a measured point is on the page it is no longer true,
    // and it reads as though the coordinate should not be trusted.
    //
    // Hedges that carry real information are fine and several remain: "no
    // street number is documented", "both of the town's cemeteries were
    // destroyed and we could not establish which one holds him". What this
    // refuses is the bare formula with nothing behind it.
    const offenders = cemeteries
      .filter((cemetery) => cemetery.coordinates)
      .filter((cemetery) => /—\s*confirm exact location locally\s*$/i.test(cemetery.address ?? ""))
      .map((cemetery) => cemetery.slug);
    assert.deepEqual(offenders, []);
  });
});

describe("a listing's source is about the people on it", () => {
  it("keeps every Wikipedia source on-subject, or allowlists why not", () => {
    // WHY. Two listings placed a tzaddik in the wrong town and both were found
    // the same way: their cited Wikipedia article was about somebody else.
    //
    //   Bershad cited the article on Reb Pinchas of Koretz. Reb Raphael of
    //   Bershad lived in Bershad but is buried at Tarashcha, two hundred and
    //   twenty kilometres off, and the page said "Resting place of".
    //   Stolin cited the article on the Karlin dynasty. Reb Asher I died in
    //   Karlin and no source gives his burial town, yet the page was titled
    //   "Kever of Rabbi Asher of Stolin".
    //
    // An off-subject source does not prove an error, but in both cases it was
    // the visible symptom of one. This flags the mismatch so somebody reads
    // the listing against its source; the allowlist below is for the honest
    // cases — a cemetery-level article, or a transliteration the check cannot
    // fold together.
    const ALLOWED = new Set([
      "ostroh-maharsha", // "Samuel Edels" is the Maharsha, spelled the English way
      "amuka-yonasan-ben-uziel", // "Jonathan ben Uzziel", same
      "har-hamenuchos-jerusalem", // an article about the cemetery, which holds many
      "essaouira-mogador-chaim-pinto",
      "marrakech-miaara",
      "worms-heiliger-sand",
      "yavne-rabban-gamliel", // the article is the building, venerated under two names — the page explains this
    ]);
    const fold = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
    const offenders: string[] = [];
    for (const cemetery of cemeteries) {
      if (!cemetery.burials.length || ALLOWED.has(cemetery.slug)) continue;
      const match = (cemetery.sourceUrl ?? "").match(/wikipedia\.org\/wiki\/(.+)$/);
      if (!match) continue;
      const subject = decodeURIComponent(match[1]).replace(/_/g, " ").replace(/\(.*\)/, "").trim();
      if (!/^[A-Z]/.test(subject)) continue;
      const words = subject.split(/\s+/).filter((word) => word.length > 3).map(fold);
      const haystack = fold([cemetery.name, ...cemetery.burials.map((b) => `${b.name} ${b.knownAs ?? ""}`)].join(" "));
      if (!words.some((word) => haystack.includes(word))) {
        offenders.push(`${cemetery.slug} cites "${subject}", who is not named on the page`);
      }
    }
    assert.deepEqual(offenders, []);
  });
});
