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

const DESTINATION_SLUGS = ["miami-beach", "hollywood-hallandale"] as const;
const ATTRACTION_SLUGS = [
  "miami-beach-beachwalk",
  "miami-beach-holocaust-memorial",
  "miami-beach-botanical-garden",
  "hollywood-beach-broadwalk",
  "hollywood-artspark",
  "anne-kolb-nature-center",
] as const;
const AREA_SLUGS = ["miami-beach-41st-street", "hallandale-beach-chabad"] as const;
const STAY_SLUGS = ["miami-beach-41st-street-stays", "hallandale-beach-chabad-stays"] as const;
const EATERY_SLUGS = ["miami-beach-41st-street-kosher", "hollywood-stirling-road-kosher"] as const;

describe("South Florida's first publishable batch", () => {
  it("answers every destination-readiness question from concrete listings", () => {
    for (const slug of DESTINATION_SLUGS) {
      const destination = vacationDestinations.find((item) => item.slug === slug);
      assert.ok(destination, `${slug} destination is missing`);
      assert.equal(readinessOf(destination, SOURCES).publishable, true, `${slug} did not clear the publication bar`);
    }
  });

  it("uses only official government, attraction, community, or certifier sources", () => {
    const entries = [
      ...ATTRACTION_SLUGS.map((slug) => attractions.find((item) => item.slug === slug)),
      ...AREA_SLUGS.map((slug) => kosherAreas.find((item) => item.slug === slug)),
      ...STAY_SLUGS.map((slug) => kosherStays.find((item) => item.slug === slug)),
      ...EATERY_SLUGS.map((slug) => kosherEateries.find((item) => item.slug === slug)),
    ];
    const trustedHosts = new Set([
      "www.miamibeachfl.gov",
      "holocaustmemorialmiamibeach.org",
      "www.mbgarden.org",
      "www.hollywoodfl.org",
      "hollywoodfl.org",
      "www.broward.org",
      "www.lubavitch.com",
      "koshermiami.org",
      "www.orbkosher.com",
    ]);

    for (const entry of entries) {
      assert.ok(entry, "South Florida listing is missing");
      assert.ok(trustedHosts.has(new URL(entry.sourceUrl).hostname), `${entry.slug}: ${entry.sourceUrl}`);
    }
  });

  it("keeps the individual kosher claims tied to the official certifier", () => {
    for (const slug of EATERY_SLUGS) {
      const entry = kosherEateries.find((item) => item.slug === slug);
      assert.equal(entry?.hechsher.state, "reported", slug);
      assert.equal(entry?.hechsher.hechsherId, "orb-kosher", slug);
      assert.match(entry?.hechsher.source ?? "", /official/i, slug);
    }
  });

  it("feeds the existing database import for attraction, stay, and area administration", () => {
    const rows = buildSeedRows();
    for (const slug of ATTRACTION_SLUGS) assert.ok(rows.attractions.some((row) => row.slug === slug), slug);
    for (const slug of STAY_SLUGS) assert.ok(rows.stays.some((row) => row.slug === slug), slug);
    for (const slug of AREA_SLUGS) assert.ok(rows.areas.some((row) => row.slug === slug), slug);
  });

  it("is discoverable through the public server-side search index", async () => {
    const miami = await searchEverything("Miami Beach", 30);
    assert.ok(miami.some((hit) => hit.kind === "Vacation destination" && hit.title === "Miami Beach"));
    assert.ok(miami.some((hit) => hit.kind === "Thing to do" && hit.title === "Miami Beach Beachwalk"));
    assert.ok(miami.some((hit) => hit.kind === "Kosher food" && hit.title === "Certified food near 41st Street, Miami Beach"));

    const hollywood = await searchEverything("Hallandale", 30);
    assert.ok(hollywood.some((hit) => hit.kind === "Vacation destination" && hit.title === "Hollywood and Hallandale"));
    assert.ok(hollywood.some((hit) => hit.kind === "Hotel or stay" && hit.title === "Staying near Chabad of South Broward, Hallandale Beach"));
  });
});
