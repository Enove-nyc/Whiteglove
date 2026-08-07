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
      if (/withAffiliate|kayakUrl|affiliate\?\./.test(call)) continue;
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
});
