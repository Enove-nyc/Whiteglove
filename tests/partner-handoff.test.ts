import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { goHref, readAffiliateRequest } from "@/lib/affiliate/request";
import { resolveLink, type AffiliateConfig } from "@/lib/affiliate/partners";
import { NO_STAY22 } from "@/lib/stay22";
import { airportCode } from "@/lib/kayak-search";

const KAYAK_DEFAULTS: AffiliateConfig = {
  partners: { flights: "kayak", cars: "kayak" },
  travelpayouts: {},
  stay22: NO_STAY22,
};

/**
 * End-to-end handoff shape without purchasing: future dates, codes, multi-city
 * legs, and no affiliate IDs in the public /go query the page would open.
 */

const FUTURE_OUT = "2026-11-12";
const FUTURE_BACK = "2026-11-19";
const FUTURE_LEG2 = "2026-11-15";

describe("partner handoffs (no purchase)", () => {
  it("extracts airport codes from autocomplete labels", () => {
    assert.equal(airportCode("New York — all airports (NYC)"), "NYC");
    assert.equal(airportCode("JFK"), "JFK");
  });

  it("round-trip flight encodes codes and dates through /go", () => {
    const href = goHref({
      product: "flight",
      legs: [{ from: "JFK", to: "FCO", date: FUTURE_OUT }],
      checkOut: FUTURE_BACK,
      page: "/book",
      placement: "book-flights",
    });
    assert.match(href, /^\/go\?/);
    assert.doesNotMatch(href, /aid=|marker|affiliate|kayak\.com|stay22/i);
    const req = readAffiliateRequest(new URLSearchParams(href.split("?")[1]));
    assert.ok(req);
    assert.equal(req!.product, "flight");
    assert.deepEqual(req!.legs, [{ from: "JFK", to: "FCO", date: FUTURE_OUT }]);
    assert.equal(req!.checkOut, FUTURE_BACK);
  });

  it("multi-city flight keeps every leg", () => {
    const href = goHref({
      product: "flight",
      legs: [
        { from: "JFK", to: "FCO", date: FUTURE_OUT },
        { from: "FCO", to: "TLV", date: FUTURE_LEG2 },
      ],
      page: "/book",
      placement: "book-flights",
    });
    const req = readAffiliateRequest(new URLSearchParams(href.split("?")[1]));
    assert.equal(req?.legs?.length, 2);
    assert.equal(req?.legs?.[1].to, "TLV");
  });

  it("hotel and car pass dates and destination", () => {
    const hotel = goHref({
      product: "hotel",
      destination: "Rome, Italy",
      checkIn: FUTURE_OUT,
      checkOut: FUTURE_BACK,
      adults: 2,
      page: "/book",
      placement: "book-hotels",
    });
    const car = goHref({
      product: "car",
      destination: "FCO",
      checkIn: FUTURE_OUT,
      checkOut: FUTURE_BACK,
      page: "/book",
      placement: "book-cars",
    });
    for (const href of [hotel, car]) {
      assert.match(href, /^\/go\?/);
      assert.doesNotMatch(href, /aid=|marker|BOOKING_AFFILIATE/i);
    }
    const hotelReq = readAffiliateRequest(new URLSearchParams(hotel.split("?")[1]));
    assert.equal(hotelReq?.destination, "Rome, Italy");
    assert.equal(hotelReq?.adults, 2);
  });

  it("resolveLink builds partner destinations without exposing config on /book", () => {
    const flight = resolveLink(
      {
        product: "flight",
        legs: [{ from: "JFK", to: "KRK", date: FUTURE_OUT }],
        checkOut: FUTURE_BACK,
        page: "/book",
        placement: "book-flights",
      },
      KAYAK_DEFAULTS,
    );
    assert.ok(flight?.url);
    assert.match(flight!.url, /kayak\.com\/flights/i);
    assert.match(flight!.url, /JFK-KRK/);
    assert.match(flight!.url, new RegExp(FUTURE_OUT));
  });

  it("wraps that Kayak search through Stay22 when the ID is set", () => {
    const withAid: AffiliateConfig = {
      ...KAYAK_DEFAULTS,
      stay22: { aid: "whiteglove", provider: "roam" },
    };
    const flight = resolveLink(
      {
        product: "flight",
        legs: [{ from: "JFK", to: "KRK", date: FUTURE_OUT }],
        checkOut: FUTURE_BACK,
        page: "/book",
        placement: "book-flights",
      },
      withAid,
    );
    assert.ok(flight?.url);
    const url = new URL(flight!.url);
    assert.equal(url.host, "www.stay22.com");
    assert.equal(url.pathname, "/allez/kayak");
    assert.match(url.searchParams.get("link") ?? "", /kayak\.com\/flights\/JFK-KRK/);
  });
});
