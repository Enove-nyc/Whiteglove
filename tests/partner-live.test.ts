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
  it("keeps hotel live search on Stay22 and flights on Travelpayouts", () => {
    const hotels = readFileSync("app/api/partners/hotels/search/route.ts", "utf8");
    const flights = readFileSync("app/api/partners/flights/search/route.ts", "utf8");
    assert.match(hotels, /searchStay22Accommodations/);
    assert.match(flights, /searchTravelpayoutsFlights/);
    assert.doesNotMatch(hotels, /DUFFEL/);
    assert.doesNotMatch(flights, /DUFFEL/);
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
    assert.match(ui, /\/api\/partners\/hotels\/search/);
    assert.match(ui, /\/api\/partners\/flights\/search/);
  });
});
