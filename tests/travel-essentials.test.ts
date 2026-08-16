import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { NO_STAY22 } from "@/lib/stay22";
import type { AffiliateConfig } from "@/lib/affiliate/partners";
import {
  defaultTravelEssentials,
  describeEssentialService,
  ESSENTIAL_SERVICES,
  essentialsForContext,
  landingUrlProblem,
  mergeTravelEssentials,
  OWNER_PROGRAMME_CHECKLIST,
} from "@/lib/travel-essentials";
import { earningState, LANDING_PRODUCTS, resolveLink, routeFor } from "@/lib/affiliate/partners";

const NOTHING: AffiliateConfig = { travelpayouts: {}, stay22: NO_STAY22 };

const WITH_STAY22: AffiliateConfig = {
  travelpayouts: {},
  stay22: { aid: "whitegloveitinerarie", provider: "roam" },
};

const WITH_INSURANCE: AffiliateConfig = {
  ...NOTHING,
  essentialsLandings: {
    insurance: [{ url: "https://tp.media/r?marker=761677&u=https%3A%2F%2Fexample-insurance.test", label: "Partner" }],
  },
};

describe("Travel Essentials config", () => {
  it("starts landing services off and search services on", () => {
    const defaults = defaultTravelEssentials();
    assert.equal(defaults.services.insurance.enabled, false);
    assert.equal(defaults.services.esim.enabled, false);
    assert.equal(defaults.services.programme.enabled, false);
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
    for (const def of ESSENTIAL_SERVICES) {
      assert.equal(typeof merged.services[def.id].order, "number", def.id);
    }
  });

  it("does not crash when a catalogue service is missing from stored settings", () => {
    const settings = defaultTravelEssentials();
    delete (settings.services as Partial<typeof settings.services>).programme;
    const cards = essentialsForContext(settings, NOTHING, {
      pageType: "book",
      page: "/book",
      placement: "book-essentials",
    });
    assert.ok(Array.isArray(cards));
    assert.equal(describeEssentialService("programme", settings, NOTHING).length > 0, true);
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
    assert.ok(OWNER_PROGRAMME_CHECKLIST.some((row) => /seasonal kosher programmes/i.test(row.category)));
    assert.ok(OWNER_PROGRAMME_CHECKLIST.some((row) => /not present|not auto-configured/i.test(row.status)));
  });
});

