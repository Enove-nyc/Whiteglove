import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { blankPromotion } from "@/lib/admin-content";
import { adStatus } from "@/lib/ad-types";
import {
  FORBIDDEN_ON_AN_ADVERT,
  NOT_FOR_SALE,
  SELLABLE,
  TARGETABLE,
  WHY_NOT_FOR_SALE,
  isNotForSale,
  isSellable,
} from "@/lib/advertising-boundary";
import { featuredDisclosure } from "@/lib/features";
import { BUILT_IN_WORDS } from "@/data/site-words";

/**
 * The promises made before there was an advertiser to break them for.
 *
 * The commercial brief committed to five things in prose, and prose does not
 * fail a build. This file is those five, written where forgetting them fails:
 *
 *   1. No advertiser can buy a "Verified" label.
 *   2. Kashrus information stays editorially independent.
 *   3. Payment never changes verification status, kashrus status, or a ranking
 *      presented as editorial.
 *   4. Nothing is published the moment it is created — Draft, Preview,
 *      Publish.
 *   5. The disclosure is not hidden in the footer.
 *
 * WHY NOW, BEFORE THE ADVERTISER ENTITIES. Every one of these is easy to hold
 * while there is no money on the other side of it, and each is crossed the
 * same way: not by a decision, but by somebody wiring a promotion record to a
 * ranking on a Tuesday because it was the shortest path. The point of writing
 * them as assertions today is that the shortest path stops being available
 * before anybody is under any pressure to take it.
 *
 * WHAT THIS FILE CANNOT DO is stop the owner deciding to sell a Verified
 * label. It can only make sure that doing so is a visible, deliberate act
 * that breaks a test named after the promise — rather than a field somebody
 * adds without noticing what it costs.
 */

const PROMOTION_SOURCE = readFileSync("lib/admin-content.ts", "utf8");
const BANNER = readFileSync("components/PromotionBanner.tsx", "utf8");
const SITE_PROMOTIONS = readFileSync("components/SitePromotions.tsx", "utf8");

describe("what is for sale, and what is not", () => {
  it("keeps the two lists apart", () => {
    for (const item of SELLABLE) assert.equal(isNotForSale(item), false, `${item} is on both lists`);
    for (const item of NOT_FOR_SALE) assert.equal(isSellable(item), false, `${item} is on both lists`);
  });

  it("NAMES THE FOUR CLAIMS THAT ARE NOT INVENTORY", () => {
    for (const claim of ["verified-label", "kashrus-claim", "editorial-ranking", "trust-status"] as const) {
      assert.ok(NOT_FOR_SALE.includes(claim), `${claim} became sellable`);
      assert.ok(WHY_NOT_FOR_SALE[claim].length > 30, `${claim} has no answer written for it`);
    }
  });

  it("gives every unsellable thing a reason somebody could be told out loud", () => {
    for (const claim of NOT_FOR_SALE) {
      assert.ok(WHY_NOT_FOR_SALE[claim], `${claim} has no reason`);
    }
  });
});

describe("an advertisement cannot carry a claim", () => {
  it("HAS NO FIELD THAT COULD SET A LABEL, A HECHSHER OR A RANK", () => {
    // The boundary gets crossed in a field name, not in a meeting. A
    // promotion record that grows `verified` or `hechsherId` has already
    // crossed it, whatever anybody intended.
    const fields = Object.keys(blankPromotion());
    const crossed: string[] = [];
    for (const field of fields) {
      for (const forbidden of FORBIDDEN_ON_AN_ADVERT) {
        if (field.toLowerCase().includes(forbidden)) crossed.push(`${field} (${forbidden})`);
      }
    }
    assert.deepEqual(crossed, [], `an advertisement can now carry: ${crossed.join(", ")}`);
  });

  it("KEEPS THE PROMOTION CODE AWAY FROM THE TRUST AND KASHRUS MODULES", () => {
    // Not an import away. If the advertising path ever needs to read a trust
    // label or a hechsher, that is the conversation this test exists to force.
    const code = PROMOTION_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const forbidden of ["trust-status", "hechsherim", "hechsher-store"]) {
      assert.doesNotMatch(
        code,
        new RegExp(`from "@/(lib|data)/${forbidden}"`),
        `the promotion store imports ${forbidden}`,
      );
    }
  });

  it("targets where and what device, never how somebody keeps", () => {
    assert.deepEqual([...TARGETABLE], ["placement", "path", "device", "schedule"]);
    const fields = Object.keys(blankPromotion()).join(" ").toLowerCase();
    for (const sensitive of ["kosher", "shabbos", "hechsher", "minyan", "mikva", "heritage", "kever"]) {
      assert.ok(!fields.includes(sensitive), `an advertisement can be targeted by ${sensitive}`);
    }
  });
});

