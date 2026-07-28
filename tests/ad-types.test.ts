import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AD_KINDS, LIVE_PLACEMENTS, SPOTS_BY_KIND, adStatus, describeAd, readAd, writeAd } from "@/lib/ad-types";
import type { PromotionPlacement } from "@/lib/admin-content";

// The advertisement screen must never offer a place that renders nothing, and
// an advertisement saved through it must read back as the same thing.

describe("only real spots are offered", () => {
  const DEAD: PromotionPlacement[] = ["sidebar", "destination-specific", "accommodation-page", "sponsored-listing"];

  it("no dead placement is offered anywhere", () => {
    const offered = Object.values(SPOTS_BY_KIND).flat().map((s) => s.value);
    for (const dead of DEAD) {
      assert.ok(!offered.includes(dead), `${dead} renders nothing but is offered`);
    }
  });

  it("full-page-takeover is never offered as a spot on its own", () => {
    const offered = Object.values(SPOTS_BY_KIND).flat().map((s) => s.value);
    assert.ok(
      !offered.includes("full-page-takeover"),
      "full-page-takeover is a style, not a place — on its own it renders nothing",
    );
  });

  it("every offered spot is one that actually renders", () => {
    for (const [kind, spots] of Object.entries(SPOTS_BY_KIND)) {
      for (const spot of spots) {
        assert.ok(LIVE_PLACEMENTS.includes(spot.value), `${kind} offers ${spot.value}, which does not render`);
      }
    }
  });

  it("the itinerary footer is offered — it renders but used to be missing", () => {
    const offered = Object.values(SPOTS_BY_KIND).flat().map((s) => s.value);
    assert.ok(offered.includes("itinerary-footer"));
  });

  it("every kind has at least one spot", () => {
    for (const kind of AD_KINDS) {
      assert.ok(SPOTS_BY_KIND[kind.value].length > 0, `${kind.value} has nowhere to go`);
    }
  });
});

describe("an advertisement reads back as what was saved", () => {
  for (const kind of AD_KINDS) {
    for (const spot of SPOTS_BY_KIND[kind.value]) {
      it(`${kind.value} at ${spot.value} round-trips`, () => {
        const stored = writeAd(kind.value, spot.value);
        const read = readAd(stored);
        assert.equal(read.kind, kind.value);
        assert.equal(read.spot, spot.value);
      });
    }
  }

  it("a full-screen advertisement stores a real spot alongside the style", () => {
    const stored = writeAd("fullpage", "homepage-promo");
    assert.ok(stored.includes("full-page-takeover"));
    assert.ok(stored.some((p) => LIVE_PLACEMENTS.includes(p)), "a full-screen ad with no real spot renders nothing");
  });

  it("an old record with only full-page-takeover is read as showing on the home page", () => {
    const read = readAd(["full-page-takeover"]);
    assert.equal(read.kind, "fullpage");
    assert.ok(LIVE_PLACEMENTS.includes(read.spot));
  });

  it("an old record with a dead placement still loads", () => {
    const read = readAd(["sidebar"]);
    assert.ok(read.kind);
    assert.ok(LIVE_PLACEMENTS.includes(read.spot), "it should fall back to a spot that renders");
  });

  it("describes itself in a sentence", () => {
    assert.match(describeAd(["fixed-top-banner"]), /Banner/);
    assert.match(describeAd(["itinerary-footer"]), /itinerar/i);
  });
});

describe("status reads the way an owner expects", () => {
  const base = { placements: ["popup"] as PromotionPlacement[], startDate: "", endDate: "" };

  it("off and never scheduled is a draft", () => {
    assert.equal(adStatus({ ...base, enabled: false }).label, "Draft");
  });

  it("off but scheduled is paused", () => {
    assert.equal(adStatus({ ...base, enabled: false, startDate: "2020-01-01" }).label, "Paused");
  });

  it("on with no dates is live", () => {
    assert.equal(adStatus({ ...base, enabled: true }).label, "Live");
  });

  it("on but starting later is scheduled", () => {
    assert.equal(adStatus({ ...base, enabled: true, startDate: "2999-01-01" }).label, "Scheduled");
  });

  it("on but already ended is finished", () => {
    assert.equal(adStatus({ ...base, enabled: true, endDate: "2000-01-01" }).label, "Finished");
  });
});
