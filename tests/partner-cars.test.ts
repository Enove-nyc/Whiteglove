import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchPartnerCars } from "@/lib/partner-cars";

describe("on-site car compare rows", () => {
  it("builds a tracked /go link with the city and both dates", () => {
    const result = searchPartnerCars({
      destination: "Rome",
      checkIn: "2026-09-12",
      checkOut: "2026-09-19",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.mode, "compare");
    assert.equal(result.cars.length, 1);
    assert.match(result.cars[0].bookHref, /^\/go\?/);
    assert.match(result.cars[0].bookHref, /product=car/);
    assert.match(result.cars[0].bookHref, /destination=Rome/);
    assert.match(result.cars[0].bookHref, /in=2026-09-12/);
    assert.match(result.cars[0].bookHref, /out=2026-09-19/);
    assert.doesNotMatch(result.cars[0].bookHref, /aid=|marker|kayak\.com|stay22/i);
  });

  it("refuses an empty city rather than inventing a search", () => {
    const result = searchPartnerCars({ destination: "  ", checkIn: "2026-09-12", checkOut: "2026-09-19" });
    assert.equal(result.ok, false);
  });
});
