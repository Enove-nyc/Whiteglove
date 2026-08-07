import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aidProblem,
  allezUrl,
  CAMPAIGN,
  DEFAULT_PROVIDER,
  describeStay22,
  hotelButtonLabel,
  isProvider,
  mergeStay22,
  NO_STAY22,
  PROVIDERS,
  type Stay22Settings,
  stay22IsOn,
} from "@/lib/stay22";

/**
 * The hotel search, through Stay22.
 *
 * THIS IS THE ONLY ROUTE TO EARNING ON HOTELS. Booking.com turned the site down
 * through Commission Junction, and the Travelpayouts account came back with
 * flights and cars but no hotel programme — so the most-used search was the one
 * with no way to earn at all.
 *
 * Unlike the other two, this is BUILT rather than wrapped: Stay22 publishes its
 * search format and it wants exactly what the hotel form already holds. Which
 * means these tests are about the URL being right, because a wrong one does not
 * throw — it opens a hotel search for the wrong place, or the wrong dates, and
 * nobody finds out until somebody has booked.
 */

const on = (over: Partial<Stay22Settings> = {}): Stay22Settings => ({ aid: "wg123", provider: "roam", ...over });
const search = { address: "Krakow", checkin: "2026-09-01", checkout: "2026-09-05", adults: 2 };

describe("the ID", () => {
  it("takes the code off the dashboard", () => {
    assert.equal(aidProblem("wg123"), null);
    assert.equal(aidProblem("white-glove_1"), null);
  });

  it("refuses the whole Allez link, which is what somebody will paste", () => {
    assert.match(aidProblem("https://www.stay22.com/allez/roam?aid=wg123")!, /Take just the aid=/);
  });

  it("refuses the embed script", () => {
    assert.match(aidProblem('<script src="https://scripts.stay22.com/x.js">')!, /script rather than the ID/);
  });

  it("refuses anything with spaces or punctuation in it", () => {
    assert.match(aidProblem("wg 123")!, /letters, numbers/);
  });

  it("says nothing about an empty box", () => {
    // Not set is not an error; it is where the site already was.
    assert.equal(aidProblem(""), null);
  });
});

describe("whether hotels go through it", () => {
  it("is off with no ID", () => {
    assert.equal(stay22IsOn(NO_STAY22), false);
    assert.equal(stay22IsOn(undefined), false);
  });

  it("is on with one", () => {
    assert.equal(stay22IsOn(on()), true);
  });

  it("IS OFF WITH A BROKEN ID rather than building a link nobody is paid for", () => {
    // A malformed aid would produce a search that opens, works, and credits
    // nobody — the exact failure the searches already had once.
    assert.equal(stay22IsOn(on({ aid: "https://www.stay22.com/allez/roam?aid=wg123" })), false);
  });
});

describe("what is stored", () => {
  it("drops an ID it would refuse rather than keeping it", () => {
    assert.equal(mergeStay22({ aid: "a b c", provider: "roam" }).aid, "");
  });

  it("falls back to letting Stay22 choose when the provider is unknown", () => {
    assert.equal(mergeStay22({ aid: "wg1", provider: "hotelz" as never }).provider, DEFAULT_PROVIDER);
    assert.equal(mergeStay22(null).provider, DEFAULT_PROVIDER);
  });

  it("knows its own provider list", () => {
    for (const p of PROVIDERS) assert.equal(isProvider(p.key), true, p.key);
    assert.equal(isProvider("kayak"), false);
  });
});

describe("the address Allez is actually sent", () => {
  it("carries the traveller's own place, dates and party", () => {
    const url = new URL(allezUrl(search, on()));
    assert.equal(url.host, "www.stay22.com");
    assert.equal(url.pathname, "/allez/roam");
    assert.equal(url.searchParams.get("aid"), "wg123");
    assert.equal(url.searchParams.get("address"), "Krakow");
    assert.equal(url.searchParams.get("checkin"), "2026-09-01");
    assert.equal(url.searchParams.get("checkout"), "2026-09-05");
    assert.equal(url.searchParams.get("adults"), "2");
  });

  it("puts aid first, which is how Stay22 attributes a malformed link", () => {
    assert.match(allezUrl(search, on()), /\?aid=/);
  });

  it("labels the bookings so this site's are countable", () => {
    assert.equal(new URL(allezUrl(search, on())).searchParams.get("campaign"), CAMPAIGN);
  });

  it("uses underscores in the label, because a hyphen would split it", () => {
    assert.doesNotMatch(CAMPAIGN, /-/);
  });

  it("sends people to the desk that was chosen", () => {
    for (const p of PROVIDERS) {
      assert.equal(new URL(allezUrl(search, on({ provider: p.key }))).pathname, `/allez/${p.key}`);
    }
  });

  it("never asks for nought guests", () => {
    for (const adults of [0, -3, Number.NaN]) {
      assert.equal(new URL(allezUrl({ ...search, adults }, on())).searchParams.get("adults"), "1");
    }
  });

  it("encodes a place with a space or an accent in it", () => {
    const url = new URL(allezUrl({ ...search, address: "Kraków, Małopolskie" }, on()));
    assert.equal(url.searchParams.get("address"), "Kraków, Małopolskie");
    assert.doesNotMatch(url.search, / /);
  });

  it("leaves out dates that were never chosen instead of sending blanks", () => {
    const url = new URL(allezUrl({ ...search, checkin: "", checkout: "" }, on()));
    assert.equal(url.searchParams.has("checkin"), false);
    assert.equal(url.searchParams.has("checkout"), false);
  });
});

describe("the traveller is told where they are going", () => {
  it("says Booking.com while Stay22 is off — which is where they go", () => {
    assert.equal(hotelButtonLabel(undefined), "Search hotels on Booking.com");
    assert.equal(hotelButtonLabel(NO_STAY22), "Search hotels on Booking.com");
  });

  it("stops saying Booking.com the moment it is not Booking.com", () => {
    // The button is the only warning a traveller gets before a new tab opens
    // on a site they did not choose.
    assert.doesNotMatch(hotelButtonLabel(on()), /Booking\.com/);
    assert.match(hotelButtonLabel(on()), /Stay22/);
  });

  it("names the pinned desk when one is pinned", () => {
    assert.match(hotelButtonLabel(on({ provider: "expedia" })), /Expedia/);
  });
});

describe("what the admin is told", () => {
  it("says plainly that hotels earn nothing, and why that cannot be fixed elsewhere", () => {
    const said = describeStay22(NO_STAY22);
    assert.match(said, /earns nothing/);
    assert.match(said, /turned this site down/);
  });

  it("names the ID and the desk once it is on", () => {
    const said = describeStay22(on());
    assert.match(said, /wg123/);
    assert.match(said, /suits each traveller/);
  });

  it("does not call a broken ID working", () => {
    assert.match(describeStay22(on({ aid: "a b" })), /^Not in use/);
  });

  it("always says something", () => {
    for (const s of [NO_STAY22, on(), on({ aid: "a b" }), on({ provider: "vrbo" })]) {
      assert.ok(describeStay22(s).length > 40);
    }
  });
});
