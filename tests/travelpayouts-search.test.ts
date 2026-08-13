import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { flightSearchSignature, mapLiveTickets, liveStopDetail } from "@/lib/travelpayouts-search";
import { liveRowFromFare } from "@/lib/partner-flights";

describe("Flight Search API signature", () => {
  it("md5s the token plus nested values in key order", () => {
    const sig = flightSearchSignature("tok", {
      marker: "123",
      locale: "en",
      search_params: {
        trip_class: "Y",
        passengers: { adults: 1, children: 0, infants: 0 },
        directions: [{ origin: "TLV", destination: "JFK", date: "2026-08-25" }],
      },
    });
    assert.match(sig, /^[a-f0-9]{32}$/);
    assert.equal(
      sig,
      flightSearchSignature("tok", {
        locale: "en",
        marker: "123",
        search_params: {
          directions: [{ date: "2026-08-25", destination: "JFK", origin: "TLV" }],
          passengers: { children: 0, infants: 0, adults: 1 },
          trip_class: "Y",
        },
      }),
    );
  });
});

describe("live Aviasales tickets", () => {
  const legs = [
    {
      origin: "TLV",
      destination: "FCO",
      local_departure_date_time: "2026-08-25T06:00:00+03:00",
      local_arrival_date_time: "2026-08-25T09:10:00+02:00",
      operating_carrier_designator: { carrier_code: "NO", number: "1383" },
    },
    {
      origin: "FCO",
      destination: "JFK",
      local_departure_date_time: "2026-08-25T12:40:00+02:00",
      local_arrival_date_time: "2026-08-25T16:20:00-04:00",
      operating_carrier_designator: { carrier_code: "NO", number: "1383" },
    },
  ];
  const tickets = [
    {
      segments: [{ flights: [0, 1], transfers: [{}] }],
      proposals: [{ id: "p1", price: { amount: 704, currency: "USD" } }],
    },
  ];

  it("maps tens of live offers without inventing a layover city", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      segments: [{ flights: [0] }],
      proposals: [{ id: `p${i}`, price: { amount: 500 + i, currency: "USD" } }],
    }));
    const rows = mapLiveTickets(many, [legs[0]], "search-1", [{ iata: "NO", name: "Neos" }]);
    assert.equal(rows.length, 40);
    assert.ok(rows[0].bookUrl.startsWith("/api/partners/flights/offer?"));
    const live = liveRowFromFare(rows[0]);
    assert.ok(live);
    assert.equal(live.network, "travelpayouts");
    assert.doesNotMatch(live.bookHref, /\/go\?/);
  });

  it("names the stop airport and wait from the offer legs", () => {
    const detail = liveStopDetail(tickets[0], legs);
    assert.match(detail, /FCO/);
    assert.match(detail, /arrive 09:10/);
    assert.match(detail, /leave 12:40/);
    assert.doesNotMatch(detail, /somewhere/i);
    const rows = mapLiveTickets(tickets, legs, "search-1", [{ iata: "NO", name: "Neos" }]);
    assert.equal(rows[0].airlineName, "Neos");
    assert.match(rows[0].stopDetail ?? "", /FCO/);
    assert.equal(rows[0].transfers, 1);
  });

  it("does not use the cheapest-cache dump as the live board", () => {
    const source = readFileSync("lib/travelpayouts-search.ts", "utf8");
    assert.match(source, /tickets-api\.travelpayouts\.com/);
    assert.match(source, /search\/affiliate\/start/);
    assert.doesNotMatch(source, /api\.travelpayouts\.com\/aviasales\/v3\/prices_for_dates/);
    assert.doesNotMatch(source, /\/v2\/prices\/cheap/);
    const helper = readFileSync("lib/partner-flights.ts", "utf8");
    assert.match(helper, /searchLiveAviasalesFlights/);
    assert.doesNotMatch(helper, /searchTravelpayoutsFlights/);
  });
});
