import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { partnerLiveCapabilities } from "@/lib/partner-live";
import { stay22ApiConfigured } from "@/lib/stay22-api";
import { readFileSync } from "node:fs";

describe("partner live capabilities", () => {
  it("never invents a live car inventory flag", () => {
    const caps = partnerLiveCapabilities();
    assert.equal(caps.cars, false);
  });

  it("reflects whether the Stay22 hotel API is configured, without a live flight or car inventory flag", () => {
    const caps = partnerLiveCapabilities();
    assert.equal(caps.hotels, stay22ApiConfigured());
    assert.equal(caps.flights, false);
    assert.equal(caps.cars, false);
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
    assert.doesNotMatch(ui, /\/api\/partners\/cars\/search/);
    assert.match(ui, /flightsEmbedPath/);
    assert.match(ui, /carsEmbedPath/);
    assert.match(ui, /View & book/);
    assert.match(ui, /PartnerSearchWidget/);
    assert.match(ui, /Compare on Kayak/);
    assert.doesNotMatch(ui, /Passengers/);
    assert.doesNotMatch(ui, /Driver age/);
    assert.doesNotMatch(ui, /Open with these dates in a new tab/);
  });

  it("keeps cash flights on one form with trip type, live fares when real, and Kayak as a separate control", () => {
    const ui = readFileSync("components/BookPartners.tsx", "utf8");
    const flights = ui.slice(ui.indexOf("function FlightsForm"), ui.indexOf("function HotelsForm"));
    const cars = ui.slice(ui.indexOf("function CarsForm"), ui.indexOf("function BookedPrompt"));
    assert.match(flights, /PartnerSearchWidget/);
    assert.match(flights, /flightsEmbedPath/);
    assert.match(flights, /AirportAutocomplete/);
    assert.match(flights, /DateField/);
    assert.match(flights, /round-trip/);
    assert.match(flights, /one-way/);
    assert.match(flights, /Nonstop only/);
    assert.match(flights, /\/api\/partners\/flights\/search/);
    assert.match(flights, /Compare on Kayak/);
    assert.match(cars, /PartnerSearchWidget/);
    assert.match(cars, /carsEmbedPath/);
    assert.doesNotMatch(cars, /AddressAutocomplete|DateField|SearchGrid/);
    assert.doesNotMatch(ui, /wanted\.trip === "multi-city"/);
    assert.doesNotMatch(ui, /Live prices are not available/);
    assert.doesNotMatch(ui, /Live prices could not be loaded/);
    assert.doesNotMatch(ui, /Compare fares with Kayak/);
    assert.match(ui, /White Glove does not list a fare here/);
  });
});
