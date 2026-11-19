import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { travelSearchHref, type TravelSearchState } from "@/components/TravelSearch";
import { carUrl, TRAVEL_PARTNERS } from "@/lib/travel-partners";

/**
 * One booking search on both doors (owner, 19 November 2026: "make sure every
 * booking screen is replicated against the other one").
 */
const base: TravelSearchState = {
  tab: "cars", page: "/", placement: "home-search", from: "", to: "", where: "Rome", dropoffSame: true, dropoff: "",
  start: "2027-05-01", end: "2027-05-08", oneWay: false, adults: 2, rooms: 1,
};
const params = (r: { href: string } | { error: string }) => {
  assert.ok("href" in r, "error" in r ? r.error : "");
  return new URL(r.href, "https://example.com").searchParams;
};

describe("the home page and the Book page render the same search", () => {
  it("both use TravelSearch, and the old home-only box is gone", () => {
    assert.match(readFileSync("components/ItinerariesHome.tsx", "utf8"), /<TravelSearch \/>/);
    assert.match(readFileSync("app/book/page.tsx", "utf8"), /<TravelSearch initialTab=\{initialTab\}/);
    assert.throws(() => readFileSync("components/HomeTravelSearch.tsx", "utf8"));
  });
  it("keeps miles and points on the Book page, without a second cash form", () => {
    assert.match(readFileSync("app/book/page.tsx", "utf8"), /<BookPartners milesOnly/);
  });
  it("puts the search before the photograph on a phone", () => {
    const home = readFileSync("components/ItinerariesHome.tsx", "utf8");
    assert.match(home, /order-2[^"]*">\s*<TravelSearch/);
    assert.match(home, /<figure className="relative order-3/);
  });
});

describe("car rental: pick-up, then is drop-off the same place", () => {
  it("sends only the pick-up when the box is ticked", () => {
    const q = params(travelSearchHref(base));
    assert.equal(q.get("product"), "car");
    assert.equal(q.get("destination"), "Rome");
    assert.equal(q.get("dropoff"), null);
  });
  it("asks for the drop-off place once the box is unticked", () => {
    const r = travelSearchHref({ ...base, dropoffSame: false });
    assert.ok("error" in r && /dropping the car off/.test(r.error));
    assert.equal(params(travelSearchHref({ ...base, dropoffSame: false, dropoff: "Milan" })).get("dropoff"), "Milan");
  });
  it("the box starts ticked, and the drop-off field only appears when it is not", () => {
    const ui = readFileSync("components/TravelSearch.tsx", "utf8");
    assert.match(ui, /useState\(true\)/);
    assert.match(ui, /Drop off at the same place/);
    assert.match(ui, /tab === "cars" && !dropoffSame \? \(/);
  });
  it("a partner whose address carries a return place gets it", () => {
    const kayak = TRAVEL_PARTNERS.find((p) => p.key === "kayak")!;
    assert.equal(carUrl(kayak, { where: "Rome", dropoffWhere: "Milan", pickup: "2027-05-01", dropoff: "2027-05-08" }),
      "https://www.kayak.com/cars/Rome/Milan/2027-05-01/2027-05-08");
    assert.equal(carUrl(kayak, { where: "Rome", pickup: "2027-05-01", dropoff: "2027-05-08" }),
      "https://www.kayak.com/cars/Rome/2027-05-01/2027-05-08");
  });
});

describe("flights and hotels", () => {
  const flight = { ...base, tab: "flights" as const, from: "London (LHR)", to: "Milan (MXP)" };
  it("a return trip needs the return date; one way does not", () => {
    assert.ok("error" in travelSearchHref({ ...flight, end: "" }));
    const q = params(travelSearchHref({ ...flight, end: "", oneWay: true }));
    assert.equal(q.get("from"), "LHR"); assert.equal(q.get("to"), "MXP"); assert.equal(q.get("out"), null);
    assert.equal(q.get("adults"), "2");
  });
  it("hotels carry guests and rooms", () => {
    const q = params(travelSearchHref({ ...base, tab: "hotels", adults: 3, rooms: 2 }));
    assert.equal(q.get("product"), "hotel"); assert.equal(q.get("adults"), "3"); assert.equal(q.get("rooms"), "2");
  });
});

describe("the planner, checked as a guest", () => {
  const BUILDER = readFileSync("components/ItineraryBuilder.tsx", "utf8");
  it("has no Saved route button, now that Route is gone", () => {
    assert.doesNotMatch(BUILDER, />Saved route</);
  });
  it("offers Plan my route only once there are stops to arrange", () => {
    assert.match(BUILDER, /itin\.activities\.length > 0 && <button type="button" onClick=\{planMyRoute\}/);
  });
  it("prints a guest's trip from this browser", () => {
    assert.match(readFileSync("app/itinerary/print/page.tsx", "utf8"), /localStorage\.getItem\(GUEST_TRIP_KEY\)/);
  });
  it("speaks to the traveller, not an adviser, and not in kosher terms", () => {
    assert.doesNotMatch(readFileSync("components/PreviewDialog.tsx", "utf8"), /What your traveller sees/);
    assert.doesNotMatch(BUILDER, /minyan times/);
  });
});

describe("public sample itineraries", () => {
  it("are public, listed for search engines and edge-cached", async () => {
    const { isPublicPage } = await import("@/lib/public-access");
    const { publicPaths } = await import("@/lib/site-map");
    const { SAMPLE_ITINERARIES } = await import("@/data/sample-itineraries");
    const paths = publicPaths().map((entry) => entry.path);
    for (const sample of SAMPLE_ITINERARIES) {
      assert.ok(isPublicPage(`/sample-itineraries/${sample.slug}`));
      assert.ok(paths.includes(`/sample-itineraries/${sample.slug}`), sample.slug);
    }
    assert.ok(isPublicPage("/sample-itineraries"));
  });
  it("name no hotel, airline or price — places only", async () => {
    const { SAMPLE_ITINERARIES } = await import("@/data/sample-itineraries");
    for (const sample of SAMPLE_ITINERARIES) {
      assert.equal(sample.itinerary.flights.length, 0);
      for (const stay of sample.itinerary.lodging) assert.match(stay.name, /^Your hotel/);
      for (const stop of sample.itinerary.activities) assert.match(stop.coordinates ?? "", /^-?\d+\.\d+, -?\d+\.\d+$/, stop.name);
      assert.doesNotMatch(JSON.stringify(sample), /[$€£]\s?\d/);
    }
  });
  it("copy moves the whole trip to the new start, stays and stops with it", async () => {
    const { SAMPLE_ITINERARIES, shiftItinerary } = await import("@/data/sample-itineraries");
    const rome = SAMPLE_ITINERARIES[0].itinerary;
    const moved = shiftItinerary(rome, "2030-01-10");
    assert.equal(moved.startDate, "2030-01-10");
    assert.equal(moved.endDate, "2030-01-13");
    assert.equal(moved.lodging[0].checkIn, "2030-01-10");
    assert.equal(moved.lodging[0].checkOut, "2030-01-13");
    assert.ok(moved.activities.every((stop) => stop.date >= "2030-01-10" && stop.date <= "2030-01-13"));
  });
});
