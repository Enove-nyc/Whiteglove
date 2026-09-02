import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  HANDOFF_ACTION,
  HANDOFF_BODY,
  HANDOFF_HEADING,
  continueTripHref,
  shouldOfferHandoff,
} from "@/lib/itineraries-handoff";
import { BRAND_ORIGIN } from "@/lib/site-brand-core";

describe("it goes one way, and only one way", () => {
  it("is offered on the kosher brand and never on itineraries", () => {
    // The standing rule: Kosher Travel may point at Itineraries; Itineraries
    // never points back, because a link home would tell that product's
    // customers it is really something else.
    assert.equal(shouldOfferHandoff({ brand: "kosher", hasTrip: true }), true);
    assert.equal(shouldOfferHandoff({ brand: "itineraries", hasTrip: true }), false);
  });

  it("is not offered in front of an empty planner", () => {
    // An invitation to carry on with a trip that does not exist is an
    // advertisement, and this site does not put one there.
    assert.equal(shouldOfferHandoff({ brand: "kosher", hasTrip: false }), false);
  });

  it("the component checks the brand itself rather than trusting its caller", () => {
    const view = readFileSync("components/ContinueInItineraries.tsx", "utf8");
    assert.match(view, /const brand = await currentBrand\(\)/);
    assert.match(view, /if \(!shouldOfferHandoff\(\{ brand, hasTrip \}\)\) return null;/);
  });
});

describe("where it sends somebody", () => {
  it("is the planner on the other domain, not a marketing page", () => {
    assert.equal(continueTripHref(), `${BRAND_ORIGIN.itineraries}/itinerary`);
  });

  it("is the itineraries domain and never a path that only exists here", () => {
    // A cross-domain path that exists on one side only is a 404, which is how
    // /group broke once already.
    assert.match(continueTripHref(), /^https:\/\/[^/]*whitegloveitineraries\.com\//);
  });
});

describe("what it promises", () => {
  const words = `${HANDOFF_HEADING} ${HANDOFF_BODY} ${HANDOFF_ACTION}`.toLowerCase();

  it("PROMISES NO PLANNING SERVICE — White Glove plans nobody's trip", () => {
    for (const claim of ["we'll plan", "we will plan", "let us plan", "plan it for you", "concierge", "done-for-you", "planning service", "our team"]) {
      assert.ok(!words.includes(claim), `the hand-off offers ${claim}`);
    }
  });

  it("says the trip is already there rather than promising a transfer", () => {
    // Both products read one store, so there is nothing to migrate — and a
    // word like "export" or "copy" would invent a step that does not exist.
    assert.match(HANDOFF_BODY, /already there/i);
    for (const invented of ["export", "transfer", "copy your", "import your", "migrate"]) {
      assert.ok(!words.includes(invented), `the hand-off invents a ${invented} step`);
    }
  });

  it("DOES NOT PRETEND THEY ARE ALREADY SIGNED IN THERE", () => {
    // A session belongs to a domain. Finding that out the hard way is a
    // traveller deciding the site is broken.
    assert.match(HANDOFF_BODY, /sign in/i);
    assert.match(HANDOFF_BODY, /same account/i);
  });

  it("offers tools, not somebody to hand the trip to", () => {
    assert.match(HANDOFF_BODY, /planner/i);
  });
});

describe("it appears once, where it is relevant", () => {
  it("is under the planner and nowhere else", () => {
    assert.match(readFileSync("app/itinerary/page.tsx", "utf8"), /<ContinueInItineraries hasTrip=\{hasTrip\}/);
    for (const page of ["app/page.tsx", "components/Navbar.tsx", "components/Footer.tsx"]) {
      assert.ok(!readFileSync(page, "utf8").includes("ContinueInItineraries"), `${page} carries the hand-off too`);
    }
  });
});
