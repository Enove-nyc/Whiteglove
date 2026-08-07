import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SLOTS, slotInfo } from "@/lib/travelpayouts";

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

  it("names which search every hand-off is, so it can be routed", () => {
    // A call with no slot goes out direct however the earnings screen is set
    // up — the same silence as the untagged car link, one layer along.
    const unrouted: string[] = [];
    for (const match of SOURCE.matchAll(/(\w*\s*)openPartner\(([\s\S]{0,300}?)\);/g)) {
      if (match[1].trim() === "function") continue;
      const call = match[2];
      if (/"(flights|hotels|cars)"/.test(call)) continue;
      unrouted.push(call.replace(/\s+/g, " ").slice(0, 70));
    }
    assert.deepEqual(unrouted, [], `a hand-off that can never be routed through Travelpayouts: ${unrouted.join(" | ")}`);
  });
});

describe("the routing checks the partner the search really opens", () => {
  it("builds each search on the host lib/travelpayouts.ts says it does", () => {
    // linkProblem refuses a pasted link whose destination does not match
    // slotInfo(slot).host. If the component ever moves a search to a different
    // partner, that guard silently starts refusing correct links instead —
    // so the two have to be checked against each other.
    for (const { slot, host } of SLOTS) {
      assert.ok(
        SOURCE.includes(`https://${host}/`) || SOURCE.includes(`https://${host}`),
        `${slot} is checked against ${host}, which the component never builds`,
      );
    }
    // Flights are built in lib/kayak-search.ts rather than the component.
    assert.match(readFileSync("lib/kayak-search.ts", "utf8"), new RegExp(`https://${slotInfo("flights").host}/flights/`));
  });
});
