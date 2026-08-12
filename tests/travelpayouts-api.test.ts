import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { airlineCode, airlineHeading, airlineName, flightNumberLabel } from "@/lib/airline-names";
import { mapTravelpayoutsFlights, trackedAviasalesUrl } from "@/lib/travelpayouts-api";
import { liveRowFromFare, kayakCompareRow } from "@/lib/partner-flights";

describe("airline codes that look like words", () => {
  it("names Norse Atlantic for N0 (N-zero), not the word No", () => {
    assert.equal(airlineCode("N0"), "N0");
    assert.equal(airlineCode("n0"), "N0");
    assert.equal(airlineName("N0"), "Norse Atlantic Airways");
    assert.notEqual(airlineName("N0"), airlineName("NO"));
    assert.equal(airlineName("NO"), "Neos");
    assert.equal(flightNumberLabel("N0", "402"), "N0 402");
    assert.equal(airlineHeading("N0"), "Norse Atlantic Airways");
    assert.equal(airlineHeading("N0", "No"), "Norse Atlantic Airways");
    assert.equal(airlineHeading("N0", "N0"), "Norse Atlantic Airways");
  });

  it("refuses a 3-letter ICAO or a boolean-looking value as a code", () => {
    assert.equal(airlineCode("Norse"), "");
    assert.equal(airlineCode("false"), "");
    assert.equal(airlineName("false"), undefined);
  });
});

