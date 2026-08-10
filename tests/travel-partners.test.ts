import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  carUrl,
  DEFAULT_PARTNERS,
  flightUrl,
  hostBelongsTo,
  isPartnerKey,
  partnerFor,
  partnersFor,
  TRAVEL_PARTNERS,
} from "@/lib/travel-partners";

/**
 * Which partner each search opens.
 *
 * WHY THIS MODULE IS WORTH TESTING HARD. Kayak was typed into the site as a
 * fact, and the account was approved for Aviasales, Kiwi and EconomyBookings
 * but not Kayak — so every programme the owner could actually earn from was
 * refused by his own settings screen, and the answer looked like "wait for
 * Kayak" when the real answer was "stop hard-coding Kayak".
 *
 * Everything here fails silently in production. A wrong deep link does not
 * throw: it opens the partner's front page instead of the traveller's search,
 * they search again by hand, and the referral is lost with nothing reporting a
 * fault. So the assertions are about the exact address.
 */

const flights = (key: string) => TRAVEL_PARTNERS.find((p) => p.slot === "flights" && p.key === key)!;
const cars = (key: string) => TRAVEL_PARTNERS.find((p) => p.slot === "cars" && p.key === key)!;

const journey = {
  shape: { trip: "one-way" as const, legs: [{ from: "JFK", to: "KRK", date: "2026-09-01" }] as [{ from: string; to: string; date: string }] },
};
const roundTrip = {
  shape: {
    trip: "round-trip" as const,
    legs: [{ from: "JFK", to: "KRK", date: "2026-09-01" }] as [{ from: string; to: string; date: string }],
    ret: "2026-09-08",
  },
};

describe("the default partner is Kayak, which works and can earn via Stay22", () => {
  it("defaults flights and cars to Kayak", () => {
    // Aviasales deep links discard the search; EconomyBookings carries no
    // dates. Kayak via Stay22 was traced live with route and dates intact.
    assert.equal(DEFAULT_PARTNERS.flights, "kayak");
    assert.equal(DEFAULT_PARTNERS.cars, "kayak");
  });

  it("falls back rather than throwing on a choice that makes no sense", () => {
    // A stale key from an older release, or hotels somehow set to a flight
    // partner. A settings screen must not be able to take the searches down.
    assert.equal(partnerFor("flights", { flights: "economybookings" }).key, "kayak");
    assert.equal(partnerFor("flights", undefined).key, "kayak");
    assert.equal(partnerFor("cars", {}).key, "kayak");
  });

  it("honours a choice that does make sense", () => {
    assert.equal(partnerFor("flights", { flights: "kiwi" }).key, "kiwi");
    assert.equal(partnerFor("flights", { flights: "kayak" }).key, "kayak");
    assert.equal(partnerFor("cars", { cars: "kayak" }).key, "kayak");
  });

  it("offers Kayak in the list, so switching is a dropdown rather than a deploy", () => {
    assert.ok(partnersFor("flights").some((p) => p.key === "kayak"));
    assert.ok(partnersFor("cars").some((p) => p.key === "kayak"));
  });

  it("knows a real key from a typed one", () => {
    assert.equal(isPartnerKey("aviasales"), true);
    assert.equal(isPartnerKey("expedia"), false);
    assert.equal(isPartnerKey(undefined), false);
  });
});

