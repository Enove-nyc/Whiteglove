import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolveLink } from "@/lib/affiliate/partners";
import { goHref, readAffiliateRequest } from "@/lib/affiliate/request";
import { airportCode } from "@/lib/kayak-search";
import { NO_STAY22 } from "@/lib/stay22";

/**
 * Every link that leaves this site for a booking partner is built on the
 * server, from one registry, and carries whatever the owner has configured.
 *
 * THIS EXISTS BECAUSE CAR HIRE NEVER DID. Flights and hotels each tagged their
 * outgoing link; the cars form was not even passed the keys, so every car
 * search opened on Kayak untagged and earned nothing — no matter what was
 * configured, and with the page looking identical either way. The connections
 * screen meanwhile promised KAYAK_AFFILIATE_PARAMS covered "the flight AND CAR
 * searches", which was a promise the code did not keep.
 *
 * An untagged partner link is the one kind of bug that costs money on every
 * single use and can never be seen.
 *
 * WHAT THESE ASSERTIONS NOW GUARD, AND WHY IT CHANGED. They used to check that
 * each openPartner() call in the booking page was handed the marker. That was
 * the right check for a page that built partner URLs in the browser — and
 * building them in the browser was itself the problem: the page had to be
 * given the Stay22 ID, the Travelpayouts marker and the Booking.com affiliate
 * ID in order to do it, and a client component's props are serialised into the
 * page. All of it was readable in view-source.
 *
 * So the booking page no longer knows any of it. It sends what the traveller
 * typed to /go, which resolves the partner on the server. The guarantee is
 * stronger than the one it replaces — there is no longer a way to write an
 * untagged link here, because there is no longer a way to write a partner link
 * here at all — and these hold it in place.
 */

const SOURCE = readFileSync("components/BookPartners.tsx", "utf8");
const PAGE = readFileSync("app/book/page.tsx", "utf8");

/**
 * The component without its imports or its comments.
 *
 * `import { hotelButtonLabel } from "@/lib/stay22"` is a piece of wording, not
 * an account number, and the comments below explain at length what used to be
 * here — both would trip a search for the names of the things that leaked.
 * What matters is whether the VALUES are in the component's own code.
 */
