import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attractions } from "@/data/attractions";
import { kosherEateries } from "@/data/kosher-eateries";
import { kosherAreas, kosherStays } from "@/data/kosher-stays";
import { vacationDestinations } from "@/data/vacation-destinations";
import { readinessOf } from "@/lib/destination-readiness";
import { buildSeedRows } from "@/lib/seed-data";
import { searchEverything } from "@/lib/site-search";
import type { VacationSources } from "@/lib/vacation-ideas";

const SOURCES: VacationSources = {
  attractions,
  eateries: kosherEateries,
  areas: kosherAreas,
  stays: kosherStays,
};

const ATTRACTION_SLUGS = [
  "walt-disney-world-resort",
  "universal-orlando-resort",
  "seaworld-orlando",
  "gatorland",
  "orlando-science-center",
  "harry-p-leu-gardens",
] as const;
const AREA_SLUGS = ["orlando-sand-lake-road"] as const;
const STAY_SLUGS = ["orlando-sand-lake-road-stays"] as const;
const EATERY_SLUGS = ["kosher-grill-orlando", "krembo-orlando"] as const;

describe("Orlando's publishable destination batch", () => {
  it("answers every destination-readiness question from concrete listings", () => {
    const destination = vacationDestinations.find((item) => item.slug === "orlando");
    assert.ok(destination, "orlando destination is missing");
    assert.equal(readinessOf(destination, SOURCES).publishable, true, "orlando did not clear the publication bar");
  });

  it("uses official attraction, city, community and local-directory sources", () => {
    const entries = [
      ...ATTRACTION_SLUGS.map((slug) => attractions.find((item) => item.slug === slug)),
      ...AREA_SLUGS.map((slug) => kosherAreas.find((item) => item.slug === slug)),
      ...STAY_SLUGS.map((slug) => kosherStays.find((item) => item.slug === slug)),
      ...EATERY_SLUGS.map((slug) => kosherEateries.find((item) => item.slug === slug)),
    ];
    const trustedHosts = new Set([
      "disneyworld.disney.go.com",
      "www.universalorlando.com",
      "seaworld.com",
      "www.gatorland.com",
      "www.osc.org",
      "www.orlando.gov",
      "www.jewishorlando.com",
      "www.kosherorlando.org",
    ]);

    for (const entry of entries) {
      assert.ok(entry, "Orlando listing is missing");
      assert.ok(trustedHosts.has(new URL(entry.sourceUrl).hostname), `${entry.slug}: ${entry.sourceUrl}`);
    }
  });

  it("keeps individual food claims attributed to the local directory", () => {
    for (const slug of EATERY_SLUGS) {
      const entry = kosherEateries.find((item) => item.slug === slug);
      assert.equal(entry?.hechsher.state, "reported", slug);
      assert.match(entry?.hechsher.note ?? "", /RCF/i, slug);
      assert.match(entry?.hechsher.source ?? "", /Kosher Orlando/i, slug);
    }
  });

  it("feeds the existing database import for attraction, stay and area administration", () => {
    const rows = buildSeedRows();
    for (const slug of ATTRACTION_SLUGS) assert.ok(rows.attractions.some((row) => row.slug === slug), slug);
    for (const slug of STAY_SLUGS) assert.ok(rows.stays.some((row) => row.slug === slug), slug);
    for (const slug of AREA_SLUGS) assert.ok(rows.areas.some((row) => row.slug === slug), slug);
  });

  it("is discoverable through the public server-side search index", async () => {
    const centralFlorida = await searchEverything("Central Florida", 30);
    assert.ok(centralFlorida.some((hit) => hit.kind === "Vacation destination" && hit.title === "Orlando"));

    const orlando = await searchEverything("Orlando", 30);
    assert.ok(orlando.some((hit) => hit.kind === "Thing to do" && hit.title === "Universal Orlando Resort"));
    assert.ok(orlando.some((hit) => hit.kind === "Hotel or stay" && hit.title === "Staying near Chabad of South Orlando, West Sand Lake Road"));

    const krembo = await searchEverything("Krembo", 30);
    assert.ok(krembo.some((hit) => hit.kind === "Kosher food" && hit.title === "Krembo"));
  });
});
