import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { NO_STAY22 } from "@/lib/stay22";
import type { AffiliateConfig } from "@/lib/affiliate/partners";
import { resolveLink } from "@/lib/affiliate/partners";
import {
  defaultTravelEssentials,
  essentialsForContext,
  landingUrlProblem,
  mergeTravelEssentials,
  OWNER_PROGRAMME_CHECKLIST,
} from "@/lib/travel-essentials";

const NOTHING: AffiliateConfig = { travelpayouts: {}, stay22: NO_STAY22 };

const WITH_STAY22: AffiliateConfig = {
  travelpayouts: {},
  stay22: { aid: "whitegloveitinerarie", provider: "roam" },
};

const WITH_INSURANCE: AffiliateConfig = {
  ...NOTHING,
  essentialsLandings: {
    insurance: { url: "https://tp.media/r?marker=761677&u=https%3A%2F%2Fexample-insurance.test", label: "Partner" },
  },
};

describe("Travel Essentials config", () => {
  it("starts landing services off and search services on", () => {
    const defaults = defaultTravelEssentials();
    assert.equal(defaults.services.insurance.enabled, false);
    assert.equal(defaults.services.esim.enabled, false);
    assert.equal(defaults.services.hotel.enabled, true);
    assert.equal(defaults.sectionEnabled, true);
  });

  it("merges unknown junk without inventing services", () => {
    const merged = mergeTravelEssentials({
      sectionEnabled: false,
      services: { insurance: { enabled: true, url: "https://tp.media/r?marker=1&u=https%3A%2F%2Fx.test" }, ghost: { enabled: true } },
    });
    assert.equal(merged.sectionEnabled, false);
    assert.equal(merged.services.insurance.enabled, true);
    assert.equal((merged.services as Record<string, unknown>).ghost, undefined);
  });

  it("refuses non-https landing URLs", () => {
    assert.match(landingUrlProblem("") ?? "", /Paste/);
    assert.match(landingUrlProblem("http://tp.media/r") ?? "", /https/);
    assert.equal(landingUrlProblem("https://tp.media/r?marker=1&u=https%3A%2F%2Fx.test"), null);
  });
});

describe("Travel Essentials visibility", () => {
  it("hides everything when the section is off", () => {
    const settings = defaultTravelEssentials();
    settings.sectionEnabled = false;
    settings.services.insurance.enabled = true;
    settings.services.insurance.url = "https://tp.media/r?marker=1&u=https%3A%2F%2Fx.test";
    const cards = essentialsForContext(settings, WITH_INSURANCE, {
      pageType: "destination",
      destinationName: "Rome",
      destinationSlug: "rome",
      page: "/destinations/rome",
      placement: "destination-essentials",
    });
    assert.equal(cards.length, 0);
  });

  it("never shows a landing card without a URL", () => {
    const settings = defaultTravelEssentials();
    settings.services.insurance.enabled = true;
    settings.services.insurance.url = "";
    const cards = essentialsForContext(settings, NOTHING, {
      pageType: "destination",
      destinationName: "Rome",
      destinationSlug: "rome",
      page: "/destinations/rome",
      placement: "destination-essentials",
    });
    assert.equal(cards.find((c) => c.id === "insurance"), undefined);
  });

  it("shows insurance when enabled with a tracked landing and config", () => {
    const settings = defaultTravelEssentials();
    settings.services.insurance.enabled = true;
    settings.services.insurance.url = "https://tp.media/r?marker=761677&u=https%3A%2F%2Fexample-insurance.test";
    const cards = essentialsForContext(settings, WITH_INSURANCE, {
      pageType: "destination",
      destinationName: "Rome",
      destinationSlug: "rome",
      page: "/destinations/rome",
      placement: "destination-essentials",
    });
    const insurance = cards.find((c) => c.id === "insurance");
    assert.ok(insurance);
    assert.match(insurance!.href, /\/go\?/);
    assert.match(insurance!.href, /product=insurance/);
    assert.match(insurance!.cta, /insurance/i);
  });

  it("shows hotel via Stay22 on itinerary when a destination is known", () => {
    const settings = defaultTravelEssentials();
    const cards = essentialsForContext(settings, WITH_STAY22, {
      pageType: "itinerary",
      destinationName: "Rome",
      destinationSlug: "rome",
      page: "/itinerary",
      placement: "itinerary-essentials",
    });
    const hotel = cards.find((c) => c.id === "hotel");
    assert.ok(hotel);
    assert.match(hotel!.href, /product=hotel/);
  });

  it("does not put hotel essentials on destination pages by default", () => {
    const settings = defaultTravelEssentials();
    const cards = essentialsForContext(settings, WITH_STAY22, {
      pageType: "destination",
      destinationName: "Rome",
      destinationSlug: "rome",
      page: "/destinations/rome",
      placement: "destination-essentials",
    });
    assert.equal(cards.find((c) => c.id === "hotel"), undefined);
  });

  it("resolves landing products through /go without open redirects", () => {
    const resolved = resolveLink({ product: "insurance", page: "/book", placement: "test" }, WITH_INSURANCE);
    assert.ok(resolved);
    assert.match(resolved!.url, /^https:\/\/tp\.media\//);
    assert.equal(resolved!.route.earns, true);
  });

  it("keeps an owner checklist instead of guessing programmes", () => {
    assert.ok(OWNER_PROGRAMME_CHECKLIST.length >= 6);
    assert.ok(OWNER_PROGRAMME_CHECKLIST.some((row) => /insurance/i.test(row.category)));
    assert.ok(OWNER_PROGRAMME_CHECKLIST.some((row) => /not present|not auto-configured/i.test(row.status)));
  });
});

describe("Travel Essentials surfaces", () => {
  it("has an admin page and nav entry", () => {
    const nav = readFileSync("lib/admin-nav.ts", "utf8");
    const page = readFileSync("app/admin/settings/travel-essentials/page.tsx", "utf8");
    assert.match(nav, /\/admin\/settings\/travel-essentials/);
    assert.match(page, /Travel Essentials/);
    assert.match(page, /Owner programme checklist/);
  });

  it("is placed on destination, itinerary and book pages", () => {
    assert.match(readFileSync("app/destinations/[destination]/page.tsx", "utf8"), /TravelEssentials/);
    assert.match(readFileSync("app/itinerary/page.tsx", "utf8"), /TravelEssentials/);
    assert.match(readFileSync("app/book/page.tsx", "utf8"), /TravelEssentials/);
  });

  it("shows a visible disclosure, not tooltip-only", () => {
    const component = readFileSync("components/TravelEssentials.tsx", "utf8");
    assert.match(component, /We may earn a commission from qualifying bookings/);
    assert.doesNotMatch(component, /title=\{[^}]*commission/i);
  });

  it("avoids misleading recommendation copy", () => {
    const lib = readFileSync("lib/travel-essentials.ts", "utf8");
    const component = readFileSync("components/TravelEssentials.tsx", "utf8");
    for (const source of [lib, component]) {
      const prose = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      assert.doesNotMatch(prose, /\bBest Price\b/);
      assert.doesNotMatch(prose, /\bGuaranteed Savings\b/);
      assert.doesNotMatch(prose, /\bOfficial Partner\b/);
      assert.doesNotMatch(prose, /Recommended by White Glove/i);
    }
  });
});