describe("Travel Essentials surfaces", () => {
  it("IS A SECTION OF THE EARNINGS SCREEN, not a second screen", () => {
    // It used to have its own page, and that was the problem: two screens
    // answered "is this site earning, and where", so whichever one you opened
    // looked complete on its own. A perfectly configured set of searches told
    // you nothing about four cards sitting disabled next door — and a card is
    // the thing most likely to be pasted and never enabled.
    const nav = readFileSync("lib/admin-nav.ts", "utf8");
    const earnings = readFileSync("app/admin/settings/earnings/page.tsx", "utf8");
    assert.match(earnings, /TravelEssentialsForm/);
    assert.match(earnings, /id="travel-essentials"/);
    // One entry in the navigation, not two pointing at the same question.
    assert.doesNotMatch(nav, /href: "\/admin\/settings\/travel-essentials"/);
    assert.match(nav, /\/admin\/settings\/earnings/);
  });

  it("REDIRECTS THE OLD ADDRESS rather than 404ing it", () => {
    // It is in the admin's own history, the quick-add list and whatever the
    // owner bookmarked. An admin screen that 404s reads as something broken
    // rather than something moved.
    const moved = readFileSync("app/admin/settings/travel-essentials/page.tsx", "utf8");
    assert.match(moved, /redirect\("\/admin\/settings\/earnings#travel-essentials"\)/);
  });

  it("is placed on destination, itinerary and book pages", () => {
    assert.match(readFileSync("app/destinations/[destination]/page.tsx", "utf8"), /TravelEssentials/);
    assert.match(readFileSync("app/itinerary/page.tsx", "utf8"), /TravelEssentials/);
    assert.match(readFileSync("app/book/page.tsx", "utf8"), /TravelEssentials/);
  });

  it("hands landing products off through /go, with no city or dates form", () => {
    // This site cannot show eSIM, insurance, transfer or tour results. A form
    // here would be filled in and then filled in again on the partner.
    const essentials = readFileSync("components/TravelEssentials.tsx", "utf8");
    assert.equal(existsSync("components/EssentialPartnerForm.tsx"), false);
    assert.match(essentials, /href=\{card\.href\}/);
    const transfer = readFileSync("components/TransferBooking.tsx", "utf8");
    const tours = readFileSync("components/TourBooking.tsx", "utf8");
    const insurance = readFileSync("components/InsurancePanel.tsx", "utf8");
    const esim = readFileSync("components/EsimOffers.tsx", "utf8");
    for (const source of [transfer, tours, insurance, esim]) {
      assert.match(source, /goHref/);
      assert.doesNotMatch(source, /AddressAutocomplete|DateField|<form|<select/);
    }
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

describe("more than one provider in a category", () => {
  const TWO_ESIMS = () => {
    const settings = defaultTravelEssentials();
    const esim = settings.services.esim;
    esim.enabled = true;
    esim.label = "Airalo";
    esim.url = "https://tp.media/r?marker=761677&u=https%3A%2F%2Fairalo.com";
    esim.extra = [
      { label: "Yesim", url: "https://tp.media/r?marker=761677&u=https%3A%2F%2Fyesim.app", cta: "", blurb: "", enabled: true },
    ];
    return settings;
  };
  const CONFIG: AffiliateConfig = {
    travelpayouts: {},
    stay22: NO_STAY22,
    essentialsLandings: {
      esim: [
        { url: "https://tp.media/r?marker=761677&u=https%3A%2F%2Fairalo.com", label: "Airalo" },
        { url: "https://tp.media/r?marker=761677&u=https%3A%2F%2Fyesim.app", label: "Yesim" },
      ],
    },
  };
  const ctx = { pageType: "book" as const, page: "/book", placement: "book-essentials" };

  it("SHOWS BOTH, SIDE BY SIDE, EACH NAMED", () => {
    // The owner had two eSIM programmes and could only ever show one, because
    // a category was a single slot. Two cards, as equals — there is no reason
    // to push Airalo over Yesim.
    const cards = essentialsForContext(TWO_ESIMS(), CONFIG, ctx).filter((c) => c.id === "esim");
    assert.equal(cards.length, 2);
    assert.deepEqual(cards.map((c) => c.name), ["Airalo", "Yesim"]);
    // Each carries WHICH provider it is, as an index the server resolves.
    assert.deepEqual(cards.map((c) => c.offer), [0, 1]);
    assert.doesNotMatch(cards[1].href, /http/, "a destination URL is in the query string");
    assert.match(cards[1].href, /offer=1/);
  });

  it("KEEPS THE CATEGORY TITLE while there is only one", () => {
    // Nothing the owner already has may change appearance because this feature
    // exists. One provider still reads as the catalogue's own card.
    // Everything saved before this feature existed has no label at all, which
    // is exactly this case — the card must read as it always did.
    const settings = TWO_ESIMS();
    settings.services.esim.extra = [];
    settings.services.esim.label = "";
    const cards = essentialsForContext(settings, CONFIG, ctx).filter((c) => c.id === "esim");
    assert.equal(cards.length, 1);
    assert.equal(cards[0].name, "Get an International eSIM");
    assert.equal(cards[0].offer, 0);
  });

  it("DROPS AN UNNAMED SECOND rather than showing two identical cards", () => {
    const settings = TWO_ESIMS();
    settings.services.esim.extra = [
      { label: "  ", url: "https://tp.media/r?marker=1&u=https%3A%2F%2Fx.test", cta: "", blurb: "", enabled: true },
    ];
    const cards = essentialsForContext(settings, CONFIG, ctx).filter((c) => c.id === "esim");
    assert.equal(cards.length, 1);
  });

  it("resolves each provider to its own link, and never past the end", () => {
    const first = resolveLink({ product: "esim", page: "/book", offer: 0 }, CONFIG);
    const second = resolveLink({ product: "esim", page: "/book", offer: 1 }, CONFIG);
    assert.match(first!.url, /airalo/);
    assert.match(second!.url, /yesim/);
    // An index a stranger invented falls back to the first of the owner's own
    // links rather than reaching anything else.
    const silly = resolveLink({ product: "esim", page: "/book", offer: 7 }, CONFIG);
    assert.match(silly!.url, /airalo/);
  });

  it("stays live when the FIRST provider is switched off", () => {
    // A category is available while any provider in it is — otherwise turning
    // one off would silently take the other down with it.
    const settings = TWO_ESIMS();
    settings.services.esim.enabled = false;
    const cards = essentialsForContext(settings, CONFIG, ctx).filter((c) => c.id === "esim");
    assert.equal(cards.length, 1);
    assert.equal(cards[0].name, "Yesim");
    // And its index is still 1 — the positions must not shift, or a link
    // already rendered on a cached page would point at the wrong company.
    assert.equal(cards[0].offer, 1);
  });
});

describe("a visitor can find the eSIM page", () => {
  it("HAS LINKS A PERSON WOULD FOLLOW, not just a sitemap entry", () => {
    // The hand-off was live for weeks and reachable only by scrolling past a
    // search on another page. Being in the sitemap makes it findable by
    // Google; these are what make it findable by somebody who wants one.
    // eSIM has no slot in the Travel dropdown's five fixed items (Stays,
    // Activities, Transport, Insurance, Gear) — it is linked directly from
    // the travel guide instead, checked below. Transfers and insurance are
    // themselves two of the five.
    const nav = readFileSync("lib/navigation.ts", "utf8");
    assert.match(nav, /href: "\/transfers"/, "no menu link to transfers");
    assert.match(nav, /href: "\/travel-insurance"/, "no menu link to insurance");
    const guide = readFileSync("app/travel-guide/page.tsx", "utf8");
    assert.match(guide, /href="\/esim"/, "the travel guide does not link to it");
    const index = readFileSync("lib/site-search-index.ts", "utf8");
    assert.match(index, /id: "page-esim"/, "site search cannot find it");
    const map = readFileSync("lib/site-map.ts", "utf8");
    assert.match(map, /path: "\/esim"/, "it is not in the sitemap");
  });

  it("SHOWS THE PROVIDERS WITHOUT A PAGE-TYPE CHECKBOX", () => {
    // The transfers page shipped empty because its card was gated on a box the
    // owner had not ticked. This page IS the offer, so it reads the category
    // directly — the only question is whether a provider is live at all.
    const page = readFileSync("components/EsimOffers.tsx", "utf8");
    assert.match(page, /offersFor\(def, configFor\(settings, def\)\)/);
    assert.doesNotMatch(page, /pageType/);
  });
});

describe("landing products the catalogue names, the registry can resolve", () => {
  it("KEEPS THE TWO LISTS THE SAME", () => {
    // Programme sat in TRAVEL_PRODUCTS and routeFor returned none for it, so
    // nothing could be offered even after a link was pasted. One list in the
    // catalogue and one in the registry, asserted equal, is what stops a sixth
    // product being named and then silently refused.
    const landingIds = ESSENTIAL_SERVICES.filter((s) => s.linkMode === "landing").map((s) => s.product);
    assert.deepEqual([...landingIds].sort(), [...LANDING_PRODUCTS].sort());
  });

  it("HAS A TRAVEL ESSENTIALS ROW FOR SEASONAL PROGRAMMES", () => {
    const def = ESSENTIAL_SERVICES.find((s) => s.id === "programme");
    assert.ok(def);
    assert.equal(def!.linkMode, "landing");
    assert.equal(def!.product, "programme");
    const earnings = readFileSync("app/admin/settings/earnings/page.tsx", "utf8");
    assert.match(earnings, /TravelEssentialsForm/);
    assert.match(earnings, /What is live today/);
    assert.match(earnings, /allRoutes/);
  });
});

describe("a pasted landing that is not tracked", () => {
  const DIRECT: AffiliateConfig = {
    ...NOTHING,
    essentialsLandings: {
      programme: [{ url: "https://example-programmes.test/pesach", label: "Operator" }],
    },
  };

  it("STILL OPENS, AND SAYS IT EARNS NOTHING", () => {
    // The untagged-car-hire failure: a working link that pays nobody, invisible
    // because the page looked identical. Refusing the link would cost a trip to
    // save a commission. The admin has to see the state instead.
    const route = routeFor("programme", DIRECT);
    assert.equal(earningState(route), "earns-nothing");
    assert.match(route.note, /earns nothing/i);
    const resolved = resolveLink({ product: "programme", destination: "Catskills" }, DIRECT);
    assert.ok(resolved);
    assert.equal(resolved!.route.earns, false);
    assert.equal(resolved!.url, "https://example-programmes.test/pesach");
  });

  it("shows the same words on the Travel Essentials row", () => {
    const settings = defaultTravelEssentials();
    settings.services.programme.enabled = true;
    settings.services.programme.url = "https://example-programmes.test/pesach";
    const line = describeEssentialService("programme", settings, DIRECT);
    assert.match(line, /Works, earns nothing/);
  });

  it("shows a programme card once a link is pasted and enabled", () => {
    const settings = defaultTravelEssentials();
    settings.services.programme.enabled = true;
    settings.services.programme.url = "https://tp.media/r?marker=761677&u=https%3A%2F%2Fexample-programmes.test";
    const tracked: AffiliateConfig = {
      ...NOTHING,
      essentialsLandings: {
        programme: [{ url: settings.services.programme.url, label: "Partner" }],
      },
    };
    const cards = essentialsForContext(settings, tracked, {
      pageType: "book",
      page: "/book",
      placement: "book-essentials",
    });
    const programme = cards.find((c) => c.id === "programme");
    assert.ok(programme);
    assert.match(programme!.href, /product=programme/);
    assert.equal(programme!.earns, true);
  });
});
