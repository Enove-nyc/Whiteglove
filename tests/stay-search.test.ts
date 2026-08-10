import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { kosherAreas, kosherStays } from "@/data/kosher-stays";
import { vacationDestinations } from "@/data/vacation-destinations";
import {
  citiesFor,
  inDestination,
  isSearch,
  nights,
  readStaySearch,
  staySearchHref,
} from "@/lib/stay-search";

/**
 * The search a visitor makes on the front page, and where it lands.
 *
 * THE FAILURE THIS GUARDS is a form that submits and a page that ignores it.
 * The front page now opens on a search box; if /hotels quietly dropped the
 * destination and showed the whole directory under a heading naming one town,
 * somebody would book a hotel in the wrong country and nothing would have gone
 * visibly wrong.
 *
 * The second failure is subtler and worse: a search for a town this site has
 * never written about returning the nearest thing it could find. An empty
 * result is a true answer. A confident wrong one is not.
 */

const PAGE = readFileSync("app/hotels/page.tsx", "utf8");
const FORM = readFileSync("components/StaySearchForm.tsx", "utf8");

describe("reading a search off the URL", () => {
  it("keeps what was typed and fills in the rest", () => {
    const search = readStaySearch({ destination: "Rome", in: "2026-09-01", out: "2026-09-08" });
    assert.equal(search.destination, "Rome");
    assert.equal(search.checkIn, "2026-09-01");
    assert.equal(search.checkOut, "2026-09-08");
    assert.equal(search.adults, 2);
    assert.equal(search.rooms, 1);
    assert.equal(isSearch(search), true);
  });

  it("treats no destination as the directory rather than an empty result", () => {
    assert.equal(isSearch(readStaySearch({})), false);
    assert.equal(isSearch(readStaySearch({ destination: "  " })), false);
  });

  it("REFUSES A DATE RANGE THAT CANNOT BE BOOKED", () => {
    // A hand-edited URL, or a date picker used backwards. Carrying it through
    // to the partner opens their site on a range it will reject, which reads
    // as this site being broken.
    const backwards = readStaySearch({ in: "2026-09-08", out: "2026-09-01" });
    assert.equal(backwards.checkIn, "2026-09-08");
    assert.equal(backwards.checkOut, "", "a check-out before the check-in survived");
    assert.equal(readStaySearch({ in: "2026-09-01", out: "2026-09-01" }).checkOut, "");
  });

  it("throws away anything that is not a date", () => {
    assert.equal(readStaySearch({ in: "next tuesday" }).checkIn, "");
    assert.equal(readStaySearch({ in: "2026-9-1" }).checkIn, "");
  });

  it("clamps the party size instead of trusting it", () => {
    assert.equal(readStaySearch({ adults: "400" }).adults, 30);
    assert.equal(readStaySearch({ adults: "0" }).adults, 1);
    assert.equal(readStaySearch({ adults: "everyone" }).adults, 2);
    assert.equal(readStaySearch({ rooms: "99" }).rooms, 10);
    assert.equal(readStaySearch({ children: "-3" }).children, 0);
  });

  it("takes the first value when a parameter is repeated", () => {
    assert.equal(readStaySearch({ destination: ["Rome", "Paris"] }).destination, "Rome");
  });

  it("counts the nights, and only when it can", () => {
    assert.equal(nights(readStaySearch({ in: "2026-09-01", out: "2026-09-08" })), 7);
    assert.equal(nights(readStaySearch({ in: "2026-09-01" })), null);
    assert.equal(nights(readStaySearch({})), null);
  });
});

describe("writing a search into a link", () => {
  it("writes only what is worth carrying", () => {
    assert.equal(staySearchHref({ destination: "Rome" }), "/hotels?destination=Rome");
    assert.equal(staySearchHref({}), "/hotels");
    // Two adults and one room is every link on the site otherwise.
    assert.equal(staySearchHref({ destination: "Rome", adults: 2, rooms: 1, children: 0 }), "/hotels?destination=Rome");
    assert.match(staySearchHref({ destination: "Rome", adults: 4 }), /adults=4/);
  });

  it("round-trips through the reader", () => {
    const original = { destination: "Italian Lakes", checkIn: "2026-07-02", checkOut: "2026-07-09", adults: 3, children: 2, rooms: 2 };
    const href = staySearchHref(original);
    const back = readStaySearch(Object.fromEntries(new URLSearchParams(href.split("?")[1])));
    assert.deepEqual(back, original);
  });
});