const CODE = SOURCE.replace(/^import .*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("the booking page cannot leak an account number", () => {
  it("is not handed one", () => {
    // THE ONE THAT MATTERS NOW. Each of these was measured in the built page's
    // source before this changed — the marker, the Booking.com ID and the
    // Kayak params were all there in plain text.
    for (const secret of ["bookingAid", "kayakParams", "travelpayoutsMarker", "stay22Settings", "travelpayouts"]) {
      assert.doesNotMatch(CODE, new RegExp(`\\b${secret}\\b`),
        `${secret} is back in the booking component, and so back in the page source`);
    }
  });

  it("the page does not read the stores in order to pass them down", () => {
    assert.doesNotMatch(PAGE, /readStay22|readTravelpayouts/, "the booking page is reading affiliate config again");
    assert.doesNotMatch(PAGE, /BOOKING_AFFILIATE_ID|KAYAK_AFFILIATE_PARAMS|TRAVELPAYOUTS_MARKER/);
    assert.doesNotMatch(PAGE, /<BookPartners[^>]*affiliate=/);
  });

  it("names no partner address at all", () => {
    // The searches used to be typed into this component as kayak.com and
    // booking.com URLs, which is what made the partner unchangeable AND what
    // required the keys to be here.
    for (const host of ["kayak.com", "booking.com", "stay22.com", "aviasales", "tp.media"]) {
      assert.doesNotMatch(CODE, new RegExp(host.replace(".", "\\.")), `${host} is being built by hand again`);
    }
  });
});

describe("no hand-off goes out unnamed", () => {
  it("every one says which product it is, so /go can route it", () => {
    // A hand-off with no product is one /go refuses outright — the same
    // silence as the untagged car link, one layer along.
    const unnamed: string[] = [];
    for (const match of SOURCE.matchAll(/(\w*\s*)openPartner\(([\s\S]{0,400}?)\);/g)) {
      // The helper's own definition is not a call.
      if (match[1].trim() === "function") continue;
      const call = match[2];
      if (/product: "(flight|hotel|car)"/.test(call)) continue;
      unnamed.push(call.replace(/\s+/g, " ").slice(0, 70));
    }
    assert.deepEqual(unnamed, [], `a hand-off /go cannot route: ${unnamed.join(" | ")}`);
  });

  it("all three searches still hand off", () => {
    // The cars form was once not even wired up. Absence is the failure mode.
    for (const product of ["flight", "hotel", "car"]) {
      assert.match(SOURCE, new RegExp(`product: "${product}"`), `the ${product} search no longer hands off`);
    }
  });

  it("goes out through /go and nowhere else", () => {
    assert.match(SOURCE, /goHref\(/);
    for (const call of SOURCE.match(/window\.open\([^;]*?\);/g) ?? []) {
      assert.match(call, /goHref/, `a window opened on something other than /go: ${call}`);
    }
  });
});

describe("the whole journey survives the hand-off", () => {
  const config = { travelpayouts: {}, stay22: NO_STAY22, partners: { flights: "kayak" } as never };

  it("carries every leg of a multi-city trip, not just the first", () => {
    // MOVING THIS PAGE ONTO /go WOULD OTHERWISE HAVE DROPPED THEM. A five-leg
    // trip arriving as one leg opens a working search for the wrong journey,
    // and nobody reports that as a bug — they just book somewhere else.
    const legs = [
      { from: "JFK", to: "FCO", date: "2026-09-01" },
      { from: "FCO", to: "ATH", date: "2026-09-05" },
      { from: "ATH", to: "JFK", date: "2026-09-12" },
    ];
    const href = goHref({ product: "flight", legs });
    const parsed = readAffiliateRequest(new URLSearchParams(href.slice(href.indexOf("?") + 1)));
    assert.deepEqual(parsed?.legs, legs, "the legs did not survive the round trip through the URL");

    const url = resolveLink(parsed!, config)?.url ?? "";
    for (const leg of legs) {
      assert.ok(url.includes(leg.from) && url.includes(leg.to), `${leg.from}-${leg.to} is missing from ${url}`);
      assert.ok(url.includes(leg.date.slice(2).replace(/-/g, "")) || url.includes(leg.date), `${leg.date} is missing`);
    }
  });

  it("hands off airport codes rather than what the box says", () => {
    // A LEG IS THREE HYPHEN-SEPARATED FIELDS, and the airport box holds a
    // label after a pick — "New York (JFK)". The booking page was sending the
    // label, so a city with a hyphen in its name split into four fields and
    // the leg was dropped on arrival: /go could build nothing, the new tab
    // bounced back to the site, and the referral went with it. Measured on
    // production with Cluj-Napoca before this was changed.
    assert.match(SOURCE, /legs: wanted\.legs\.map\(\(l\) => \(\{ from: airportCode\(l\.from\), to: airportCode\(l\.to\)/,
      "the flights hand-off is sending airport labels again");

    const legs = [{ from: airportCode("Cluj-Napoca (CLJ)"), to: airportCode("Rome (FCO)"), date: "2026-09-01" }];
    const href = goHref({ product: "flight", legs, checkOut: "2026-09-08" });
    const parsed = readAffiliateRequest(new URLSearchParams(href.slice(href.indexOf("?") + 1)));
    assert.deepEqual(parsed?.legs, [{ from: "CLJ", to: "FCO", date: "2026-09-01" }]);
    assert.match(resolveLink(parsed!, config)?.url ?? "", /CLJ-FCO\/2026-09-01\/2026-09-08/);
  });

  it("still reads a leg from a page that has not been reloaded since the fix", () => {
    // A browser holding the previous version of the booking page sends
    // labels. Refusing them would break the search for exactly as long as
    // somebody's tab stayed open, which is not a trade worth making.
    const parsed = readAffiliateRequest(new URLSearchParams("product=flight&legs=New York (JFK)-Rome (FCO)-2026-09-01"));
    assert.deepEqual(parsed?.legs, [{ from: "JFK", to: "FCO", date: "2026-09-01" }]);
  });

  it("refuses a leg that is not three whole fields", () => {
    // This is an outside input even though the site wrote the link: anybody
    // can edit a query string, and /go must never be talked into forwarding
    // somewhere of the sender's choosing.
    const parsed = readAffiliateRequest(new URLSearchParams("product=flight&legs=JFK-FCO-nonsense_-_-"));
    assert.deepEqual(parsed?.legs, []);
  });

  it("takes no destination URL, however it is dressed up", () => {
    const parsed = readAffiliateRequest(new URLSearchParams("product=flight&legs=https://evil.example.com"));
    assert.deepEqual(parsed?.legs, []);
    const href = goHref({ product: "hotel", destination: "https://evil.example.com" });
    assert.doesNotMatch(resolveLink(readAffiliateRequest(new URLSearchParams(href.slice(href.indexOf("?") + 1)))!, config)?.url ?? "", /^https:\/\/evil/);
  });
});

describe("what the visitor is told", () => {
  it("takes the hotel button's wording from the one function that owns it", () => {
    // It no longer varies by provider — the owner's decision, see
    // hotelButtonLabel in lib/stay22.ts — but it is still read from there
    // rather than typed into the component, so the wording stays in one place.
    assert.match(SOURCE, /searchLabel=\{hotelButtonLabel\(\)\}/);
  });

  it("names no partner on any search button the visitor presses", () => {
    for (const label of SOURCE.match(/searchLabel="[^"]*"/g) ?? []) {
      assert.doesNotMatch(label, /Kayak|Booking\.com|Stay22|Expedia/i, label);
    }
  });
});
