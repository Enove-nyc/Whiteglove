import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { findPlaces, timeZoneAt } from "@/lib/place-lookup";

/**
 * The geocoder is stubbed rather than called. OpenStreetMap's answers are not
 * ours to depend on in a test suite, and their terms do not want a build
 * spending requests on them.
 */
let server: Server;
let lastQuery: URLSearchParams | null = null;
let reply: unknown = [];
let status = 200;

before(async () => {
  server = createServer((request, response) => {
    lastQuery = new URL(request.url ?? "", "http://localhost").searchParams;
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(reply));
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  process.env.NOMINATIM_URL = `http://127.0.0.1:${port}/search`;
});

after(() => server.close());

const BOROUGH_PARK = {
  place_id: 1,
  lat: "40.6339",
  lon: "-73.9962",
  name: "Borough Park",
  display_name: "Borough Park, Brooklyn, Kings County, New York, 11219, United States",
  address: { suburb: "Borough Park", city: "Brooklyn", state: "New York", country: "United States", country_code: "us" },
};

const VILNIUS = {
  place_id: 2,
  lat: "54.6887",
  lon: "25.4224",
  name: "11219",
  display_name: "11219, Naujosios Vilnios, Vilnius, Lietuva",
  address: { postcode: "11219", city: "Vilnius", country: "Lithuania", country_code: "lt" },
};

describe("looking a place up for zmanim", () => {
  it("hands back every match with its country, rather than picking one", async () => {
    // A postcode belongs to more than one country, and the geocoder offers
    // Vilnius first. Choosing here would hand Boro Park Lithuanian times.
    reply = [VILNIUS, BOROUGH_PARK];
    const found = await findPlaces("11219");
    assert.equal(found.length, 2);
    assert.deepEqual(
      found.map((place) => place.country),
      ["Lithuania", "United States"],
    );
  });

  it("puts a real timezone on each, from the coordinates and not the country", async () => {
    reply = [BOROUGH_PARK, VILNIUS];
    const found = await findPlaces("11219");
    assert.equal(found[0]!.timeZoneId, "America/New_York");
    assert.equal(found[1]!.timeZoneId, "Europe/Vilnius");
  });

  it("shortens the name to what somebody scanning a list can read", async () => {
    reply = [BOROUGH_PARK];
    const [place] = await findPlaces("borough park");
    // Not "Borough Park, Brooklyn, Kings County, New York, 11219, United States".
    assert.equal(place!.name, "Borough Park, Brooklyn, New York");
  });

  it("does not say the same word twice when the postcode names the place", async () => {
    reply = [{ ...VILNIUS, name: "Vilnius", address: { ...VILNIUS.address, city: "Vilnius" } }];
    const [place] = await findPlaces("vilnius");
    assert.equal(place!.name, "Vilnius");
  });

  it("asks for English names, so Bnei Brak does not come back in Hebrew", async () => {
    reply = [BOROUGH_PARK];
    await findPlaces("bnei brak");
    assert.equal(lastQuery?.get("accept-language"), "en");
  });

  it("collapses the three Antwerps the geocoder offers into one answer", async () => {
    const antwerp = {
      lat: "51.2211",
      lon: "4.3997",
      name: "Antwerpen",
      address: { city: "Antwerpen", state: "Flanders", country: "Belgium" },
    };
    reply = [
      { ...antwerp, place_id: 10 },
      { ...antwerp, place_id: 11, lat: "51.2477", lon: "4.7766" },
      { ...antwerp, place_id: 12, lat: "51.2770", lon: "4.5443" },
    ];
    const found = await findPlaces("antwerpen");
    assert.equal(found.length, 1);
  });

  it("spends no request on a query too short to answer", async () => {
    lastQuery = null;
    assert.deepEqual(await findPlaces("br"), []);
    assert.equal(lastQuery, null, "nothing was asked");
  });

  it("comes back empty rather than throwing when the geocoder is down", async () => {
    status = 503;
    reply = { error: "nope" };
    assert.deepEqual(await findPlaces("borough park"), []);
    status = 200;
  });

  it("survives an answer that is not the shape it expects", async () => {
    reply = { unexpected: true };
    assert.deepEqual(await findPlaces("borough park"), []);
    reply = [{ lat: "not a number", lon: "also not" }];
    assert.deepEqual(await findPlaces("borough park"), []);
  });
});

describe("the timezone for coordinates somebody typed", () => {
  it("answers offline, and correctly where a country would not", () => {
    assert.equal(timeZoneAt(40.6323, -73.9928), "America/New_York");
    assert.equal(timeZoneAt(34.0522, -118.2437), "America/Los_Angeles");
    assert.equal(timeZoneAt(31.7683, 35.2137), "Asia/Jerusalem");
    assert.equal(timeZoneAt(-37.8136, 144.9631), "Australia/Melbourne");
  });

  it("says nothing rather than guessing for a point with no zone", () => {
    assert.equal(timeZoneAt(Number.NaN, 0), null);
  });
});
