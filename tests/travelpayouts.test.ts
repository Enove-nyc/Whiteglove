import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeLinks,
  describeSlot,
  forwardsTo,
  linkProblem,
  markerIn,
  markerProblem,
  SLOTS,
  slotInfo,
  throughTravelpayouts,
} from "@/lib/travelpayouts";

/**
 * Routing the searches so they earn.
 *
 * THIS EXISTS BECAUSE A MARKER WAS SET AND EARNED NOTHING. TRAVELPAYOUTS_MARKER
 * was read from the environment, carried into the booking page, typed into the
 * Affiliate object — and applied to no link at all. Every check here is a way
 * that can happen again, and every one of them is invisible from the outside:
 * the search opens, the search works, and no money arrives.
 */

const MARKER = "761677";
const booking = (u = "https://www.booking.com/searchresults.html?ss=Krakow") =>
  `https://tp.media/r?marker=${MARKER}&trs=123&p=4115&campaign_id=101&u=${encodeURIComponent(u)}`;
const kayak = (u = "https://www.kayak.com/flights/JFK-KRK/2026-09-01") =>
  `https://tp.media/r?marker=${MARKER}&trs=123&p=4114&campaign_id=100&u=${encodeURIComponent(u)}`;

describe("the marker itself", () => {
  it("takes a plain number", () => {
    assert.equal(markerProblem(MARKER), null);
  });

  it("refuses the script tag somebody will paste instead", () => {
    // The dashboard hands out an Emerald <script> tag as well as an ID, and
    // they look equally official to somebody who has just signed up.
    const said = markerProblem('<script src="https://emrldco.com/NTU5Nzcx.js?t=559771">');
    assert.match(said!, /plain number/);
  });

  it("refuses the base64 blob out of that script", () => {
    assert.match(markerProblem("NTU5Nzcx")!, /digits only/);
  });

  it("says nothing about an empty box", () => {
    // Not set is not an error; it is the state the site has always been in.
    assert.equal(markerProblem(""), null);
  });
});

describe("a pasted link has to be able to earn", () => {
  it("accepts a redirect link for the partner that search opens", () => {
    assert.equal(linkProblem(booking(), "hotels"), null);
    assert.equal(linkProblem(kayak(), "flights"), null);
  });

  it("REFUSES A LINK FOR THE WRONG PARTNER", () => {
    // The one mistake with no symptom. A Booking.com link in the flights row
    // produces a working search that credits nobody.
    const said = linkProblem(booking(), "flights");
    assert.match(said!, /www\.booking\.com/);
    assert.match(said!, /www\.kayak\.com/);
    assert.match(said!, /does not track another/);
  });

  it("refuses a link that never goes through Travelpayouts", () => {
    const said = linkProblem("https://www.booking.com/searchresults.html?aid=123", "hotels");
    assert.match(said!, /nothing is credited/);
  });

  it("refuses a link carrying no marker", () => {
    const said = linkProblem(`https://tp.media/r?trs=1&p=2&u=${encodeURIComponent("https://www.kayak.com/x")}`, "flights");
    assert.match(said!, /not be credited to you/);
  });

  it("refuses a short link, because there is nothing to swap the search into", () => {
    const said = linkProblem(`https://tp.st/abc123?marker=${MARKER}`, "hotels");
    assert.match(said!, /short link/);
  });

  it("refuses something that is not a link at all", () => {
    assert.match(linkProblem("761677", "hotels")!, /not a link/);
  });

  it("says nothing about an empty box", () => {
    for (const { slot } of SLOTS) assert.equal(linkProblem("", slot), null);
  });

  it("reads the marker and the destination back out", () => {
    assert.equal(markerIn(booking()), MARKER);
    assert.equal(forwardsTo(booking()), "www.booking.com");
  });
});

describe("what the traveller's browser actually opens", () => {
  const search = "https://www.booking.com/searchresults.html?ss=Krakow&checkin=2026-09-01";

  it("sends the search through Travelpayouts, keeping the account numbers", () => {
    const out = new URL(throughTravelpayouts(search, booking(), "hotels"));
    assert.equal(out.host, "tp.media");
    assert.equal(out.searchParams.get("marker"), MARKER);
    assert.equal(out.searchParams.get("trs"), "123");
    assert.equal(out.searchParams.get("p"), "4115");
    assert.equal(out.searchParams.get("campaign_id"), "101");
    // And the traveller still ends up at the search they built, not the
    // example address the link was generated from.
    assert.equal(out.searchParams.get("u"), search);
  });

  it("NEVER BREAKS A SEARCH over a bad setting", () => {
    // A wrong link costs a commission. A search that fails costs a customer.
    for (const bad of ["", "   ", "not a url", booking(), `https://tp.st/x?marker=${MARKER}`]) {
      assert.equal(throughTravelpayouts(search, bad, "flights"), search, bad);
    }
    assert.equal(throughTravelpayouts(search, undefined, "hotels"), search);
  });

  it("leaves the search exactly as built when nothing is configured", () => {
    const flight = "https://www.kayak.com/flights/JFK-KRK/2026-09-01?sort=bestflight_a";
    assert.equal(throughTravelpayouts(flight, undefined, "flights"), flight);
  });
});

describe("what the screen says is happening", () => {
  it("says plainly that an unrouted search earns nothing", () => {
    const said = describeSlot("cars", "");
    assert.match(said, /earns nothing/);
    assert.match(said, new RegExp(slotInfo("cars").host.replace(/\./g, "\\.")));
  });

  it("names the marker once a search is routed", () => {
    assert.match(describeSlot("hotels", booking()), new RegExp(MARKER));
  });

  it("does not call a wrong link working", () => {
    assert.match(describeSlot("flights", booking()), /^Not in use/);
  });

  it("counts how many of the three earn", () => {
    assert.match(describeLinks({}), /none of them earns/);
    assert.match(describeLinks({ hotels: booking() }), /Hotels go through Travelpayouts/);
    assert.match(describeLinks({ hotels: booking() }), /earn nothing/);
    assert.match(
      describeLinks({ hotels: booking(), flights: kayak(), cars: kayak("https://www.kayak.com/cars/Krakow/2026-09-01/2026-09-05") }),
      /All three/,
    );
  });

  it("always says something for every search", () => {
    for (const { slot } of SLOTS) assert.ok(describeSlot(slot, "").length > 30, slot);
  });
});

describe("the slots match the searches the site really builds", () => {
  it("covers exactly the three hand-offs on /book", () => {
    assert.deepEqual(SLOTS.map((s) => s.slot), ["flights", "hotels", "cars"]);
  });

  it("names the host each search opens, so a wrong link can be caught", () => {
    // If one of these ever stops matching the URL the component builds, the
    // check above turns from a guard into a nuisance that refuses good links.
    assert.equal(slotInfo("flights").host, "www.kayak.com");
    assert.equal(slotInfo("hotels").host, "www.booking.com");
    assert.equal(slotInfo("cars").host, "www.kayak.com");
  });
});