describe("the flight address", () => {
  it("carries the route and the date Aviasales documents", () => {
    const url = new URL(flightUrl(flights("aviasales"), journey)!);
    assert.equal(url.host, "search.aviasales.com");
    assert.equal(url.pathname, "/flights/");
    assert.equal(url.searchParams.get("origin_iata"), "JFK");
    assert.equal(url.searchParams.get("destination_iata"), "KRK");
    assert.equal(url.searchParams.get("depart_date"), "2026-09-01");
    assert.equal(url.searchParams.get("one_way"), "true");
  });

  it("says round trip and carries the return date when there is one", () => {
    const url = new URL(flightUrl(flights("aviasales"), roundTrip)!);
    assert.equal(url.searchParams.get("return_date"), "2026-09-08");
    assert.equal(url.searchParams.get("one_way"), "false");
  });

  it("does not send a return date on a one-way, which would book the wrong trip", () => {
    const url = new URL(flightUrl(flights("aviasales"), journey)!);
    assert.equal(url.searchParams.has("return_date"), false);
  });

  it("defaults to one adult rather than inventing a party", () => {
    assert.equal(new URL(flightUrl(flights("aviasales"), journey)!).searchParams.get("adults"), "1");
    assert.equal(
      new URL(flightUrl(flights("aviasales"), { ...journey, adults: 3 })!).searchParams.get("adults"),
      "3",
    );
  });

  it("builds Kiwi on its own host, with the path joined properly", () => {
    const url = new URL(flightUrl(flights("kiwi"), roundTrip)!);
    assert.equal(url.host, "www.kiwi.com");
    // The bug this caught: filtering a leading "" out of the parts produced
    // "www.kiwi.comsearch/results", a host that does not exist.
    assert.equal(url.pathname, "/search/results/JFK/KRK/2026-09-01/2026-09-08");
  });

  it("REFUSES MULTI-CITY IT CANNOT EXPRESS rather than sending the first leg", () => {
    const multi = {
      shape: {
        trip: "multi-city" as const,
        legs: [
          { from: "JFK", to: "KRK", date: "2026-09-01" },
          { from: "KRK", to: "FCO", date: "2026-09-05" },
        ],
      },
    };
    assert.equal(flightUrl(flights("aviasales"), multi), null);
    assert.equal(flightUrl(flights("kiwi"), multi), null);
  });

  it("refuses a journey with a piece missing", () => {
    const noDate = { shape: { trip: "one-way" as const, legs: [{ from: "JFK", to: "KRK", date: "" }] as [{ from: string; to: string; date: string }] } };
    assert.equal(flightUrl(flights("aviasales"), noDate), null);
    const noTo = { shape: { trip: "one-way" as const, legs: [{ from: "JFK", to: "", date: "2026-09-01" }] as [{ from: string; to: string; date: string }] } };
    assert.equal(flightUrl(flights("aviasales"), noTo), null);
  });

  it("leaves Kayak to its own builder, which handles multi-city", () => {
    // Null here is not a refusal — lib/kayak-search.ts builds it. The callers
    // check the key before asking.
    assert.equal(flightUrl(flights("kayak"), journey), null);
  });
});

describe("the car address", () => {
  it("sends a city as a name and an airport as a code", () => {
    const city = new URL(carUrl(cars("economybookings"), { where: "Krakow" })!);
    assert.equal(city.host, "www.economybookings.com");
    assert.equal(city.searchParams.get("idpick"), "Krakow");
    const airport = new URL(carUrl(cars("economybookings"), { where: "KRK" })!);
    assert.equal(airport.searchParams.get("idpickval"), "KRK");
    assert.equal(airport.searchParams.has("idpick"), false);
  });

  it("INVENTS NO DATE PARAMETERS for a partner whose format has none", () => {
    // The temptation is a date_from= because every other partner has one. It
    // would look right, open, and drop the dates in silence.
    const url = new URL(carUrl(cars("economybookings"), { where: "Krakow", pickup: "2026-09-01", dropoff: "2026-09-05" })!);
    assert.equal(url.searchParams.has("date_from"), false);
    assert.doesNotMatch(url.search, /2026-09-01/);
  });

  it("still needs both dates for Kayak, which puts them in the path", () => {
    assert.equal(carUrl(cars("kayak"), { where: "Krakow" }), null);
    const url = carUrl(cars("kayak"), { where: "Krakow", pickup: "2026-09-01", dropoff: "2026-09-05" })!;
    assert.equal(url, "https://www.kayak.com/cars/Krakow/2026-09-01/2026-09-05");
  });

  it("refuses a pick-up nobody named", () => {
    assert.equal(carUrl(cars("economybookings"), { where: "  " }), null);
  });

  it("encodes a place with a space in it", () => {
    const url = carUrl(cars("kayak"), { where: "Tel Aviv", pickup: "2026-09-01", dropoff: "2026-09-05" })!;
    assert.doesNotMatch(new URL(url).pathname, / /);
  });
});

describe("matching a pasted link's destination to the partner", () => {
  it("accepts the subdomain the search is actually built on", () => {
    // Aviasales searches are built on search.aviasales.com while a generated
    // link may forward to aviasales.com. Same programme, same money — refusing
    // one would be a false alarm the owner cannot act on.
    assert.equal(hostBelongsTo("search.aviasales.com", "aviasales.com"), true);
    assert.equal(hostBelongsTo("aviasales.com", "aviasales.com"), true);
    assert.equal(hostBelongsTo("www.economybookings.com", "economybookings.com"), true);
  });

  it("does not accept a different partner that merely ends the same way", () => {
    assert.equal(hostBelongsTo("www.kayak.com", "aviasales.com"), false);
    assert.equal(hostBelongsTo("notaviasales.com", "aviasales.com"), false);
  });
});
