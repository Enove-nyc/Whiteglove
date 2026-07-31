import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { breadcrumbs, cemeteryPlace, collectionPage, touristAttraction } from "@/lib/structured-data";

// Every page used to share one title and one description, so a search result
// for Uman and one for Lizhensk were indistinguishable and neither said what
// the page was. The structured data is the machine-readable half of the fix,
// and the thing that matters about it is that it never claims more than the
// page actually contains.

const ENV = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  if (ENV === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ENV;
});

describe("breadcrumbs", () => {
  it("numbers the trail from one", () => {
    const data = breadcrumbs([
      { name: "Home", path: "/" },
      { name: "Cemeteries", path: "/cemeteries" },
      { name: "Lizhensk", path: "/cemeteries/lizhensk" },
    ]) as { itemListElement: Array<{ position: number; name: string }> };
    assert.deepEqual(data.itemListElement.map((c) => c.position), [1, 2, 3]);
    assert.equal(data.itemListElement[2].name, "Lizhensk");
  });
});

describe("a place", () => {
  it("carries coordinates when the page has them", () => {
    const data = touristAttraction({
      name: "Lizhensk",
      description: "…",
      path: "/lizensk",
      coordinates: "50.251139, 22.422611",
    }) as { geo?: { latitude: number; longitude: number } };
    assert.equal(data.geo?.latitude, 50.251139);
    assert.equal(data.geo?.longitude, 22.422611);
  });

  it("omits coordinates rather than inventing them", () => {
    // Marking up a location the page does not actually have is how a site
    // gets its rich results taken away.
    for (const coordinates of [undefined, null, "", "somewhere near the river", "50.25"]) {
      const data = touristAttraction({ name: "X", description: "…", path: "/x", coordinates }) as { geo?: unknown };
      assert.equal(data.geo, undefined, `${JSON.stringify(coordinates)} should not produce a geo block`);
    }
  });

  it("keeps the Yiddish name as an alternate, and drops empty ones", () => {
    const data = touristAttraction({
      name: "Lizhensk",
      description: "…",
      path: "/lizensk",
      alternateNames: ["ליזענסק", undefined, "  ", "Leżajsk"],
    }) as { alternateName?: string[] };
    assert.deepEqual(data.alternateName, ["ליזענסק", "Leżajsk"]);
  });

  it("calls a beis hachaim a cemetery, not an attraction", () => {
    const data = cemeteryPlace({ name: "Lizhensk Jewish Cemetery", description: "…", path: "/cemeteries/lizhensk" }) as { "@type": string };
    assert.equal(data["@type"], "Cemetery");
  });
});

describe("absolute URLs", () => {
  it("uses the site's own address when it has one", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://whitegloveitineraries.com";
    const data = collectionPage({ name: "Cemeteries", description: "…", path: "/cemeteries" }) as { url: string };
    assert.equal(data.url, "https://whitegloveitineraries.com/cemeteries");
  });

  it("falls back to the path rather than to a wrong domain", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
    const data = collectionPage({ name: "Cemeteries", description: "…", path: "/cemeteries" }) as { url: string };
    assert.equal(data.url, "/cemeteries");
  });
});

describe("a directory", () => {
  it("says how many things it lists", () => {
    const data = collectionPage({ name: "Destinations", description: "…", path: "/stops", count: 297 }) as { mainEntity?: { numberOfItems: number } };
    assert.equal(data.mainEntity?.numberOfItems, 297);
  });

  it("leaves the count out when there isn't one, rather than claiming zero", () => {
    const data = collectionPage({ name: "Destinations", description: "…", path: "/stops" }) as { mainEntity?: unknown };
    assert.equal(data.mainEntity, undefined);
  });
});
