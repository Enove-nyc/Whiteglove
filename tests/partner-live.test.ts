import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { partnerLiveCapabilities } from "@/lib/partner-live";
import { stay22ApiConfigured } from "@/lib/stay22-api";
import { travelpayoutsTokenConfigured } from "@/lib/travelpayouts-api";
import { readFileSync } from "node:fs";

describe("partner live capabilities", () => {
  it("never invents a live car inventory flag", () => {
    const caps = partnerLiveCapabilities();
    assert.equal(caps.cars, false);
  });

  it("reflects whether server tokens are present without reading their values into the API shape", () => {
    const caps = partnerLiveCapabilities();
    assert.equal(caps.hotels, stay22ApiConfigured());
    assert.equal(caps.flights, travelpayoutsTokenConfigured());
  });
});

describe("live partner search wiring", () => {
  it("keeps hotel live search on Stay22 and flights on the partner search helper", () => {
    const hotels = readFileSync("app/api/partners/hotels/search/route.ts", "utf8");
    const flights = readFileSync("app/api/partners/flights/search/route.ts", "utf8");
    assert.match(hotels, /searchStay22Accommodations/);
    assert.match(flights, /searchPartnerFlights/);
    const helper = readFileSync("lib/partner-flights.ts", "utf8");
    assert.match(helper, /searchTravelpayoutsFlights/);
    assert.match(helper, /Stay22's Direct Travel API is accommodations only/);
    assert.doesNotMatch(helper, /bookHref:\s*compareHref\(search, flight/);
    assert.match(helper, /liveRowFromFare/);
    const cars = readFileSync("app/api/partners/cars/search/route.ts", "utf8");
    assert.match(cars, /searchPartnerCars/);
    assert.doesNotMatch(hotels, /DUFFEL/);
    assert.doesNotMatch(flights, /DUFFEL/);
    assert.doesNotMatch(cars, /DUFFEL/);
  });

  it("documents the env names the owner must set", () => {
    const stay = readFileSync("lib/stay22-api.ts", "utf8");
    const tp = readFileSync("lib/travelpayouts-api.ts", "utf8");
    assert.match(stay, /STAY22_API_KEY/);
    assert.match(tp, /TRAVELPAYOUTS_TOKEN/);
  });

  it("names the Where to stay tab on the book partners UI", () => {
    const ui = readFileSync("components/BookPartners.tsx", "utf8");
    assert.match(ui, /Where to stay/);
    assert.doesNotMatch(ui, /Hotels and stays/);
    assert.match(ui, /\/api\/partners\/hotels\/search/);
    assert.match(ui, /\/api\/partners\/flights\/search/);
    assert.match(ui, /\/api\/partners\/cars\/search/);
    assert.match(ui, /View & book/);
    assert.match(ui, /AirportAutocomplete/);
    assert.match(ui, /Passengers/);
    assert.match(ui, /Driver age/);
  });

  it("keeps one-way and round-trip flights on-site even when live prices are off", () => {
    const ui = readFileSync("components/BookPartners.tsx", "utf8");
    assert.doesNotMatch(ui, /liveEnabled && wanted\.trip !== "multi-city"/);
    assert.match(ui, /wanted\.trip === "multi-city"/);
    assert.doesNotMatch(ui, /Live prices are not available/);
    assert.doesNotMatch(ui, /Live prices could not be loaded/);
    assert.match(ui, /Compare fares with Kayak/);
  });
});
