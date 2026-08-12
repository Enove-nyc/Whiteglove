import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  explainDuffelStaysError,
  mapStayResults,
  parseCoordinates,
  staysSearchBody,
  validateStaySearchInput,
} from "@/lib/duffel-stays";

/**
 * Admin Duffel Stays search. The public site must never call this API.
 */

describe("stay search limits Duffel publishes", () => {
  const today = "2026-08-12";

  it("accepts a short stay inside the window", () => {
    const out = validateStaySearchInput(
      { checkInDate: "2026-09-01", checkOutDate: "2026-09-04", rooms: 1, guests: 2 },
      today,
    );
    assert.equal(out.ok, true);
    if (out.ok) {
      assert.equal(out.rooms, 1);
      assert.equal(out.guests, 2);
    }
  });

  it("refuses check-in more than 330 days out", () => {
    const out = validateStaySearchInput(
      { checkInDate: "2027-07-09", checkOutDate: "2027-07-12", rooms: 1, guests: 1 },
      today,
    );
    assert.equal(out.ok, false);
    if (!out.ok) assert.match(out.message, /330 days/);
  });

  it("refuses a stay longer than 99 nights", () => {
    const out = validateStaySearchInput(
      { checkInDate: "2026-09-01", checkOutDate: "2027-01-01", rooms: 1, guests: 1 },
      today,
    );
    assert.equal(out.ok, false);
    if (!out.ok) assert.match(out.message, /99 nights/);
  });

  it("refuses fewer adults than rooms", () => {
    const out = validateStaySearchInput(
      { checkInDate: "2026-09-01", checkOutDate: "2026-09-03", rooms: 3, guests: 2 },
      today,
    );
    assert.equal(out.ok, false);
    if (!out.ok) assert.match(out.message, /one adult guest per room/);
  });

  it("does not treat empty coordinates as the Gulf of Guinea", () => {
    assert.equal(parseCoordinates(null, null), null);
    assert.equal(parseCoordinates("", ""), null);
    assert.equal(parseCoordinates(40.72, -74.0)?.latitude, 40.72);
  });
});

describe("the official stays/search body", () => {
  it("searches by location and never sends accommodation at the same time", () => {
    const body = staysSearchBody({
      checkInDate: "2026-09-01",
      checkOutDate: "2026-09-04",
      rooms: 1,
      guests: 2,
      latitude: 51.5071,
      longitude: -0.1416,
    });
    const json = JSON.stringify(body);
    assert.equal("accommodation" in body.data, false);
    assert.doesNotMatch(json, /"accommodation"/);
    assert.equal(body.data.location.geographic_coordinates.latitude, 51.5071);
    assert.equal(body.data.guests.length, 2);
    assert.deepEqual(body.data.guests[0], { type: "adult" });
    assert.equal(body.data.rooms, 1);
  });
});

describe("what is shown from a search result", () => {
  it("uses cheapest_rate_total_amount and the nested address", () => {
    const hotels = mapStayResults([
      {
        id: "srr_1",
        cheapest_rate_total_amount: "799.00",
        cheapest_rate_currency: "GBP",
        cheapest_rate_public_amount: "899.00",
        accommodation: {
          name: "Duffel Test Hotel",
          rating: 3,
          photos: [{ url: "https://assets.duffel.com/img/stays/image.jpg" }],
          location: {
            address: { line_one: "100 Clifton Street", city_name: "London", country_code: "GB" },
          },
        },
      },
    ]);
    assert.equal(hotels.length, 1);
    assert.equal(hotels[0].totalAmount, "799.00");
    assert.equal(hotels[0].totalCurrency, "GBP");
    assert.match(hotels[0].address, /100 Clifton Street/);
    assert.match(hotels[0].address, /London/);
    assert.equal(hotels[0].photo, "https://assets.duffel.com/img/stays/image.jpg");
  });
});

describe("Duffel Stays errors reach the admin", () => {
  it("says Stays is not enabled on a 403, and keeps Duffel's own words", () => {
    const out = explainDuffelStaysError(
      403,
      JSON.stringify({
        errors: [
          {
            code: "insufficient_permissions",
            type: "authentication_error",
            title: "Insufficient permissions",
            message: "The token attached to this request does not have sufficient permissions to perform this action",
          },
        ],
      }),
    );
    assert.match(out.message, /Stays is not enabled/);
    assert.match(out.detail!, /Insufficient permissions/);
    assert.match(out.detail!, /will not invent hotels/);
  });

  it("passes a validation error through rather than inventing hotels", () => {
    const out = explainDuffelStaysError(
      422,
      JSON.stringify({
        errors: [{ code: "stay_too_long", type: "validation_error", title: "Stay too long", message: "The stay duration exceeds the maximum allowed length (99 nights)" }],
      }),
    );
    assert.match(out.message, /99 nights/);
    assert.match(out.detail!, /Stay too long/);
  });
});

describe("the admin wire-up and the public site", () => {
  it("calls POST /stays/search with official v2 headers, behind the admin guard", () => {
    const route = readFileSync("app/api/hotels/search/route.ts", "utf8");
    assert.match(route, /duffelRefusal\(request\)/);
    assert.match(route, /duffelBearer\(\)/);
    assert.match(route, /DUFFEL_STAYS_SEARCH_URL/);
    assert.match(route, /duffelApiHeaders/);
    assert.doesNotMatch(route, /getCityGuide|graveCoordinates/);
    const headers = readFileSync("lib/duffel-api.ts", "utf8");
    assert.match(headers, /Duffel-Version/);
    assert.match(headers, /v2/);
    assert.match(headers, /Accept-Encoding/);
    assert.match(headers, /gzip/);
    assert.match(headers, /Bearer/);
  });

  it("puts city search on the admin Duffel screen, not a heritage-town list", () => {
    const tools = readFileSync("components/AdminDuffelTools.tsx", "utf8");
    assert.match(tools, /AdminDuffelStays/);
    const stays = readFileSync("components/AdminDuffelStays.tsx", "utf8");
    assert.match(stays, /City or place/);
    assert.match(stays, /\/api\/hotels\/search/);
    assert.doesNotMatch(stays, /lizhensk|White Glove destination/);
  });

  it("keeps Duffel off public pages", () => {
    const files = walk("app").filter((file) => !file.includes(`${join("app", "admin")}`) && !file.includes(`${join("app", "api")}`));
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /AdminDuffelStays/, file);
      assert.doesNotMatch(source, /\/api\/hotels\/search/, file);
      assert.doesNotMatch(source, /@duffel/, file);
    }
    const partners = readFileSync("components/BookPartners.tsx", "utf8");
    assert.doesNotMatch(partners, /AdminDuffelStays|\/api\/hotels\/search|@duffel/);
  });
});

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts)$/.test(entry)) acc.push(full);
  }
  return acc;
}
