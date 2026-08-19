import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { featuresFor, mayBrandOwnItinerary, PLAN_FEATURES } from "@/lib/account-limits";
import { brandProblem, cleanBrand, describeBrand, emptyBrand, printBrandFor } from "@/lib/business-brand";

/**
 * A Business account's own letterhead.
 *
 * TWO THINGS THIS HAS TO GET RIGHT, and they pull in opposite directions. The
 * document an agent hands their client must be the agent's — that is the whole
 * feature. And the one credit line saying the itinerary was planned with
 * whiteglovekoshertravel.com must survive everything, because that was the
 * owner's decision and it is the only thing on the page that is not theirs.
 * (The line itself lives in components/PrintableItinerary.tsx and there is no
 * flag anywhere that removes it — which is the point.)
 */

describe("who may brand an itinerary", () => {
  it("is Business, and only Business", () => {
    assert.equal(mayBrandOwnItinerary("business"), true);
    assert.equal(mayBrandOwnItinerary("pro"), false);
    assert.equal(mayBrandOwnItinerary("traveler"), false);
  });

  it("KEEPS BRANDING A BUSINESS THING, NOW THAT PRO HAS AN ENTITLEMENT", () => {
    // This test said Pro was "the same site without the two free limits" and
    // that the day it grew an entitlement, here is where it would be noticed.
    // That day came: Pro keeps the assistant's conversation between visits.
    //
    // What it still holds is the thing it was really protecting — branding is
    // what Business buys, and a new Pro entitlement must not quietly become
    // one. Traveler and Pro are no longer identical, so that comparison is
    // replaced by the claim underneath it.
    assert.equal(PLAN_FEATURES.pro.ownBranding, false);
    assert.equal(PLAN_FEATURES.traveler.ownBranding, false);
    assert.equal(PLAN_FEATURES.business.ownBranding, true);
    assert.equal(featuresFor("pro").assistantHistory, true);
    assert.equal(featuresFor("traveler").assistantHistory, false);
  });
});

describe("what may be saved as a brand", () => {
  it("never blocks turning it off", () => {
    // Somebody with a half-filled form who wants to go back to the White Glove
    // cover should not be argued with.
    assert.equal(brandProblem({ enabled: false }), null);
    assert.equal(brandProblem({ enabled: false, name: "" }), null);
  });

  it("wants a name once it is on", () => {
    assert.match(brandProblem({ enabled: true, name: "  " }) ?? "", /name/i);
    assert.equal(brandProblem({ enabled: true, name: "Kesser Travel" }), null);
  });

  it("refuses a name or a line too long to fit the cover", () => {
    assert.match(brandProblem({ enabled: true, name: "x".repeat(61) }) ?? "", /under 60/);
    assert.match(brandProblem({ enabled: true, name: "Ok", contactLine: "x".repeat(121) }) ?? "", /under 120|to 120/);
  });

  it("tidies anything unrecognisable into an empty brand rather than throwing", () => {
    for (const raw of [null, undefined, "nonsense", 7, { name: 5, enabled: "yes" }]) {
      const brand = cleanBrand("a@b.com", raw);
      assert.equal(brand.account, "a@b.com");
      assert.equal(typeof brand.name, "string");
      // "yes" is not true. Anything but an explicit boolean leaves it off.
      assert.equal(brand.enabled, false);
    }
  });
});

describe("what the printed document actually uses", () => {
  const full = cleanBrand("a@b.com", { name: "Kesser Travel", logoMediaId: "m-1", contactLine: "718 555 0134", enabled: true });

  it("uses the brand when the plan allows it and it is turned on", () => {
    const brand = printBrandFor(full, true);
    assert.equal(brand?.name, "Kesser Travel");
    assert.equal(brand?.logoUrl, "/api/media?id=m-1");
    assert.equal(brand?.contactLine, "718 555 0134");
  });

  it("REFUSES IT THE MOMENT THE PLAN NO LONGER ALLOWS IT", () => {
    // A Business account that lapses stops branding immediately, without
    // anybody deleting anything.
    assert.equal(printBrandFor(full, false), null);
  });

  it("NEVER DELETES WHAT IT REFUSES TO USE", () => {
    // The stored record is untouched, so somebody who comes back finds their
    // letterhead where they left it. Nothing of theirs was thrown away because
    // a card expired.
    printBrandFor(full, false);
    assert.equal(full.name, "Kesser Travel");
    assert.equal(full.logoMediaId, "m-1");
  });

  it("refuses a brand that is off, or has no name to show", () => {
    assert.equal(printBrandFor({ ...full, enabled: false }, true), null);
    assert.equal(printBrandFor({ ...full, name: "  " }, true), null);
    assert.equal(printBrandFor(null, true), null);
    assert.equal(printBrandFor(emptyBrand("a@b.com"), true), null);
  });

  it("treats a name with no logo as a letterhead rather than a failure", () => {
    const brand = printBrandFor({ ...full, logoMediaId: "" }, true);
    assert.equal(brand?.name, "Kesser Travel");
    assert.equal(brand?.logoUrl, "");
  });
});

describe("what somebody is told about their brand", () => {
  it("always says something, whatever the state", () => {
    for (const [brand, allowed] of [
      [null, false],
      [null, true],
      [emptyBrand("a@b.com"), true],
      [cleanBrand("a@b.com", { name: "Kesser", enabled: true }), true],
      [cleanBrand("a@b.com", { name: "Kesser", logoMediaId: "m-1", enabled: true }), true],
    ] as const) {
      assert.ok(describeBrand(brand, allowed).length > 0);
    }
  });

  it("does not dangle an upgrade in front of somebody who cannot have it", () => {
    // It says what a Business account is, once, plainly. It does not ask.
    const line = describeBrand(null, false);
    assert.match(line, /Business/);
    assert.doesNotMatch(line, /upgrade|buy|subscribe/i);
  });
});
