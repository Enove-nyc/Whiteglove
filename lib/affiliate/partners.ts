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

import { allezUrl, stay22IsOn, type Stay22Settings } from "@/lib/stay22";
import { kayakUrl, withAffiliate, type SearchShape } from "@/lib/kayak-search";
import { carUrl, flightUrl, partnerFor, type PartnerChoices } from "@/lib/travel-partners";
import { linkProblem, throughTravelpayouts, type SearchSlot, type TravelpayoutsLinks } from "@/lib/travelpayouts";

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

/** Who records the referral and pays for it. */
export type AffiliateNetwork = "travelpayouts" | "stay22" | "none";

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

  if (product === "flight" || product === "car") {
    const slot: SearchSlot = product === "flight" ? "flights" : "cars";
    const partner = partnerFor(slot, config.partners);
    const wrapped = travelpayoutsEarns(config.travelpayouts, slot, config.partners);
    const what = product === "flight" ? "Flight" : "Car";
    return {
      product,
      destinationLabel: partner.label,
      network: wrapped ? "travelpayouts" : "none",
      earns: wrapped,
      note: wrapped
        ? `${what} searches go through Travelpayouts, then on to ${partner.label}.`
        : `${what} searches open ${partner.label} directly. They work, and they earn nothing.`,
    };
  }

  // Transfers, activities, insurance, eSIMs and seasonal programmes have no
  // programme joined yet. The slot exists so the UI and the admin can both say
  // so honestly; inventing a link here is the one thing that must not happen.
  return NOT_CONNECTED(product, TRAVEL_PRODUCTS.find((entry) => entry.value === product)?.label.toLowerCase() ?? product);
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
    const from = (request.from ?? "").trim();
    const to = (request.to ?? "").trim();
    const out = isoDate(request.checkIn);
    if (!from || !to || !out) return null;
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
    const partner = partnerFor("flights", config.partners);
    if (partner.key === "kayak") return kayakUrl(shape, { affiliate: config.kayakParams });
    return flightUrl(partner, { shape, adults: request.adults, children: request.children });
  }

  if (request.product === "car") {
    const partner = partnerFor("cars", config.partners);
    const built = carUrl(partner, { where, pickup: isoDate(request.checkIn), dropoff: isoDate(request.checkOut) });
    if (!built) return null;
    return partner.key === "kayak" ? withAffiliate(built, config.kayakParams) : built;
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

  if (route.network === "travelpayouts") {
    const slot: SearchSlot = request.product === "hotel" ? "hotels" : request.product === "flight" ? "flights" : "cars";
    return { url: throughTravelpayouts(url, config.travelpayouts[slot], slot, config.partners), route };
  }
  // Stay22's own URL already carries the aid; nothing wraps it.
  return { url, route };
}
