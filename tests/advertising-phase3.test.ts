import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { LIVE_PLACEMENTS } from "@/lib/ad-types";
import { PREMIUM_PLACEMENTS, placementLabel } from "@/lib/ad-placements";
import { promotionIsVisible } from "@/lib/admin-content";
import { campaignStatusFromCreative } from "@/lib/campaigns";
import { advertiserIsHoldable, blankAdvertiser } from "@/lib/advertisers";
import { reportForAdvertiser, reportIsEmpty } from "@/lib/advertiser-report";
import { isPrivatePath, publicPaths } from "@/lib/site-map";

describe("every live placement is labelled as paid", () => {
  it("never returns an empty label", () => {
    for (const placement of LIVE_PLACEMENTS) {
      const label = placementLabel(placement);
      assert.ok(label.length > 0, `${placement} has no paid label`);
      assert.match(label, /Sponsored|Featured partner|Sponsored content/);
    }
  });

  it("gives every premium spot a renderer on a public page", () => {
    const sources = [
      readFileSync("app/page.tsx", "utf8"),
      readFileSync("app/hotels/page.tsx", "utf8"),
      readFileSync("app/things-to-do/page.tsx", "utf8"),
      readFileSync("app/directory/page.tsx", "utf8"),
      readFileSync("app/destinations/[destination]/page.tsx", "utf8"),
      readFileSync("app/travel-insurance/page.tsx", "utf8"),
      readFileSync("app/esim/page.tsx", "utf8"),
    ].join("\n");
    for (const spec of PREMIUM_PLACEMENTS) {
      assert.match(sources, new RegExp(`placement="${spec.value}"`), `${spec.value} is typed but rendered nowhere`);
    }
  });
});

describe("a draft is not live, a preview is not public", () => {
  it("hides a draft from visitors", () => {
    assert.equal(promotionIsVisible({ enabled: false, previewToken: "" }), false);
    assert.equal(promotionIsVisible({ enabled: false, previewToken: "abc" }), false);
    assert.equal(promotionIsVisible({ enabled: false, previewToken: "abc" }, ""), false);
  });

  it("shows a preview only with the matching token", () => {
    assert.equal(promotionIsVisible({ enabled: false, previewToken: "abc" }, "abc"), true);
    assert.equal(promotionIsVisible({ enabled: false, previewToken: "abc" }, "nope"), false);
  });

  it("shows a published one without a token", () => {
    assert.equal(promotionIsVisible({ enabled: true, previewToken: "" }), true);
    assert.equal(promotionIsVisible({ enabled: true, previewToken: "abc" }, ""), true);
  });

  it("maps a creative onto Draft → Preview → Publish", () => {
    assert.equal(campaignStatusFromCreative({ enabled: false }), "draft");
    assert.equal(campaignStatusFromCreative({ enabled: false, previewToken: "x" }), "preview");
    assert.equal(campaignStatusFromCreative({ enabled: true, previewToken: "x" }), "published");
  });
});

describe("an advertiser record is not invented from nothing", () => {
  it("refuses a blank one", () => {
    assert.equal(advertiserIsHoldable(blankAdvertiser()), false);
    assert.equal(advertiserIsHoldable({ name: "Hotel X", email: "" }), true);
    assert.equal(advertiserIsHoldable({ name: "", email: "a@b.c" }), true);
  });
});

describe("the directory hides empty categories", () => {
  it("does not offer a tab with nothing behind it", () => {
    const browser = readFileSync("components/DirectoryBrowser.tsx", "utf8");
    assert.match(browser, /tab\.key === "ALL" \|\| \(counts\[tab\.key\] \?\? 0\) > 0/);
  });
});

describe("an advertiser report never includes somebody else's ads", () => {
  const advertiser = {
    ...blankAdvertiser(),
    id: "adv-1",
    name: "Hotel X",
    email: "x@example.com",
    reportToken: "tok",
  };

  it("keeps another business out", () => {
    const report = reportForAdvertiser(
      advertiser,
      [
        { id: "mine", title: "Ours", enabled: true, startDate: "", endDate: "", placements: [], impressions: 10, clicks: 1, advertiserId: "adv-1" },
        { id: "theirs", title: "Theirs", enabled: true, startDate: "", endDate: "", placements: [], impressions: 999, clicks: 50, advertiserId: "adv-2" },
      ],
      [],
    );
    assert.equal(report.ungrouped.length, 1);
    assert.equal(report.ungrouped[0].id, "mine");
    assert.equal(reportIsEmpty(report), false);
  });

  it("is empty when they have nothing running", () => {
    const report = reportForAdvertiser(advertiser, [], []);
    assert.equal(reportIsEmpty(report), true);
  });
});

describe("the advertise page is public and the report is not", () => {
  it("submits /advertise to crawlers and keeps the token report out", () => {
    assert.ok(publicPaths().some((entry) => entry.path === "/advertise"));
    assert.equal(isPrivatePath("/advertise"), false);
    assert.equal(isPrivatePath("/advertise/report"), true);
    assert.equal(isPrivatePath("/advertise/report/abc"), true);
  });
});