describe("what a typed destination means", () => {
  it("resolves a destination record to the cities it actually holds", () => {
    // The case a plain city-name match misses entirely: nothing on this site
    // is filed under "Dolomites", but the record names the towns that are.
    for (const record of vacationDestinations) {
      const resolved = citiesFor(record.name);
      assert.ok(resolved, `${record.name} resolves to nothing`);
      for (const city of record.cities) assert.ok(resolved.cities.includes(city), `${record.name} lost ${city}`);
      assert.equal(resolved.label, record.name);
    }
  });

  it("resolves a slug and a bare city name too", () => {
    const first = vacationDestinations[0];
    assert.deepEqual(citiesFor(first.slug)?.cities.slice(0, first.cities.length), [...first.cities]);
    const city = first.cities[0];
    assert.ok(citiesFor(city)?.cities.includes(city));
  });

  it("RESOLVES NOTHING RATHER THAN GUESSING", () => {
    assert.equal(citiesFor("Ulaanbaatar"), null);
    assert.equal(citiesFor(""), null);
    assert.equal(citiesFor("   "), null);
    // Two letters must not match half the list by substring.
    assert.equal(citiesFor("ro"), null);
  });

  it("is not confused by accents or case", () => {
    const record = vacationDestinations.find((d) => /ü|é|à|ó|í/i.test(d.name)) ?? vacationDestinations[0];
    assert.ok(citiesFor(record.name.toUpperCase()));
  });
});

describe("narrowing the records to the search", () => {
  it("returns everything when nothing was asked for", () => {
    assert.equal(inDestination(kosherStays, "").length, kosherStays.length);
  });

  it("returns only the searched place", () => {
    const romeStays = inDestination(kosherStays, "Rome");
    assert.ok(romeStays.length > 0, "no stays for Rome, which the site definitely holds");
    for (const stay of romeStays) assert.equal(stay.city, "Rome");
    const romeAreas = inDestination(kosherAreas, "Rome");
    assert.ok(romeAreas.length > 0);
    for (const area of romeAreas) assert.equal(area.city, "Rome");
  });

  it("RETURNS NOTHING FOR A PLACE WE HOLD NOTHING FOR", () => {
    // Not "the closest few". An empty list is what makes the page's empty
    // state truthful, and the page has one.
    assert.deepEqual(inDestination(kosherStays, "Ulaanbaatar"), []);
    assert.deepEqual(inDestination(kosherAreas, "Ulaanbaatar"), []);
  });

  it("finds a country as well as a town", () => {
    const italian = inDestination(kosherStays, "Italy");
    assert.ok(italian.length > 0);
    for (const stay of italian) assert.equal(stay.country, "Italy");
  });
});

describe("the page and the form agree", () => {
  it("the form submits to /hotels with the names the page reads", () => {
    assert.match(FORM, /action="\/hotels"/);
    assert.match(FORM, /method="get"/);
    for (const name of ["destination", "in", "out", "adults", "children", "rooms"]) {
      assert.match(FORM, new RegExp(`name="${name}"`), `the form has no ${name} field`);
    }
  });

  it("REQUIRES NOTHING, so somebody with no dates yet is not turned away", () => {
    // The visitor this form exists for often has not chosen the month. The
    // partner hand-off further down the page is where dates become required,
    // because there a search without them is not a search.
    assert.doesNotMatch(FORM, /\brequired\b/);
    assert.match(FORM, /helpHref/, "there is no way out for somebody who has not chosen a destination");
  });

  it("READS THE SEARCH RATHER THAN IGNORING IT", () => {
    assert.match(PAGE, /readStaySearch\(await searchParams\)/);
    assert.match(PAGE, /inDestination\(allAreas, search\.destination\)/);
    assert.match(PAGE, /inDestination\(allStays, search\.destination\)/);
  });

  it("HAS ITS OWN EMPTY STATE, rather than showing the whole directory", () => {
    // Still a distinct branch — the directory under a heading naming a town
    // that is not in it would have somebody booking in the wrong country. What
    // changed is what it says: an instruction for the trip rather than a
    // report on how far our own writing has got. AGENTS.md.
    assert.match(PAGE, /Planning a kosher stay in \{heading\}/);
    assert.match(PAGE, /Arrange food and Shabbos locally before you/);
    for (const leak of [/nothing on record/i, /nobody here has written/i, /not published yet/i]) {
      assert.doesNotMatch(PAGE, leak, "the empty state reports on our own coverage");
    }
  });

  it("carries the dates into the partner hand-off", () => {
    // Asking for the dates a second time is where a hand-off is abandoned.
    assert.match(PAGE, /prefill=\{\{/);
    assert.match(PAGE, /checkIn: search\.checkIn/);
    assert.match(PAGE, /destinationValue=\{search\.destination\}/);
  });

  it("PUTS THE PARTNER SEARCH BELOW THE QUARTERS, not above them", () => {
    // The order is the argument. The quarter and the seasonal warnings are why
    // somebody searched here rather than on a comparison site; under a booking
    // widget, this is a worse comparison site.
    // The quarters moved into <StayQuarters> when each one became searchable
    // in its own right; the heading now lives in that component. What this
    // test is guarding is the order, so it follows the block rather than the
    // words inside it.
    const quarter = PAGE.indexOf("<StayQuarters");
    const partner = PAGE.indexOf("Check prices and availability");
    assert.ok(quarter > 0 && partner > 0);
    assert.ok(quarter < partner, "the partner search comes before the reason to trust it");
  });
});
