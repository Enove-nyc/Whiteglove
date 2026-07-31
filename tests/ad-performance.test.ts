import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adConcerns,
  adState,
  adsNeedingAttention,
  ENOUGH_VIEWS,
  manageAds,
  performance,
  type AdLike,
} from "@/lib/ad-performance";

/**
 * An advertisement manager, rather than a list of advertisements.
 *
 * The two things being tested are the two the screen got wrong: whether an
 * advert is actually running, and whether its numbers mean anything. An advert
 * that finished in March still said "enabled"; three clicks from twelve views
 * still printed as 25%.
 */

const ad = (over: Partial<AdLike> = {}): AdLike => ({
  id: "a",
  title: "Test banner",
  enabled: true,
  startDate: "",
  endDate: "",
  placements: ["homepage-promo"],
  impressions: 0,
  clicks: 0,
  ...over,
});

const TODAY = "2026-09-01";

describe("whether it is running", () => {
  it("is live with no dates and a placement", () => {
    assert.equal(adState(ad(), TODAY), "live");
  });

  it("is finished once the end date has passed", () => {
    assert.equal(adState(ad({ endDate: "2026-08-31" }), TODAY), "finished");
  });

  it("is still live on its last day", () => {
    // "Ends 1 September" means it runs on the first.
    assert.equal(adState(ad({ endDate: "2026-09-01" }), TODAY), "live");
  });

  it("is scheduled before it starts, and live on the day", () => {
    assert.equal(adState(ad({ startDate: "2026-09-02" }), TODAY), "scheduled");
    assert.equal(adState(ad({ startDate: "2026-09-01" }), TODAY), "live");
  });

  it("counts being switched off before anything else", () => {
    // Paused beats the dates: it is a decision somebody made.
    assert.equal(adState(ad({ enabled: false, endDate: "2026-08-01" }), TODAY), "paused");
  });

  it("is nowhere when it has no placement, whatever the dates say", () => {
    // It cannot appear, so calling it live would be a lie the owner acts on.
    assert.equal(adState(ad({ placements: [] }), TODAY), "nowhere");
  });
});

describe("what the numbers are allowed to claim", () => {
  it("says nothing at all before it has been shown", () => {
    assert.deepEqual(performance(ad()), { rate: null, says: "Not shown yet" });
  });

  it("refuses to print a percentage from too few views", () => {
    // 3 from 12 is 25%, which sounds excellent and means nothing.
    const p = performance(ad({ impressions: 12, clicks: 3 }));
    assert.equal(p.rate, null);
    assert.match(p.says, /3 from 12/);
    assert.match(p.says, /too few to tell/i);
    assert.ok(!p.says.includes("%"));
  });

  it("gives a rate once there are enough", () => {
    const p = performance(ad({ impressions: 1000, clicks: 25 }));
    assert.equal(p.rate, 2.5);
    assert.match(p.says, /2\.5%/);
  });

  it("draws the line at the stated threshold, not somewhere else", () => {
    assert.equal(performance(ad({ impressions: ENOUGH_VIEWS - 1, clicks: 1 })).rate, null);
    assert.notEqual(performance(ad({ impressions: ENOUGH_VIEWS, clicks: 1 })).rate, null);
  });

  it("reports a real zero once there is enough to say it", () => {
    assert.equal(performance(ad({ impressions: 5000, clicks: 0 })).rate, 0);
  });
});

describe("what needs doing", () => {
  it("leads with an advert nobody can see", () => {
    const concerns = adConcerns(ad({ placements: [] }), TODAY);
    assert.equal(concerns[0].weight, 1);
    assert.match(concerns[0].says, /not placed anywhere/i);
  });

  it("flags one that finished and is still switched on", () => {
    const concerns = adConcerns(ad({ endDate: "2026-03-01" }), TODAY);
    assert.ok(concerns.some((c) => c.weight === 2 && /still switched on/.test(c.says)));
  });

  it("gives warning before one ends", () => {
    assert.ok(adConcerns(ad({ endDate: "2026-09-05" }), TODAY).some((c) => /Ends in 4 days/.test(c.says)));
    assert.ok(adConcerns(ad({ endDate: "2026-09-01" }), TODAY).some((c) => /Ends today/.test(c.says)));
    // Two months out is not "ending soon". Checked for the absence of that
    // concern specifically — this advert has no views yet, which raises its
    // own quiet note, and asserting "nothing at all" would fail on that.
    assert.ok(!adConcerns(ad({ endDate: "2026-10-30", impressions: 500, clicks: 9 }), TODAY).some((c) => /Ends/.test(c.says)));
  });

  it("does not call a handful of views without a click a problem", () => {
    // Forty views and no click is not a finding. Five thousand is.
    assert.equal(adConcerns(ad({ impressions: 40, clicks: 0 }), TODAY).length, 0);
    assert.ok(adConcerns(ad({ impressions: 5000, clicks: 0 }), TODAY).some((c) => /never clicked/.test(c.says)));
  });

  it("says nothing about a paused advert's dates", () => {
    // It is off. That it also expired is not news.
    assert.deepEqual(adConcerns(ad({ enabled: false, endDate: "2026-01-01" }), TODAY), []);
  });

  it("finds nothing wrong with a healthy one", () => {
    assert.deepEqual(adConcerns(ad({ impressions: 2000, clicks: 60 }), TODAY), []);
  });
});

describe("the order the manager shows them in", () => {
  const ads = [
    ad({ id: "ok", title: "Healthy", impressions: 2000, clicks: 60 }),
    ad({ id: "off", title: "Paused one", enabled: false }),
    ad({ id: "gone", title: "Finished one", endDate: "2026-01-01" }),
    ad({ id: "blind", title: "Nowhere", placements: [] }),
  ];

  it("puts what is wrong first, then what is running, then history", () => {
    assert.deepEqual(manageAds(ads, TODAY).map((m) => m.ad.title), ["Nowhere", "Finished one", "Healthy", "Paused one"]);
  });

  it("does not reorder what it was handed", () => {
    const input = [...ads];
    manageAds(input, TODAY);
    assert.equal(input[0].id, "ok");
  });
});

describe("the line on the dashboard", () => {
  it("is nothing when nothing needs doing", () => {
    assert.equal(adsNeedingAttention([ad({ impressions: 900, clicks: 30 })], TODAY), null);
    assert.equal(adsNeedingAttention([], TODAY), null);
  });

  it("names the advert when there is one", () => {
    const summary = adsNeedingAttention([ad({ title: "Sanz banner", placements: [] })], TODAY);
    assert.equal(summary?.count, 1);
    assert.match(summary!.says, /Sanz banner/);
  });

  it("counts them when there are several", () => {
    const summary = adsNeedingAttention(
      [ad({ id: "1", title: "Aaa", placements: [] }), ad({ id: "2", title: "Bbb", endDate: "2026-01-01" })],
      TODAY,
    );
    assert.equal(summary?.count, 2);
    assert.match(summary!.says, /2 advertisements need a look/);
  });
});