describe("nothing goes live the moment it is made", () => {
  it("CREATES EVERY ADVERTISEMENT AS A DRAFT", () => {
    const fresh = blankPromotion();
    assert.equal(fresh.enabled, false, "a new advertisement is live before anybody has looked at it");
    assert.equal(adStatus(fresh).label, "Draft");
  });

  it("counts nothing on a new one, so a figure is never inherited", () => {
    const fresh = blankPromotion();
    assert.equal(fresh.impressions, 0);
    assert.equal(fresh.clicks, 0);
  });

  it("DUPLICATES AS A DRAFT TOO, with its numbers reset", () => {
    // Copying a live advert is the obvious way to publish something nobody
    // reviewed, and to inherit somebody else's impression count.
    const manager = readFileSync("components/AdManager.tsx", "utf8");
    assert.match(manager, /enabled: false, impressions: 0, clicks: 0/);
  });

  it("makes publishing a separate, explicit act", () => {
    const wizard = readFileSync("components/AdWizard.tsx", "utf8");
    assert.match(wizard, /enabled: publish/, "the wizard cannot save without publishing");
    assert.match(wizard, /function Preview\(/, "there is no preview between drafting and publishing");
  });
});

describe("a reader can always tell what is paid for", () => {
  it("LABELS EVERY ADVERTISEMENT SPONSORED", () => {
    assert.match(BANNER, /Sponsored/);
    // Three shapes render a promotion; a label on two of them is a label on
    // none, because the unlabelled one is the one somebody believes.
    const labels = SITE_PROMOTIONS.match(/Sponsored/g) ?? [];
    assert.ok(labels.length >= 3, `only ${labels.length} of the promotion shapes say Sponsored`);
  });

  it("SAYS A FEATURED LISTING MAY BE PAID FOR", () => {
    // The one sellable thing that looks exactly like an earned one.
    assert.match(featuredDisclosure(), /sponsored/i);
    assert.match(featuredDisclosure(), /featured/i);
  });

  it("DISCLOSES THE COMMISSION where partner searches and the terms do", () => {
    assert.match(BUILT_IN_WORDS.affiliateDisclosure, /commission/i);
    assert.match(BUILT_IN_WORDS.affiliateDisclosure, /no additional cost/i);
    // Beside dedicated partner search forms, and once in the Terms — not
    // repeated under the unified book panel.
    assert.match(readFileSync("components/PartnerSearchForm.tsx", "utf8"), /<AffiliateDisclosure/);
    assert.match(readFileSync("app/terms/page.tsx", "utf8"), /affiliateDisclosure/);
    assert.doesNotMatch(readFileSync("app/book/page.tsx", "utf8"), /disclosure=\{words\.affiliateDisclosure\}/);
  });
});

describe("no traffic figure is published", () => {
  it("SHOWS IMPRESSIONS AND CLICKS TO THE OWNER AND TO NOBODY ELSE", () => {
    // The brief: do not publish invented traffic numbers. The counts here are
    // real rather than invented, and they are still not a visitor's business —
    // and an /advertise page quoting them would be the first place a rounded-up
    // number appeared.
    const publicFiles = ["app/page.tsx", "app/book/page.tsx", "app/directory/page.tsx", "components/PromotionBanner.tsx"];
    for (const file of publicFiles) {
      const prose = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      assert.doesNotMatch(prose, /\bimpressions\b/i, `${file} shows an impression count`);
      assert.doesNotMatch(prose, /visitors a month|monthly visitors|readers a month/i, `${file} quotes traffic`);
    }
  });
});
