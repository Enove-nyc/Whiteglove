import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapTravelpayoutsFlights, searchTravelpayoutsFlights } from "@/lib/travelpayouts-api";

describe("Travelpayouts flight mapping", () => {
  it("prefers airport codes and keeps a readable summary", () => {
    const rows = mapTravelpayoutsFlights(
      [
        {
          origin: "NYC",
          destination: "KRK",
          origin_airport: "JFK",
          destination_airport: "KRK",
          departure_at: "2026-09-12T11:40:00Z",
          return_at: "2026-09-19T16:10:00Z",
          airline: "lo",
          flight_number: 26,
          transfers: 0,
          price: 432,
        },
      ],
      { origin: "NYC", destination: "KRK", departDate: "2026-09-12", returnDate: "2026-09-19" },
      "USD",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].origin, "JFK");
    assert.equal(rows[0].destination, "KRK");
    assert.equal(rows[0].departTime, "11:40");
    assert.match(rows[0].summary, /JFK → KRK/);
    assert.match(rows[0].summary, /Nonstop/);
  });

  it("skips rows without a numeric price", () => {
    const rows = mapTravelpayoutsFlights(
      [{ origin: "JFK", destination: "FCO", departure_at: "2026-09-12", price: undefined }],
      { origin: "JFK", destination: "FCO", departDate: "2026-09-12" },
      "USD",
    );
    assert.equal(rows.length, 0);
  });
});

describe("Travelpayouts search without a token", () => {
  it("returns unavailable without naming the env var to visitors", async () => {
    const previous = process.env.TRAVELPAYOUTS_TOKEN;
    delete process.env.TRAVELPAYOUTS_TOKEN;
    try {
      const result = await searchTravelpayoutsFlights({
        origin: "JFK",
        destination: "KRK",
        departDate: "2026-09-12",
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.doesNotMatch(result.message, /TRAVELPAYOUTS_TOKEN/);
        assert.doesNotMatch(result.detail ?? "", /TRAVELPAYOUTS_TOKEN/);
      }
    } finally {
      if (previous !== undefined) process.env.TRAVELPAYOUTS_TOKEN = previous;
    }
  });
});
