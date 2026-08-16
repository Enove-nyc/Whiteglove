import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { destinations as heritageDestinations, guidedDestinations } from "@/data/destinations";
import { NAV_CATEGORIES } from "@/lib/navigation";
import { heritageAsAttractions } from "@/lib/heritage-attractions";

/**
 * Heritage stopped being a fourth thing this site is about, at the owner's
 * word: not renamed, not moved down the bar — merged into an existing part
 * of the site rather than given a new section of its own.
 *
 * CORRECTED ONCE ALREADY. The first reading put heritage towns in a new
 * "Heritage journeys" block on /destinations, grouped by country. The
 * owner's actual intent was narrower: heritage belongs under Attractions
 * (/things-to-do), filterable by "Jewish heritage" — a category that
 * already existed there for 35 hand-picked entries in data/attractions.ts.
 * This file was rewritten along with the code once that correction landed.
 */

const THINGS_TO_DO = readFileSync("app/things-to-do/page.tsx", "utf8");
const DESTINATIONS_HUB = readFileSync("app/destinations/(hub)/page.tsx", "utf8");

describe("heritage has no top-level category of its own", () => {
  it("is not a NAV_CATEGORIES label", () => {
    for (const category of NAV_CATEGORIES) {
      assert.doesNotMatch(category.label, /heritage/i, category.label);
    }
  });

  it("puts kevarim and cemeteries under Kosher, not a Heritage category", () => {
    const kosher = NAV_CATEGORIES.find((category) => category.label === "Kosher");
    assert.ok(kosher);
    assert.ok(kosher.links.some((link) => link.href === "/tzaddikim"));
    assert.ok(kosher.links.some((link) => link.href === "/cemeteries"));
  });
});

describe("heritage joins the existing Attractions filter, not a new section", () => {
  it("things-to-do merges heritage into the same list AttractionDirectory renders", () => {
    assert.match(THINGS_TO_DO, /heritageAsAttractions/);
    assert.match(THINGS_TO_DO, /getAttractionList\(\)[\s\S]*?\.\.\.heritageAsAttractions\(\)/);
  });

  it("does NOT have its own heritage section on the destinations hub", () => {
    assert.doesNotMatch(DESTINATIONS_HUB, /Heritage journeys/i);
    assert.doesNotMatch(DESTINATIONS_HUB, /heritageByCountry/);
  });

  it("every mapped entry uses the category that already existed for this", () => {
    const mapped = heritageAsAttractions();
    assert.ok(mapped.length > 0, "no heritage destination has a real source to publish with");
    for (const entry of mapped) {
      assert.equal(entry.kind, "Jewish heritage");
    }
  });

  it("only publishes destinations with a real source, same rule as every other public listing", () => {
    const mapped = heritageAsAttractions();
    const guided = guidedDestinations().filter((d) => d.guide.sourceUrl);
    assert.equal(mapped.length, guided.length);
    for (const entry of mapped) assert.ok(entry.sourceUrl, entry.name);
  });

  it("links to the town's own guide, not the grave's coordinates", () => {
    const mapped = heritageAsAttractions();
    for (const entry of mapped) {
      assert.ok(entry.internalHref, entry.name);
      assert.match(entry.internalHref!, /^\//);
    }
  });
});

describe("existing heritage pages stay reachable", () => {
  it("every heritage destination resolves to a real, distinct address", () => {
    assert.ok(heritageDestinations.length > 0);
    const slugs = new Set<string>();
    for (const place of heritageDestinations) {
      assert.match(place.city, /\S/, place.slug);
      slugs.add(place.slug);
    }
    assert.equal(slugs.size, heritageDestinations.length, "two heritage destinations share a slug");
  });
});

describe("heritage town pages point back at Destinations", () => {
  it("breadcrumbs to /destinations, still a real destination even though it's found via Attractions", () => {
    for (const file of ["app/[city]/page.tsx", "app/heritage/towns/[place]/page.tsx", "app/stops/page.tsx"]) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /name: "Destinations", path: "\/destinations"/, file);
    }
  });
});
