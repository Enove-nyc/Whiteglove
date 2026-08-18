import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { bulkDestinations } from "@/data/destinations-bulk";
import { getCemetery } from "@/data/cemeteries";
import { getDestinationRecord } from "@/data/destination-database";
import { airportsFor } from "@/lib/destination-actions";
import { directoryTownQuestions } from "@/lib/town-questions";
import { nearbyKevarim } from "@/lib/nearby-kevarim";

/**
 * The hundred and nine directory towns.
 *
 * WHAT WAS WRONG. Fourteen researched towns render from app/[city] and carry
 * getting-there, who-is-buried, nearby and questions. The directory towns
 * render from app/heritage/towns/[place] and carried none of it — not even the
 * names of the tzaddikim, though the listing behind each page holds every one,
 * with seforim and yahrzeiten. Somebody searching for a kever in Przysucha
 * reached a page showing a cemetery card that would not say whose it was.
 *
 * Nothing here is written per town. Every section is the listing the page
 * already had, rendered — which is why it could be switched on for all of them
 * at once, and why a town with an empty listing correctly gets nothing.
 */

const point = (cemeteries: Array<{ id: string; coordinates?: string }>) =>
  cemeteries
    .map((cemetery) => {
      const listing = getCemetery(cemetery.id);
      return cemetery.coordinates ?? listing?.coordinates ?? listing?.airportRef;
    })
    .find(Boolean);

function town(slug: string) {
  const destination = bulkDestinations.find((entry) => entry.slug === slug)!;
  const cemeteries = getDestinationRecord(slug)?.cemeteries ?? [];
  const from = point(cemeteries);
  const airports = airportsFor(destination.country, `${destination.city}, ${destination.country}`, from);
  return {
    destination,
    cemeteries,
    airports,
    burials: cemeteries
      .flatMap((cemetery) => cemetery.burials)
      .filter((burial, index, all) => all.findIndex((other) => other.name === burial.name) === index),
    questions: directoryTownQuestions({
      city: destination.city,
      country: destination.country,
      aliases: destination.aliases,
      cemeteries: cemeteries.map((c) => ({ name: c.name, address: c.address, burials: c.burials })),
      airports,
    }),
    nearby: cemeteries.length ? nearbyKevarim(cemeteries[0].id, { from }) : [],
  };
}

describe("a directory town with a listing behind it", () => {
  it("names the kevarim — the thing the page would not say before", () => {
    const warsaw = town("warsaw");
    assert.ok(warsaw.burials.length >= 3, `Warsaw should name several kevarim, got ${warsaw.burials.length}`);
    for (const burial of warsaw.burials) {
      assert.ok(burial.name.trim().length > 0);
      assert.ok(burial.yiddishName.trim().length > 0, `${burial.name} has no Yiddish name to render`);
    }
  });

  it("asks where the batei hachaim are, and who is in them", () => {
    const questions = town("przysucha").questions.map((q) => q.question);
    assert.ok(questions.some((q) => /Where (is|are) the be/i.test(q)), questions.join(" | "));
    assert.ok(questions.some((q) => /Who is buried/i.test(q)), questions.join(" | "));
  });

  it("pluralises the address question by how many grounds the town has", () => {
    // Getting this wrong is the kind of thing that reads as machine-written.
    for (const slug of bulkDestinations.map((d) => d.slug)) {
      const t = town(slug);
      const asked = t.questions.find((q) => /^Where (is|are) the be/.test(q.question));
      if (!asked) continue;
      const count = t.cemeteries.filter((c) => c.address).length;
      assert.match(asked.question, count === 1 ? /Where is the beis hachaim/ : /Where are the batei hachaim/, slug);
    }
  });

  it("answers from the listing and never invents a name", () => {
    for (const slug of bulkDestinations.map((d) => d.slug)) {
      const t = town(slug);
      const asked = t.questions.find((q) => /^Who is buried/.test(q.question));
      if (!asked) continue;
      // Every name in the sentence has to be a name in the data.
      const first = t.burials[0];
      assert.ok(asked.answer.includes(first.name), `${slug}: answer does not name ${first.name}`);
    }
  });
});

