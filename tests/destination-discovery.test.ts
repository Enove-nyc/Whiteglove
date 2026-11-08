import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { attractions } from "@/data/attractions";
import { expandedAttractions } from "@/data/expanded-attractions";
import { discoveryPhotos } from "@/data/discovery-photos.generated";
import { vacationDestinations } from "@/data/vacation-destinations";
import { searchAttractionList, attractionFacets } from "@/data/attraction-list";
import { geographicSearchDocuments } from "@/lib/geographic-search";
import { geographicKey, sameCountry } from "@/lib/destination-geography";
import { photoForAttraction, photoForVacation } from "@/lib/discovery-photos";
import { searchSite } from "@/lib/site-search";
import { GET } from "@/app/api/search/route";

describe("country and city discovery", () => {
  it("offers a real filtered country door and preserves a full city guide", async () => {
    for (const country of ["Italy", "Japan", "Canada", "South Korea", "Malta"]) {
      const response = await searchSite(country, 10);
      const hit = response.results.find((r) => r.id.startsWith("country-") && r.title === country);
      assert.ok(hit, country);
      const url = new URL(hit.href, "https://example.test");
      assert.equal(url.pathname, "/things-to-do");
      assert.equal(url.searchParams.get("country"), country);
      assert.ok(searchAttractionList(attractions, { country }).rows.length);
    }
    assert.equal((await searchSite("Rome", 10)).results[0].href, "/destinations/rome");
  });

  it("finds common country names and cities without a full vacation guide", async () => {
    for (const [query, expected] of [["USA", "United States"], ["UK", "United Kingdom"], ["Czech Republic", "Czechia"], ["UAE", "United Arab Emirates"]]) {
      const response = await searchSite(query, 12);
      assert.ok(response.results.some((r) => r.id.startsWith("country-") && r.title === expected), query);
    }
    for (const city of ["Seoul", "Valletta", "Taipei", "Luxembourg City"]) {
      const response = await searchSite(city, 12);
      const hit = response.results.find((r) => r.id.startsWith("city-") && r.title === city);
      assert.ok(hit, city);
      assert.equal(new URL(hit.href, "https://example.test").searchParams.get("city"), city);
    }
  });

  it("matches accents, alternate country names and multi-word city/country filters", () => {
    for (const [country, city] of [["Czech Republic", "Prague"], ["Italy", "Rome"], ["Poland", "Krakow"]]) {
      const result = searchAttractionList(attractions, { country, city });
      assert.ok(result.rows.length, `${country}/${city}`);
      assert.ok(result.rows.every((r) => sameCountry(r.country, country) && geographicKey(r.city) === geographicKey(city)));
    }
    assert.ok(searchAttractionList(attractions, { query: "USA" }).rows.length);
    const facets = attractionFacets(attractions);
    assert.ok(facets.countries.includes("Czechia"));
    assert.ok(!facets.countries.includes("Czech Republic"));
  });

  it("keeps country/city browse results within the published input and deduplicates guides", () => {
    const docs = geographicSearchDocuments([{ city: "Rome", country: "Italy" }, { city: "Rome", country: "Italy" }, { city: "", country: "Nowhere" }], [{ name: "Rome", cities: ["Rome"], country: "Italy" }]);
    assert.deepEqual(docs.map((d) => d.id), ["country-italy"]);
  });

  it("does not accidentally cap an ordinary search at one result when limit is absent", async () => {
    for (const suffix of ["", "&limit=", "&limit=invalid"]) {
      const response = await GET(new NextRequest(`https://example.test/api/search?q=Italy${suffix}`));
      const data = await response.json();
      assert.ok(data.results.length > 1);
      assert.ok(data.results.length <= 10);
    }
  });
});

describe("licensed real place photos and checked additions", () => {
  it("ships source-backed additions with unique identifiers and coordinates", () => {
    assert.ok(expandedAttractions.length >= 70);
    assert.equal(new Set(attractions.map((a) => a.slug)).size, attractions.length);
    for (const place of expandedAttractions) {
      assert.ok(place.summary && place.sourceUrl.startsWith("https://en.wikipedia.org/"));
      assert.ok(place.coordinates?.split(",").map(Number).every(Number.isFinite));
      assert.ok(photoForAttraction(place), `Missing real picture for ${place.name}`);
    }
    for (const place of attractions.filter((a) => a.country === "Iceland")) {
      if (place.coordinates) assert.ok(Number(place.coordinates.split(",")[1]) < 0, place.name);
    }
  });

  it("replaces all built-in vacation defaults with a photo of the place or its named city", () => {
    for (const destination of vacationDestinations) assert.ok(photoForVacation(destination), destination.name);
    const exact = attractions.find((a) => discoveryPhotos.attraction[a.slug]);
    assert.ok(exact);
    assert.equal(photoForAttraction(exact)?.context, undefined);
    const contextual = attractions.find((a) => !discoveryPhotos.attraction[a.slug] && photoForAttraction(a));
    assert.ok(contextual);
    assert.ok(photoForAttraction(contextual)?.context?.includes(contextual.city));
  });

  it("has a complete license register and content-hashed local WebP for every public image", () => {
    const checked = new Set<string>();
    for (const group of [discoveryPhotos.attraction, discoveryPhotos.city, discoveryPhotos.vacation]) {
      for (const photo of Object.values(group)) {
        const credit = discoveryPhotos.credits[photo.creditId];
        assert.ok(credit?.author && credit.title && credit.changes);
        assert.match(credit.license, /^(CC0|Public domain|CC BY(?:-SA)? (?:[1-4]\.0|2\.5)(?: [a-z]{2})?)$/);
        assert.ok(credit.licenseUrl.startsWith("https://creativecommons.org/"));
        assert.ok(credit.sourcePage.startsWith("https://commons.wikimedia.org/wiki/"));
        assert.match(photo.src, /^\/photos\/discovery\/[a-f0-9]{64}\.webp$/);
        assert.ok(photo.width <= 640 && photo.height <= 480);
        if (checked.has(photo.src)) continue;
        checked.add(photo.src);
        const bytes = readFileSync(`public${photo.src}`);
        assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
        assert.equal(createHash("sha256").update(bytes).digest("hex"), photo.src.split("/").at(-1)?.replace(".webp", ""));
      }
    }
    assert.ok(checked.size > 500);
  });
});