describe("Aviasales offer links", () => {
  it("puts the marker on the Data API path and stays on aviasales.com", () => {
    const url = new URL(
      trackedAviasalesUrl("/search/JFK2608TLV1?t=N01787704200&expected_price=562", "761677"),
    );
    assert.equal(url.hostname, "www.aviasales.com");
    assert.equal(url.pathname, "/search/JFK2608TLV1");
    assert.equal(url.searchParams.get("marker"), "761677");
    assert.equal(url.searchParams.get("expected_price"), "562");
  });

  it("refuses a protocol-relative or off-host link", () => {
    assert.equal(trackedAviasalesUrl("//evil.example/search", "761677"), "");
    assert.equal(trackedAviasalesUrl("https://kayak.com/flights", "761677"), "");
    assert.equal(trackedAviasalesUrl("javascript:alert(1)", "761677"), "");
  });
});

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
          link: "/search/JFK1209KRK19091?t=abc",
        },
      ],
      { origin: "NYC", destination: "KRK", departDate: "2026-09-12", returnDate: "2026-09-19" },
      "USD",
      "761677",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].origin, "JFK");
    assert.equal(rows[0].destination, "KRK");
    assert.equal(rows[0].departTime, "11:40");
    assert.equal(rows[0].airlineName, "LOT Polish Airlines");
    assert.match(rows[0].summary, /JFK → KRK/);
    assert.match(rows[0].summary, /LO 26/);
    assert.doesNotMatch(rows[0].summary, /Nonstop|1 stop|stops/);
    assert.match(rows[0].bookUrl, /^https:\/\/www\.aviasales\.com\/search\//);
    assert.match(rows[0].bookUrl, /marker=761677/);
  });

  it("does not title a Norse Atlantic fare as No", () => {
    const rows = mapTravelpayoutsFlights(
      [
        {
          origin: "NYC",
          destination: "TLV",
          origin_airport: "JFK",
          destination_airport: "TLV",
          departure_at: "2026-08-26T00:30:00-04:00",
          airline: "N0",
          flight_number: "402",
          transfers: 1,
          price: 562,
          link: "/search/JFK2608TLV1?t=N01787704200&expected_price=562",
        },
      ],
      { origin: "JFK", destination: "TLV", departDate: "2026-08-26" },
      "USD",
      "761677",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].airline, "N0");
    assert.equal(rows[0].airlineName, "Norse Atlantic Airways");
    assert.match(rows[0].summary, /N0 402/);
    assert.doesNotMatch(rows[0].summary, /1 stop/);
    const live = liveRowFromFare(rows[0]);
    assert.ok(live);
    assert.equal(live.title, "Norse Atlantic Airways");
    assert.equal(live.meta, "1 stop");
    assert.equal(live.price, 562);
    assert.equal(live.network, "travelpayouts");
    assert.match(live.bookHref, /aviasales\.com/);
    assert.doesNotMatch(live.bookHref, /\/go\?/);
    assert.doesNotMatch(live.title, /^No$/i);
  });

  it("does not title a row No even if a bad airline name slipped in", () => {
    const live = liveRowFromFare({
      id: "x",
      origin: "JFK",
      destination: "TLV",
      departDate: "2026-08-26",
      airline: "N0",
      airlineName: "No",
      transfers: 1,
      price: 562,
      currency: "USD",
      summary: "N0 402 · JFK → TLV",
      bookUrl: "https://www.aviasales.com/search/JFK2608TLV1?marker=761677",
    });
    assert.ok(live);
    assert.equal(live.title, "Norse Atlantic Airways");
    assert.doesNotMatch(live.title, /^No$/i);
  });

  it("keeps a round-trip with a different return when asked to", () => {
    const rows = mapTravelpayoutsFlights(
      [
        {
          origin: "NYC",
          destination: "TLV",
          origin_airport: "JFK",
          destination_airport: "TLV",
          departure_at: "2026-08-26T17:30:00-04:00",
          return_at: "2026-08-31T18:00:00+03:00",
          airline: "AF",
          flight_number: "011",
          transfers: 2,
          price: 1204,
          link: "/search/JFK2608TLV31081?t=AF",
        },
      ],
      { origin: "JFK", destination: "TLV", departDate: "2026-08-26", returnDate: "2026-09-02" },
      "USD",
      "761677",
      "any-roundtrip",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].returnDate, "2026-08-31");
    assert.match(rows[0].summary, /return 31 Aug 2026/);
    const live = liveRowFromFare(rows[0]);
    assert.ok(live);
    assert.match(live.bookHref, /aviasales\.com/);
    assert.doesNotMatch(live.bookHref, /\/go\?/);
  });

  it("drops a one-way search row that came back with a return date", () => {
    const rows = mapTravelpayoutsFlights(
      [
        {
          origin: "JFK",
          destination: "TLV",
          departure_at: "2026-08-26T01:00:00-04:00",
          return_at: "2026-08-31T18:00:00+03:00",
          airline: "AF",
          flight_number: "011",
          transfers: 2,
          price: 1204,
          link: "/search/JFK2608TLV31081?t=AF",
        },
      ],
      { origin: "JFK", destination: "TLV", departDate: "2026-08-26" },
      "USD",
      "761677",
    );
    assert.equal(rows.length, 0);
  });

  it("skips rows without a numeric price", () => {
    const rows = mapTravelpayoutsFlights(
      [{ origin: "JFK", destination: "FCO", departure_at: "2026-09-12", price: undefined }],
      { origin: "JFK", destination: "FCO", departDate: "2026-09-12" },
      "USD",
    );
    assert.equal(rows.length, 0);
  });

  it("does not attach a Travelpayouts price to a Kayak compare row", () => {
    const compare = kayakCompareRow(
      { origin: "JFK", destination: "TLV", departDate: "2026-08-26", adults: 1 },
      "JFK",
      "TLV",
    );
    assert.equal(compare.price, undefined);
    assert.equal(compare.network, "stay22");
    assert.match(compare.bookHref, /^\/go\?/);
    assert.match(compare.subtitle, /Kayak/i);
    assert.doesNotMatch(compare.subtitle, /\$|USD|\d{3}/);
  });

  it("refuses a live row whose booking URL is not Aviasales", () => {
    assert.equal(
      liveRowFromFare({
        id: "x",
        origin: "JFK",
        destination: "TLV",
        departDate: "2026-08-26",
        transfers: 1,
        price: 562,
        currency: "USD",
        summary: "should not show",
        bookUrl: "/go?product=flight",
      }),
      null,
    );
  });
});