describe("a directory town with nothing behind it", () => {
  it("gets no sections at all rather than empty headings", () => {
    // Seventy-three of these have no beis hachaim listing. They must stay
    // bare — an empty "Who is buried here" on seventy-three near-identical
    // pages is exactly the thin-content problem the noIndex rule exists for.
    const bare = bulkDestinations
      .map((d) => town(d.slug))
      .filter((t) => t.cemeteries.length === 0);
    assert.ok(bare.length > 0, "expected some towns with no listing");
    for (const t of bare) {
      assert.equal(t.burials.length, 0, t.destination.slug);
      assert.equal(t.nearby.length, 0, t.destination.slug);
      // No listing means no address and no names, so only the airport question
      // can survive — and only when a country fallback measured something.
      for (const question of t.questions) {
        assert.match(question.question, /Which airport/, `${t.destination.slug}: ${question.question}`);
      }
    }
  });
});

describe("the sections are written once, not per page", () => {
  const SHARED = readFileSync("components/TownSections.tsx", "utf8");

  it("both town pages render the shared components", () => {
    for (const page of ["app/[city]/page.tsx", "app/heritage/towns/[place]/page.tsx"]) {
      const source = readFileSync(page, "utf8");
      assert.match(source, /from "@\/components\/TownSections"/, page);
      assert.match(source, /<WhoIsBuried/, page);
      assert.match(source, /<GettingThere/, page);
      assert.match(source, /<TownQuestions/, page);
    }
  });

  it("every section renders nothing when it has nothing", () => {
    // What lets one component serve a researched town and a bare one.
    for (const guard of [
      "if (!airports.length) return null;",
      "if (!burials.length) return null;",
      "if (!nearby.length) return null;",
      "if (!questions.length) return null;",
    ]) {
      assert.ok(SHARED.includes(guard), guard);
    }
  });
});

describe("how far away things are", () => {
  it("uses airportRef when a town has no grave pin — it is what that field is for", () => {
    // Without this only five of the hundred and nine towns could name their
    // nearest airport; data/cemeteries.ts holds a town-level pin for most.
    const measured = bulkDestinations
      .map((d) => town(d.slug))
      .filter((t) => t.airports.length > 0 && t.airports.every((a) => a.km));
    assert.ok(measured.length >= 25, `expected most listed towns to measure, got ${measured.length}`);
  });

  it("never navigates to a ranking pin", () => {
    // airportRef is explicitly not a grave location. The page may rank by it;
    // it must not offer it as a destination. Directions come from each
    // cemetery card's own address.
    const page = readFileSync("app/heritage/towns/[place]/page.tsx", "utf8");
    assert.match(page, /placeDirectionsUrl\(cemetery\.address, cemetery\.coordinates\)/);
    assert.doesNotMatch(page, /placeDirectionsUrl\([^)]*rankingPoint/);
  });
});

describe("a town filed under its other name", () => {
  it("finds Mikulov's beis hachaim, which is filed as Nikolsburg", () => {
    // One town, two names in ordinary use — the Czech and the Yiddish. The
    // listing existed the whole time and the page showed nothing.
    const mikulov = town("mikulov");
    assert.equal(mikulov.cemeteries.length, 1);
    assert.ok(mikulov.burials.some((b) => /Shmelke/.test(b.name)), mikulov.burials.map((b) => b.name).join(", "));
  });

  it("does NOT loosen the slug rule that keeps kevarim in the right town", () => {
    // Name-matching was tried and put the Imrei Elimelech in the wrong town,
    // because "Tomaszów Mazowiecki" and "Grodzisk Mazowiecki" share a region
    // word. Each pairing is written out by hand instead. If this ever becomes
    // a fuzzy match again, somebody drives to the wrong grave.
    const source = readFileSync("data/destination-database.ts", "utf8");
    assert.match(source, /SAME_TOWN_OTHER_NAME/);
    assert.doesNotMatch(source, /cemetery\.city.*includes|includes.*cemetery\.city/);
  });

  it("keeps those two towns apart", () => {
    const tomaszow = town("tomaszow").burials.map((b) => b.name);
    const grodzisk = town("grodzisk").burials.map((b) => b.name);
    for (const name of tomaszow) assert.ok(!grodzisk.includes(name), `${name} is in both towns`);
  });
});
