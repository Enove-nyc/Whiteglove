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
  it("is one search, on the home page only (/book redirects there)", () => {
    assert.match(readFileSync("components/ItinerariesHome.tsx", "utf8"), /<TravelSearch key=/);
    assert.match(readFileSync("app/book/page.tsx", "utf8"), /permanentRedirect/);
    assert.throws(() => readFileSync("components/HomeTravelSearch.tsx", "utf8"));
  });
  it("keeps one height for every tab on a computer, so switching does not move the page", () => {
    assert.match(readFileSync("components/TravelSearch.tsx", "utf8"), /lockedTab \? "" : "md:min-h-\[246px\]"/);
  });
  it("carries everything under Find travel, each with its own page", async () => {
    const { TRAVEL_TABS } = await import("@/components/TravelSearch");
    assert.deepEqual(TRAVEL_TABS.map((t) => t.label), ["Flights", "Hotels", "Car rentals", "Things to do", "Transfers", "eSIMs", "Travel insurance"]);
    for (const t of TRAVEL_TABS) assert.match(t.href, /^\/(find\/|transfers$|esim$|travel-insurance$)/);
  });
  it("on a phone shows a list of those pages instead of tabs — unless the link asked for a search", () => {
    const home = readFileSync("components/ItinerariesHome.tsx", "utf8");
    assert.match(home, /<div className=\{asked \? "" : "hidden md:block"\}>\s*<TravelSearch/);
    assert.match(home, /\{!asked && <nav aria-label="Find travel" className="md:hidden">/);
  });
  it("sends links that carry a search to that search's own page, which works on a phone", async () => {
    const { searchHref } = await import("@/lib/travel-tabs");
    assert.equal(searchHref("cars"), "/find/car-rentals");
    assert.equal(searchHref("flights", { to: "FCO", depart: "2027-05-01" }), "/find/flights?to=FCO&depart=2027-05-01");
    assert.equal(searchHref("esim"), "/esim");
    assert.doesNotMatch(readFileSync("app/transfers/page.tsx", "utf8"), /Search car hire/);
  });
  it("offers a dropdown of real places for the destination", () => {
    assert.match(readFileSync("components/TravelSearch.tsx", "utf8"), /<AddressAutocomplete[\s\S]*?mode="city"/);
  });
  it("puts the search before the photograph on a phone, and the Booked line off the photo", () => {
    const home = readFileSync("components/ItinerariesHome.tsx", "utf8");
    assert.match(home, /id="search" className="relative z-10 order-2/);
    assert.match(home, /<figure className="relative order-3/);
    assert.ok(home.indexOf("<strong className=\"text-[var(--navy)]\">Booked?</strong>") > home.indexOf("</section>"), "Booked line sits after the hero, not over the photo");
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
  it("the box starts ticked, and the drop-off field is always there, greyed until unticked", () => {
    // Owner, 20 November 2026: unticking it "still moves the whole page".
    const ui = readFileSync("components/TravelSearch.tsx", "utf8");
    assert.match(ui, /useState\(true\)/);
    assert.match(ui, /Drop off at the same place/);
    assert.doesNotMatch(ui, /tab === "cars" && !dropoffSame \? \(/);
    assert.match(ui, /placeholder=\{dropoffSame \? "Same as pick-up" : "City or airport"\}/);
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

describe("booked already? the confirmation fills the trip", () => {
  it("the home page says so under the search, and opens Smart Import", () => {
    assert.match(readFileSync("components/ItinerariesHome.tsx", "utf8"), /href="\/itinerary\?import=1"/);
  });
  it("the planner opens Smart Import on ?import=1, and tells a guest to log in for it", () => {
    const BUILDER = readFileSync("components/ItineraryBuilder.tsx", "utf8");
    assert.match(BUILDER, /get\("import"\) !== "1"/);
    assert.match(BUILDER, /\/login\?next=\$\{encodeURIComponent\("\/itinerary\?import=1"\)\}/);
  });
});

describe("transfers, eSIMs and insurance from the same box", () => {
  const base = { page: "/", placement: "home-search", from: "", to: "", dropoffSame: true, dropoff: "", oneWay: false, adults: 2, rooms: 1, start: "2027-05-01", end: "2027-05-08" };
  it("sends each to its partner with the place", () => {
    const q = (tab: "transfers" | "esim" | "insurance") => new URL((travelSearchHref({ ...base, tab, where: "Italy" }) as { href: string }).href, "https://x").searchParams;
    assert.equal(q("transfers").get("product"), "transfer");
    assert.equal(q("esim").get("product"), "esim");
    assert.equal(q("esim").get("in"), null);
    assert.equal(q("insurance").get("product"), "insurance");
    assert.equal(q("insurance").get("out"), "2027-05-08");
    assert.ok("error" in travelSearchHref({ ...base, tab: "esim", where: "" }));
  });
});

describe("the closed Kosher Travel domain", () => {
  it("answers only on its own address and www; every other subdomain is not found", async () => {
    const { isRetiredKosherSubdomain } = await import("@/lib/kosher-closure");
    const h = (host: string) => ({ get: (n: string) => (n === "host" ? host : null) });
    assert.equal(isRetiredKosherSubdomain(h("admin.whiteglovekoshertravel.com")), true);
    assert.equal(isRetiredKosherSubdomain(h("anything.whiteglovekoshertravel.com")), true);
    assert.equal(isRetiredKosherSubdomain(h("www.whiteglovekoshertravel.com")), false);
    assert.equal(isRetiredKosherSubdomain(h("whiteglovekoshertravel.com")), false);
    assert.match(readFileSync("middleware.ts", "utf8"), /isRetiredKosherSubdomain\(request\.headers\)/);
  });
});

describe("flights: multi-city", () => {
  const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  const multi: TravelSearchState = {
    ...base, tab: "flights", multi: true,
    legs: [
      { from: "New York (JFK)", to: "Rome (FCO)", date: future(40) },
      { from: "Rome (FCO)", to: "Athens (ATH)", date: future(45) },
      { from: "Athens (ATH)", to: "New York (JFK)", date: future(52) },
    ],
  };
  it("sends every leg to Kayak, which takes a multi-city journey", () => {
    const q = params(travelSearchHref(multi));
    assert.equal(q.get("product"), "flight");
    assert.equal(q.get("partner"), "kayak");
    assert.equal(q.get("legs"), `JFK-FCO-${future(40)}_FCO-ATH-${future(45)}_ATH-JFK-${future(52)}`);
  });
  it("asks for two flights, both airports and a date on each, in date order", () => {
    assert.ok("error" in travelSearchHref({ ...multi, legs: multi.legs!.slice(0, 1) }));
    assert.ok("error" in travelSearchHref({ ...multi, legs: [multi.legs![0], { from: "Rome", to: "", date: future(45) }] }));
    assert.ok("error" in travelSearchHref({ ...multi, legs: [multi.legs![1], multi.legs![0]] }));
  });
  it("arrives at Kayak with every leg, through the Stay22 Kayak link", async () => {
    const { readAffiliateRequest } = await import("@/lib/affiliate/request");
    const { resolveLink } = await import("@/lib/affiliate/partners");
    const href = (travelSearchHref(multi) as { href: string }).href;
    const request = readAffiliateRequest(new URL(href, "https://x").searchParams);
    assert.ok(request);
    const link = resolveLink(request, {
      partners: { flights: "aviasales", cars: "economybookings" },
      travelpayouts: { flights: "https://tp.media/r?marker=123456&trs=1&p=4114&u=https%3A%2F%2Fsearch.aviasales.com" },
      stay22: { aid: "whiteglove", provider: "roam" },
    });
    assert.ok(link, "a link is built");
    const url = decodeURIComponent(link.url);
    assert.match(url, /kayak/);
    for (const leg of ["JFK-FCO", "FCO-ATH", "ATH-JFK"]) assert.ok(url.includes(leg), `${leg} reaches Kayak: ${url}`);
  });
});

describe("a short page keeps its footer at the bottom of the screen", () => {
  it("lays main out as a column that pushes the footer down", () => {
    const css = readFileSync("app/globals.css", "utf8");
    assert.match(css, /main\.min-h-screen:has\(> footer:last-child\) \{\s*display: flex;\s*flex-direction: column;/);
    assert.match(css, /> footer:last-child \{\s*margin-top: auto;/);
    assert.match(readFileSync("components/FindTravelPage.tsx", "utf8"), /max-w-6xl/);
  });
});
