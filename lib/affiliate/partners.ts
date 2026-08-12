/**
 * Who pays, and where the traveler lands. They are not the same thing.
 *
 * THE MISTAKE THIS TYPE EXISTS TO PREVENT. It is natural to write "our
 * affiliate partners are Travelpayouts, Stay22, Kayak and Booking.com" and
 * then to reason that dropping Kayak drops a partner. It does not: Kayak is
 * where the traveler ARRIVES, and Travelpayouts is the network that pays for
 * having sent them. Travelpayouts works by wrapping somebody else's search
 * URL — `https://tp.media/...?u=<the kayak search>` — so removing Kayak would
 * remove the thing Travelpayouts is paid to forward to.
 *
 * So a booking link is two decisions:
 *
 *   DESTINATION — the search the traveler actually opens. Kayak for flights
 *                 and cars, Booking.com for hotels, Stay22's chosen provider
 *                 for hotels when Stay22 is configured.
 *   NETWORK     — who records the referral. Travelpayouts wraps a destination
 *                 URL; Stay22 is its own network and its own destination; and
 *                 "none" is a real answer, meaning the link works and earns
 *                 nothing.
 *
 * "EARNS NOTHING" IS A STATE, NOT A FAILURE. The site had months of car hire
 * going out untagged — working perfectly, earning zero, invisible because the
 * page looked identical either way (tests/affiliate-links.test.ts). The answer
 * is not to break the link when the money is not configured; it is to keep the
 * link and make the state legible to the owner. Every resolution below reports
 * whether it earns, so the admin can say which searches are live and which are
 * giving trips away.
 *
 * Pure, and takes its configuration as an argument, so the same functions serve
 * the redirect handler, the admin screens and the tests.
 */

import { allezUrl, kayakStay22Link, readStay22Link, stay22IsOn, stay22SearchUrl, tourSearchUrl, type Stay22Link, type Stay22Settings } from "@/lib/stay22";
import { kayakUrl, withAffiliate, type SearchShape } from "@/lib/kayak-search";
import { carUrl, flightUrl, partnerFor, type PartnerChoices } from "@/lib/travel-partners";
import { linkProblem, throughTravelpayouts, type SearchSlot, type TravelpayoutsLinks } from "@/lib/travelpayouts";
import { looksTracked } from "@/lib/travel-extras";

