import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { destinations as heritageDestinations } from "@/data/destinations";
import { NAV_CATEGORIES } from "@/lib/navigation";

/**
 * Heritage stopped being a fourth thing this site is about, at the owner's
 * word: not renamed, not moved down the bar — merged into the same
 * destination directory everything else lives in.
 *
 * WHAT "MERGED" MEANS HERE, CONCRETELY. Heritage towns render on the same
 * page as vacation destinations (/destinations), reachable through the same
 * "Destinations" door in the header, with the same breadcrumb root. It does
 * NOT mean 123 heritage towns became 123 photo cards in the vacation grid —
 * they have no photographs, and pretending otherwise would be inventing
 * content. /stops carries the full searchable version of the same list.
 */

const HUB = readFileSync("app/destinations/(hub)/page.tsx", "utf8");

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

describe("heritage renders on the same page as vacation destinations", () => {
  it("reads the heritage destination list on /destinations", () => {
    assert.match(HUB, /from "@\/data\/destinations"/);
    assert.match(HUB, /heritageDestinations/);
  });

  it("has a real heritage section, not a link out to somewhere else", () => {
    assert.match(HUB, /Heritage journeys/);
    assert.match(HUB, /heritageByCountry/);
  });

  it("still points at the full searchable directory for the long list", () => {
    assert.match(HUB, /href="\/stops"/);
  });
});

describe("existing heritage pages stay reachable", () => {
  it("every heritage destination resolves to a real, distinct address", () => {
    assert.ok(heritageDestinations.length > 0);
    const hrefs = new Set<string>();
    for (const place of heritageDestinations) {
      assert.match(place.city, /\S/, place.slug);
      hrefs.add(place.slug);
    }
    assert.equal(hrefs.size, heritageDestinations.length, "two heritage destinations share a slug");
  });
});

describe("heritage town pages point back at Destinations, not a removed category", () => {
  it("breadcrumbs to /destinations rather than /heritage or /stops", () => {
    for (const file of ["app/[city]/page.tsx", "app/heritage/towns/[place]/page.tsx", "app/stops/page.tsx"]) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /name: "Destinations", path: "\/destinations"/, file);
    }
  });
});
