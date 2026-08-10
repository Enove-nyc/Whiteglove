import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Every link that leaves this site for a booking partner carries the affiliate
 * marker.
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
 */

const SOURCE = readFileSync("components/BookPartners.tsx", "utf8");

describe("no partner link goes out untagged", () => {
  it("tags every outgoing partner link", () => {
    // THE ONE THAT MATTERS. Each openPartner() call either carries the marker
    // itself or is handed a URL that was built with it.
    const untagged: string[] = [];
    for (const match of SOURCE.matchAll(/(\w*\s*)openPartner\(([\s\S]{0,200}?)\);/g)) {
      // The helper's own definition is not a call.
      if (match[1].trim() === "function") continue;
      const call = match[2];
      // allezUrl cannot be built without a Stay22 ID — the ID is a required
      // field on the settings it takes, and stay22IsOn refuses a malformed one
      // before it is ever called. So a call to it always carries the money.
      if (/withAffiliate|kayakUrl|allezUrl|affiliate\?\./.test(call)) continue;
      // A URL built on the line above and tagged there is fine; check back a
      // little for the marker being applied to it.
      const before = SOURCE.slice(Math.max(0, (match.index ?? 0) - 400), match.index);
      if (/affiliate\?\.(bookingAid|kayakParams|travelpayoutsMarker)/.test(before)) continue;
      untagged.push(call.replace(/\s+/g, " ").slice(0, 70));
    }
    assert.deepEqual(untagged, [], `a partner link with no affiliate marker: ${untagged.join(" | ")}`);
  });

  it("gives the cars form the keys at all", () => {
    // It was not even a parameter. Nothing downstream could have tagged it.
    assert.match(SOURCE, /function CarsForm\(\{ affiliate,/);
    assert.match(SOURCE, /<CarsForm affiliate=\{affiliate\}/);
  });

  it("names which search every hand-off is, so it can be routed", () => {
    // A call with no slot goes out direct however the earnings screen is set
    // up — the same silence as the untagged car link, one layer along.
    const unrouted: string[] = [];
    for (const match of SOURCE.matchAll(/(\w*\s*)openPartner\(([\s\S]{0,300}?)\);/g)) {
      if (match[1].trim() === "function") continue;
      const call = match[2];
      if (/"(flights|hotels|cars)"/.test(call)) continue;
      // A hand-off built for a network of its own must NOT be routed through
      // Travelpayouts as well: Stay22 owns its own redirect, and wrapping one
      // in the other would hand the booking to whichever got there first.
      if (/allezUrl/.test(call)) continue;
      unrouted.push(call.replace(/\s+/g, " ").slice(0, 70));
    }
    assert.deepEqual(unrouted, [], `a hand-off that can never be routed through Travelpayouts: ${unrouted.join(" | ")}`);
  });
});

describe("hotels reach Stay22 when it is on", () => {
  it("builds the hotel search for Stay22 rather than sending Booking.com's URL through it", () => {
    // Wrapping a Booking.com search inside an Allez link would work and would
    // throw away the traveller's dates. The form's own fields are what Allez
    // wants, so the search is built.
    assert.match(SOURCE, /if \(stay22IsOn\(affiliate\?\.stay22\)\)/);
    assert.match(SOURCE, /allezUrl\(/);
  });

  it("never sends a Stay22 search through Travelpayouts as well", () => {
    // Two redirects racing for the same booking credits whichever wins, which
    // is not a thing anybody should be guessing about.
    const call = SOURCE.slice(SOURCE.indexOf("allezUrl("), SOURCE.indexOf("allezUrl(") + 300);
    assert.doesNotMatch(call, /travelpayouts/);
  });

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

describe("the routing checks the partner the search really opens", () => {
  it("does not build a partner address by hand any more", () => {
    // The searches used to be typed into this component as kayak.com URLs,
    // which is what made the partner unchangeable. They come from
    // lib/travel-partners.ts now, so a new programme is a dropdown rather than
    // an edit here. The one exception is Kayak's own builder, which handles
    // multi-city and is called by name.
    assert.match(SOURCE, /flightUrl\(partner,/);
    assert.match(SOURCE, /carUrl\(carPartner,/);
    assert.doesNotMatch(SOURCE, /https:\/\/www\.kayak\.com\/cars\/\$\{encodeURIComponent/);
  });

  it("passes the partner choice into the routing, or the link check judges the wrong one", () => {
    // throughTravelpayouts validates the pasted link against the chosen
    // partner. Called without the choices it falls back to the defaults, and a
    // correctly configured Kayak link would be silently dropped.
    for (const call of SOURCE.match(/openPartner\([^;]*?\);/g) ?? []) {
      if (!call.includes("affiliate?.travelpayouts")) continue;
      assert.match(call, /affiliate\?\.partners/, call);
    }
  });
});