/** HTTPS landing URL usable for Travel Essentials — shared rule with lib/travel-essentials. */
function landingUrlOk(url: string): boolean {
  const value = url.trim();
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** What a visitor is trying to book. */
export type TravelProduct = "hotel" | "flight" | "car" | "transfer" | "activity" | "insurance" | "esim" | "programme";

export const TRAVEL_PRODUCTS: ReadonlyArray<{ value: TravelProduct; label: string }> = [
  { value: "hotel", label: "Hotels" },
  { value: "flight", label: "Flights" },
  { value: "car", label: "Car hire" },
  { value: "transfer", label: "Airport transfers" },
  { value: "activity", label: "Things to do" },
  { value: "insurance", label: "Travel insurance" },
  { value: "esim", label: "eSIM and connectivity" },
  { value: "programme", label: "Seasonal kosher programmes" },
] as const;

/**
 * Products that hand off through a pasted landing URL, not a search builder.
 *
 * Hotels, flights and cars are built from the visitor's dates. These five are
 * a link the owner pastes once a programme is approved. Kept as one list so a
 * sixth cannot be named in the catalogue and then silently refused here.
 */
export const LANDING_PRODUCTS = ["transfer", "activity", "insurance", "esim", "programme"] as const;
export type LandingProduct = (typeof LANDING_PRODUCTS)[number];

export function isLandingProduct(product: TravelProduct): product is LandingProduct {
  return (LANDING_PRODUCTS as readonly string[]).includes(product);
}

/** Who records the referral and pays for it. */
export type AffiliateNetwork = "travelpayouts" | "stay22" | "none";

function networkFromLanding(url: string): AffiliateNetwork {
  if (readStay22Link(url)) return "stay22";
  try {
    const host = new URL(url).host.toLowerCase();
    if (["tp.media", "tp.st", "c.travelpayouts.com", "travelpayouts.com"].some((h) => host === h || host.endsWith(`.${h}`))) {
      return "travelpayouts";
    }
  } catch {
    /* ignore */
  }
  return looksTracked(url) ? "travelpayouts" : "none";
}

export const NETWORK_LABELS: Record<AffiliateNetwork, string> = {
  travelpayouts: "Travelpayouts",
  stay22: "Stay22",
  none: "Not connected",
};

/**
 * A product this site can send a visitor to book, and how.
 *
 * `status` is the expired-partner handling the brief asks for, and it is read
 * at request time rather than baked into a page, so closing a programme is a
 * setting rather than a deploy.
 */
export type ProductRoute = {
  product: TravelProduct;
  /** The host the traveler ends up on, for the hand-off line and the disclosure. */
  destinationLabel: string;
  network: AffiliateNetwork;
  /** True when a referral is actually being recorded and paid for. */
  earns: boolean;
  /** Why not, when it is not. Shown in the admin, never to a visitor. */
  note: string;
};

/**
 * What the admin should read for a route. Never silent.
 *
 * "Works, earns nothing" is a real state — the untagged-car-hire failure —
 * and it has to look different from "not offered" or the owner cannot tell
 * which products are giving trips away.
 */
export function earningState(route: ProductRoute): "earns" | "earns-nothing" | "not-offered" {
  if (route.earns) return "earns";
  if (route.destinationLabel) return "earns-nothing";
  return "not-offered";
}

export function earningStateLabel(route: ProductRoute): string {
  const state = earningState(route);
  if (state === "earns") return "Can earn";
  if (state === "earns-nothing") return "Works, earns nothing";
  return "Not offered";
}

/**
 * Landing-page affiliate URLs for Travel Essentials (insurance, eSIM, …).
 *
 * A LIST PER CATEGORY, because a category can hold more than one provider —
 * two eSIM programmes shown side by side for the traveller to compare. The
 * first entry is the one a request with no `offer` gets, so every link written
 * before this existed resolves exactly as it did.
 */
export type EssentialsLandings = Partial<
  Record<LandingProduct, ReadonlyArray<{ url: string; label?: string }>>
>;

/** Everything the site needs in order to build any booking link. */
export type AffiliateConfig = {
  travelpayouts: TravelpayoutsLinks;
  /** Which partner each search opens. See lib/travel-partners.ts. */
  partners?: PartnerChoices;
  stay22: Stay22Settings;
  /** KAYAK_AFFILIATE_PARAMS. Legacy, and only additive — Travelpayouts is the earner. */
  kayakParams?: string;
  /** Products the owner has switched off entirely. */
  paused?: readonly TravelProduct[];
  /**
   * Pasted tracked links for Travel Essentials landing products.
   * Read from the Travel Essentials store — never invented in code.
   */
  essentialsLandings?: EssentialsLandings;
};

/* ---- what a link is asked for -------------------------------------------- */

export type AffiliateRequest = {
  product: TravelProduct;
  /** Free text as the visitor typed it, or a destination's name. */
  destination?: string;
  /** The vacation destination slug, for reporting. Never sent to the partner. */
  destinationSlug?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  rooms?: number;
  /** Airport codes, for flights and cars. */
  from?: string;
  to?: string;
  /**
   * A multi-city flight, in the order it is flown.
   *
   * Present INSTEAD of from/to/checkIn, not as well: a request carrying both a
   * single leg and a list of them has two answers to "where is this person
   * going", and the one that got used would be whichever the builder happened
   * to read first. When this is set it is the whole journey.
   */
  legs?: Array<{ from: string; to: string; date: string }>;
  /** Nonstop only. Carried because the booking page asks for it. */
  nonstop?: boolean;
  /**
   * Which provider in a category, 0 for the first.
   *
   * An INDEX, never a URL, and that is the whole security of this endpoint: the
   * destination is resolved server-side from the owner's own settings, so the
   * worst a stranger can do by editing this number is reach a different link of
   * the owner's, or none at all. See destinationUrl.
   */
  offer?: number;
  /** Where on the site this link was pressed. Reporting only. */
  page?: string;
  placement?: string;
  campaignId?: string;
};

/* ---- resolution ---------------------------------------------------------- */

/**
 * Whether a pasted Travelpayouts link is one that will actually be credited.
 *
 * The same check the admin screen runs, and it has to be the same one: a link
 * with no marker, or one built for a different programme, opens a working
 * search and earns nothing. Reporting `earns: true` for it would be the exact
 * blindness this module exists to end.
 */
function travelpayoutsEarns(links: TravelpayoutsLinks, slot: SearchSlot, choices?: PartnerChoices): boolean {
  const pasted = links[slot]?.trim();
  return Boolean(pasted) && linkProblem(pasted!, slot, choices) === null;
}

/**
 * Stay22 Kayak wrap: the Stay22 ID first, then a pasted Kayak wrap.
 * Travelpayouts is not required. Null when that slot's partner is not Kayak,
 * or when neither an ID nor a Stay22 Kayak link is present.
 */
function stay22KayakFor(config: AffiliateConfig, slot: "flights" | "cars"): Stay22Link | null {
  if (partnerFor(slot, config.partners).key !== "kayak") return null;
  const fromAid = kayakStay22Link(config.stay22);
  if (fromAid) return fromAid;
  const pasted = config.travelpayouts[slot]?.trim() ?? "";
  if (!pasted || linkProblem(pasted, slot, config.partners)) return null;
  const link = readStay22Link(pasted);
  return link?.desk === "kayak" ? link : null;
}

const NOT_CONNECTED = (product: TravelProduct, what: string): ProductRoute => ({
  product,
  destinationLabel: "",
  network: "none",
  earns: false,
  note: `No partner is connected for ${what}. Nothing is shown to visitors until one is.`,
});

/**
 * How a product is routed today, without building a URL.
 *
 * The admin screens read this to say what is live; the UI reads it to decide
 * whether to offer the action at all. A product with no route is not rendered
 * as a broken button — it is not rendered.
 */
export function routeFor(product: TravelProduct, config: AffiliateConfig): ProductRoute {
  if (config.paused?.includes(product)) {
    return { ...NOT_CONNECTED(product, product), note: "Paused by the owner." };
  }

  if (product === "hotel") {
    if (stay22IsOn(config.stay22)) {
      return {
        product,
        destinationLabel: "Stay22",
        network: "stay22",
        earns: true,
        note: `Hotel searches go through Stay22 under ID ${config.stay22.aid.trim()}.`,
      };
    }
    const wrapped = travelpayoutsEarns(config.travelpayouts, "hotels", config.partners);
    return {
      product,
      destinationLabel: "Booking.com",
      network: wrapped ? "travelpayouts" : "none",
      earns: wrapped,
      note: wrapped
        ? "Hotel searches go through Travelpayouts, then on to Booking.com."
        : "Hotel searches open Booking.com directly. They work, and they earn nothing.",
    };
  }

  if (product === "flight") {
    const partner = partnerFor("flights", config.partners);
    const stay22Kayak = stay22KayakFor(config, "flights");
    if (stay22Kayak) {
      return {
        product,
        destinationLabel: partner.label,
        network: "stay22",
        earns: true,
        note: `Flight searches go through Stay22, then on to ${partner.label}.`,
      };
    }
    const wrapped = travelpayoutsEarns(config.travelpayouts, "flights", config.partners);
    return {
      product,
      destinationLabel: partner.label,
      network: wrapped ? "travelpayouts" : "none",
      earns: wrapped,
      note: wrapped
        ? `Flight searches go through Travelpayouts, then on to ${partner.label}.`
        : `Flight searches open ${partner.label} directly. They work, and they earn nothing.`,
    };
  }

  if (product === "car") {
    const partner = partnerFor("cars", config.partners);
    const stay22Kayak = stay22KayakFor(config, "cars");
    if (stay22Kayak) {
      return {
        product,
        destinationLabel: partner.label,
        network: "stay22",
        earns: true,
        note: `Car searches go through Stay22, then on to ${partner.label}.`,
      };
    }
    const wrapped = travelpayoutsEarns(config.travelpayouts, "cars", config.partners);
    return {
      product,
      destinationLabel: partner.label,
      network: wrapped ? "travelpayouts" : "none",
      earns: wrapped,
      note: wrapped
        ? `Car searches go through Travelpayouts, then on to ${partner.label}.`
        : `Car searches open ${partner.label} directly. They work, and they earn nothing.`,
    };
  }

  if (isLandingProduct(product)) {
    // The category's route is the first provider that can actually be used —
    // "is this category connected at all", which is what the admin line asks.
    const landing = (config.essentialsLandings?.[product] ?? []).find((entry) => entry.url.trim());
    const url = landing?.url?.trim() ?? "";
    if (!url || !landingUrlOk(url)) {
      return NOT_CONNECTED(
        product,
        TRAVEL_PRODUCTS.find((entry) => entry.value === product)?.label.toLowerCase() ?? product,
      );
    }
    const network = networkFromLanding(url);
    return {
      product,
      destinationLabel: landing?.label?.trim() || "Partner",
      network,
      earns: looksTracked(url),
      note: looksTracked(url)
        ? `Travel Essentials link goes through ${network === "stay22" ? "Stay22" : network === "travelpayouts" ? "Travelpayouts" : "a tracked redirect"}.`
        : "Works, earns nothing — the saved link does not look tracked.",
    };
  }

  return NOT_CONNECTED(product, TRAVEL_PRODUCTS.find((entry) => entry.value === product)?.label.toLowerCase() ?? product);
}

/**
 * Whether the configured flight partner can open a multi-city search at all.
 *
 * A PLAIN BOOLEAN, and deliberately nothing more. The booking page needs to
 * know this before it opens a tab — otherwise a five-leg search hands off to a
 * partner that cannot express one, /go declines to build a wrong link, and the
 * traveller gets a new tab that bounces back to the page they were already on
 * with no explanation. That is what happened when this page first moved onto
 * /go.
 *
 * It answers the question without naming the partner, which is both the
 * privacy line — nothing commercial goes into the page source — and the
 * copy rule: visitors are not told which partner a search opens.
 */
export function flightPartnerDoesMultiCity(config: AffiliateConfig): boolean {
  return partnerFor("flights", config.partners).key === "kayak";
}

/** Every product's current state, for the admin. */
export function allRoutes(config: AffiliateConfig): ProductRoute[] {
  return TRAVEL_PRODUCTS.map((entry) => routeFor(entry.value, config));
}

/* ---- the URL ------------------------------------------------------------- */

function isoDate(value?: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function people(value: number | undefined, fallback: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 30) : fallback;
}

/**
 * The search the traveler actually opens, before any network wrapping.
 *
 * Null when this site cannot build one — an unjoined product, or a flight
 * search with no airports. A null here is what stops a dead button being
 * rendered.
 */
function destinationUrl(request: AffiliateRequest, config: AffiliateConfig): string | null {
  const where = (request.destination ?? "").trim();

  if (request.product === "hotel") {
    if (stay22IsOn(config.stay22)) {
      if (!where) return null;
      return allezUrl(
        { address: where, checkin: isoDate(request.checkIn), checkout: isoDate(request.checkOut), adults: people(request.adults, 2) },
        config.stay22,
      );
    }
    if (!where) return null;
    const query = new URLSearchParams({ ss: where, group_adults: String(people(request.adults, 2)) });
    if (isoDate(request.checkIn)) query.set("checkin", isoDate(request.checkIn));
    if (isoDate(request.checkOut)) query.set("checkout", isoDate(request.checkOut));
    if (request.children) query.set("group_children", String(people(request.children, 0)));
    if (request.rooms) query.set("no_rooms", String(people(request.rooms, 1)));
    return `https://www.booking.com/searchresults.html?${query.toString()}`;
  }

  if (request.product === "flight") {
    // A multi-city journey is the whole request when it is there. Built before
    // the single-leg read so a five-leg trip can never come out as its first
    // leg — the traveller would get a working search for the wrong journey and
    // nothing would look broken.
    const many = (request.legs ?? []).filter((l) => l.from && l.to && isoDate(l.date));
    if (many.length > 1) {
      const partner = partnerFor("flights", config.partners);
      const shape: SearchShape = { trip: "multi-city", legs: many };
      if (partner.key === "kayak") return kayakUrl(shape, { nonstop: request.nonstop, affiliate: config.kayakParams });
      // Everything else returns null for a shape it cannot express, rather
      // than quietly sending one leg of the journey.
      return flightUrl(partner, { shape, adults: request.adults, children: request.children });
    }

    const only = many[0];
    const from = (only?.from ?? request.from ?? "").trim();
    const to = (only?.to ?? request.to ?? "").trim();
    const out = isoDate(only?.date ?? request.checkIn);
    const partner = partnerFor("flights", config.partners);
    if (from && to && out) {
      const back = isoDate(request.checkOut);
      // The affiliate key goes on inside kayakUrl. Kayak takes no passenger
      // count in the path, so `adults` is carried in the click record for
      // reporting and not in the URL — inventing a parameter Kayak ignores
      // would look like it was doing something.
      const shape: SearchShape = back
        ? { trip: "round-trip", legs: [{ from, to, date: out }], ret: back }
        : { trip: "one-way", legs: [{ from, to, date: out }] };

      // Whichever flight programme the owner is actually approved for. Kayak
      // keeps its own builder because it handles multi-city and carries the
      // legacy affiliate params; everything else comes from the registry.
      if (partner.key === "kayak") return kayakUrl(shape, { nonstop: request.nonstop, affiliate: config.kayakParams });
      return flightUrl(partner, { shape, adults: request.adults, children: request.children });
    }

    // Approved general landing only when a place context is present (destination
    // page / Travel Essentials) but airports and dates are not. A bare flight
    // request with no place still returns null — that is an incomplete search,
    // not a landing page.
    if (!where) return null;
    if (partner.key === "kayak") return withAffiliate("https://www.kayak.com/flights", config.kayakParams);
    if (partner.key === "aviasales") return "https://search.aviasales.com/flights/";
    if (partner.key === "kiwi") return "https://www.kiwi.com/en/";
    return null;
  }

  if (request.product === "car") {
    const partner = partnerFor("cars", config.partners);
    const built = carUrl(partner, { where, pickup: isoDate(request.checkIn), dropoff: isoDate(request.checkOut) });
    if (!built) return null;
    return partner.key === "kayak" ? withAffiliate(built, config.kayakParams) : built;
  }

  if (isLandingProduct(request.product)) {
    // The provider asked for, or the first. An index rather than a URL: a
    // stranger editing it reaches one of the owner's own links or nothing.
    const list = config.essentialsLandings?.[request.product] ?? [];
    const chosen = list[request.offer ?? 0] ?? list[0];
    const url = chosen?.url?.trim() ?? "";
    if (!url || !landingUrlOk(url)) return null;
    // TOURS CARRY THE PLACE when the pasted link is a Stay22 GetYourGuide desk.
    // The visitor came from a page about somewhere; sending them to the same
    // front page whether they were reading about Rome or Kraków throws away the
    // one thing this site knew. Everything else — a Travelpayouts link, a plain
    // partner URL, no place in the request — opens what the owner pasted,
    // unchanged. See lib/stay22.ts for why this is the only landing product
    // that can do it, and for what has NOT been verified about it.
    if (request.product === "activity") return tourSearchUrl(where, url) ?? url;
    return url;
  }

  return null;
}

export type ResolvedLink = {
  /** Where the traveler is sent. Never rendered into the page — see app/go. */
  url: string;
  route: ProductRoute;
};

/**
 * The finished link, network wrapping and all, or null when there is not one.
 *
 * ONE FUNCTION, and that is the whole point of this module. Every booking link
 * on the site resolves here, so a marker cannot be dropped in one component
 * while three others keep it, and an expired programme is one setting rather
 * than a search of the codebase.
 */
export function resolveLink(request: AffiliateRequest, config: AffiliateConfig): ResolvedLink | null {
  const route = routeFor(request.product, config);
  if (route.network === "none" && !route.destinationLabel) return null;

  const url = destinationUrl(request, config);
  if (!url) return null;

  // The hotel search through Stay22 is BUILT with the aid already in it, so
  // there is nothing left to wrap. Landing-page essentials are already full
  // tracked URLs from the owner's dashboard — wrapping them again would break
  // the programme's own parameters.
  if (request.product === "hotel" && route.network === "stay22") return { url, route };
  if (request.product === "flight" && route.network === "stay22") {
    return { url: stay22SearchUrl(url, stay22KayakFor(config, "flights")), route };
  }
  if (request.product === "car" && route.network === "stay22") {
    return { url: stay22SearchUrl(url, stay22KayakFor(config, "cars")), route };
  }
  if (isLandingProduct(request.product)) {
    return { url, route };
  }

  if (route.network === "travelpayouts" || route.network === "stay22") {
    const slot: SearchSlot = request.product === "hotel" ? "hotels" : request.product === "flight" ? "flights" : "cars";
    return { url: throughTravelpayouts(url, config.travelpayouts[slot], slot, config.partners), route };
  }
  return { url, route };
}
