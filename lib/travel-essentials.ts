/**
 * Travel Essentials — structured affiliate offers beyond the three searches.
 *
 * Hotels, flights and cars already resolve through the affiliate registry
 * (`lib/affiliate/partners.ts`). Insurance, eSIM, transfers and tours only
 * appear when the owner pastes a real tracked link and enables the card.
 *
 * NOTHING IS INVENTED HERE. A category Travelpayouts “supports generally” is
 * not enough. Empty URL + disabled = hidden. No placeholder buttons.
 */

import type { AffiliateConfig, AffiliateNetwork, TravelProduct } from "@/lib/affiliate/partners";
import { resolveLink, routeFor } from "@/lib/affiliate/partners";
import { goHref } from "@/lib/affiliate/request";
import { readStay22Link } from "@/lib/stay22";
import { looksTracked } from "@/lib/travel-extras";

/**
 * Where a card may appear.
 *
 * `transfers` is the airport-transfer page. It is its own type rather than
 * borrowing `book` because the owner has to be able to run one without the
 * other: a transfer programme worth offering on a page about transfers is not
 * automatically worth putting under the booking search, and a checkbox that
 * silently governs two pages is a checkbox that gets ticked for one of them.
 */
export type EssentialPageType = "destination" | "itinerary" | "book" | "transfers" | "things-to-do";

/**
 * Stable service ids. Search-backed ids map 1:1 to TravelProduct; landing ids
 * need a pasted affiliate URL before they can show.
 */
export type EssentialServiceId =
  | "insurance"
  | "esim"
  | "transfer"
  | "activity"
  | "car"
  | "flight"
  | "hotel";

export type EssentialLinkMode = "search" | "landing";

export type EssentialServiceDef = {
  id: EssentialServiceId;
  /** Visitor-facing card title. */
  name: string;
  /** One short line — why it is useful, not a hard sell. */
  blurb: string;
  /** Default button label. */
  cta: string;
  /** Simple mark drawn in the card — no icon font. */
  icon: string;
  linkMode: EssentialLinkMode;
  /** Affiliate product this card maps to. */
  product: TravelProduct;
  /** Default page types when the owner has not narrowed them. */
  defaultPageTypes: readonly EssentialPageType[];
  /** Provider network for admin display when mode is search. */
  preferredNetwork: "stay22" | "travelpayouts" | "either";
  /** Extra admin note (insurance wording, etc.). */
  adminNote?: string;
};

/**
 * The catalogue. Order here is the default display order; the owner can
 * reorder in admin without a deploy.
 */
export const ESSENTIAL_SERVICES: readonly EssentialServiceDef[] = [
  {
    id: "insurance",
    name: "Protect Your Trip",
    blurb: "Compare available travel insurance options for your dates. Terms and cover are set by the provider.",
    cta: "Compare travel insurance",
    icon: "◇",
    linkMode: "landing",
    product: "insurance",
    defaultPageTypes: ["destination", "itinerary", "book"],
    preferredNetwork: "travelpayouts",
    adminNote:
      "Careful wording only — compare options, no advice, no implication that cover is required. Paste a Travelpayouts (or other tracked) insurance link when the programme is approved on your account.",
  },
  {
    id: "esim",
    name: "Get an International eSIM",
    blurb: "Mobile data for when you land, without swapping your physical SIM.",
    cta: "Get an eSIM",
    icon: "▣",
    linkMode: "landing",
    product: "esim",
    defaultPageTypes: ["destination", "itinerary", "book"],
    preferredNetwork: "travelpayouts",
    adminNote: "Paste the tracked eSIM programme link from your affiliate dashboard when approved.",
  },
  {
    id: "transfer",
    name: "Arrange Airport Transfer",
    blurb: "Book a ride from the airport to your first stop so arrival is one less thing to arrange on the day.",
    cta: "Arrange a transfer",
    icon: "▸",
    linkMode: "landing",
    product: "transfer",
    defaultPageTypes: ["destination", "book", "transfers"],
    preferredNetwork: "travelpayouts",
    adminNote:
      "Only enable once an airport-transfer programme link is approved and pasted. A card already saved before the transfers page existed keeps the pages it was saved with — tick “Transfers page” to show it there too.",
  },
  {
    id: "activity",
    name: "Find Tours and Activities",
    blurb: "Tickets and guided visits for the places already on your list.",
    cta: "Find tours and activities",
    icon: "◎",
    linkMode: "landing",
    product: "activity",
    defaultPageTypes: ["destination", "things-to-do"],
    preferredNetwork: "travelpayouts",
    adminNote:
      "Only enable once a tours/attractions programme link is approved and pasted. A card saved before the things-to-do page existed keeps the pages it was saved with — tick “Things to do” to show it there too.",
  },
  {
    id: "car",
    name: "Rent a Car",
    blurb: "Car hire for the days between stops — useful when trains do not cover the route.",
    cta: "Search car hire",
    icon: "⬡",
    linkMode: "search",
    product: "car",
    // Destination pages already have DestinationBookingOptions; /book has the
    // search forms. Essentials surfaces cars on the itinerary after the plan.
    defaultPageTypes: ["itinerary"],
    preferredNetwork: "either",
  },
  {
    id: "flight",
    name: "Find Flights",
    blurb: "Open a flight search with our booking partner when you are ready to compare routes.",
    cta: "Search flights",
    icon: "✈",
    linkMode: "search",
    product: "flight",
    defaultPageTypes: ["itinerary"],
    preferredNetwork: "either",
  },
  {
    id: "hotel",
    name: "Find a Place to Stay",
    blurb: "Search rooms near the quarters and walks that matter for this trip.",
    cta: "Search places to stay",
    icon: "⌂",
    linkMode: "search",
    product: "hotel",
    defaultPageTypes: ["itinerary"],
    preferredNetwork: "stay22",
  },
] as const;

/**
 * A second, third or fourth provider in the same category.
 *
 * WHY A CATEGORY HOLDS MORE THAN ONE. The owner signed up to two eSIM
 * programmes and could only ever show one of them, because a category was a
 * single slot — pasting the second replaced the first. Travellers compare data
 * plans and hire companies the same way they compare hotels, and a site that
 * shows one and hides the other is answering a question nobody asked.
 *
 * SIDE BY SIDE, AS EQUALS. The owner's decision, and it is the right one for
 * the case that prompted it: there is no reason to push Airalo over Yesim, and
 * a "primary plus alternative" layout would invent a preference the owner does
 * not have and cannot defend.
 *
 * A LABEL IS REQUIRED WHERE A PLAIN CARD NEEDS NONE. One eSIM card can be
 * called "Get an International eSIM"; two cannot, or the traveller is choosing
 * between two identical things. So an extra provider names itself, and the
 * first one gets its name shown too the moment a second exists.
 */
export type EssentialOffer = {
  /** The provider's name — what tells two cards in one category apart. */
  label: string;
  url: string;
  /** Override button words; empty means the catalogue default. */
  cta: string;
  /** Override the line under the title; empty means the catalogue default. */
  blurb: string;
  enabled: boolean;
};

export type EssentialServiceConfig = {
  enabled: boolean;
  /** Landing URL for landing-mode services. Ignored for search-mode. */
  url: string;
  /**
   * The provider behind `url`, shown only once a second one exists.
   *
   * Optional so that nothing the owner has already saved needs a migration or
   * changes appearance: one provider in a category still reads exactly as it
   * did, with the catalogue's own title.
   */
  label?: string;
  /** Additional providers in this category, shown beside the first. */
  extra?: EssentialOffer[];
  /** Override CTA; empty means use the catalogue default. */
  cta: string;
  /** Override blurb; empty means use the catalogue default. */
  blurb: string;
  /** Display order (lower first). */
  order: number;
  /** Page types this card may appear on. Empty = catalogue defaults. */
  pageTypes: EssentialPageType[];
  /**
   * Destination slugs this card may appear on. Empty = all destinations.
   * Ignored on itinerary/book pages.
   */
  destinations: string[];
};

export type TravelEssentialsSettings = {
  services: Record<EssentialServiceId, EssentialServiceConfig>;
  /** Master switch for the whole Travel Essentials section. */
  sectionEnabled: boolean;
  /** Show the commission sentence above the cards. */
  showDisclosure: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

const PAGE_TYPES: readonly EssentialPageType[] = ["destination", "itinerary", "book", "transfers", "things-to-do"];

export function isEssentialPageType(value: string): value is EssentialPageType {
  return (PAGE_TYPES as readonly string[]).includes(value);
}

export function isEssentialServiceId(value: string): value is EssentialServiceId {
  return ESSENTIAL_SERVICES.some((s) => s.id === value);
}

export function defFor(id: EssentialServiceId): EssentialServiceDef {
  return ESSENTIAL_SERVICES.find((s) => s.id === id)!;
}

function defaultConfigFor(def: EssentialServiceDef, index: number): EssentialServiceConfig {
  return {
    // Landing services start off — they need a real pasted link.
    // Search services start on; they still hide when the registry cannot build a link.
    enabled: def.linkMode === "search",
    url: "",
    cta: "",
    blurb: "",
    order: index,
    pageTypes: [...def.defaultPageTypes],
    destinations: [],
    label: "",
    extra: [],
  };
}

/** The most providers one category may hold. Beyond this it is a list, not a choice. */
export const MAX_OFFERS_PER_SERVICE = 4;

function mergeOffers(raw: unknown): EssentialOffer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((row) => ({
      label: String(row.label ?? "").trim().slice(0, 48),
      url: String(row.url ?? "").trim().slice(0, 2000),
      cta: String(row.cta ?? "").trim().slice(0, 48),
      blurb: String(row.blurb ?? "").trim().slice(0, 200),
      enabled: Boolean(row.enabled),
    }))
    // An extra with no link is a row somebody started and left; it can be
    // stored but it is not a provider. One with no name cannot be told from
    // the first card, so it is not shown either — see offersFor.
    .slice(0, MAX_OFFERS_PER_SERVICE - 1);
}

export function defaultTravelEssentials(): TravelEssentialsSettings {
  const services = {} as Record<EssentialServiceId, EssentialServiceConfig>;
  ESSENTIAL_SERVICES.forEach((def, index) => {
    services[def.id] = defaultConfigFor(def, index);
  });
  return {
    services,
    sectionEnabled: true,
    showDisclosure: true,
  };
}

/** Merge stored JSON with catalogue defaults; drop unknown keys. */
export function mergeTravelEssentials(raw: unknown): TravelEssentialsSettings {
  const base = defaultTravelEssentials();
  if (!raw || typeof raw !== "object") return base;
  const incoming = raw as Partial<TravelEssentialsSettings> & { services?: Record<string, Partial<EssentialServiceConfig>> };
  const services = { ...base.services };
  for (const def of ESSENTIAL_SERVICES) {
    const row = incoming.services?.[def.id];
    if (!row || typeof row !== "object") continue;
    const pageTypes = Array.isArray(row.pageTypes)
      ? row.pageTypes.filter((p): p is EssentialPageType => typeof p === "string" && isEssentialPageType(p))
      : services[def.id].pageTypes;
    const destinations = Array.isArray(row.destinations)
      ? row.destinations
          .map((d) => String(d).trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60))
          .filter(Boolean)
      : services[def.id].destinations;
    const order = Number(row.order);
    services[def.id] = {
      enabled: Boolean(row.enabled),
      url: String(row.url ?? "").trim().slice(0, 2000),
      cta: String(row.cta ?? "").trim().slice(0, 48),
      blurb: String(row.blurb ?? "").trim().slice(0, 200),
      order: Number.isFinite(order) ? order : services[def.id].order,
      pageTypes: pageTypes.length > 0 ? pageTypes : [...def.defaultPageTypes],
      destinations,
      label: String(row.label ?? "").trim().slice(0, 48),
      extra: mergeOffers((row as { extra?: unknown }).extra),
    };
  }
  return {
    services,
    sectionEnabled: incoming.sectionEnabled !== false,
    showDisclosure: incoming.showDisclosure !== false,
    updatedAt: typeof incoming.updatedAt === "string" ? incoming.updatedAt : undefined,
    updatedBy: typeof incoming.updatedBy === "string" ? incoming.updatedBy : undefined,
  };
}

/**
 * Can this product actually be booked from this site today?
 *
 * EXISTS SO A PAGE CANNOT CONTRADICT THE SETTINGS. /book carries a short list
 * of things it does not sell, each with somewhere better to go. That list was
 * hardcoded, so when a programme was joined the apology stayed: the booking
 * page told visitors transfers were not on offer on the same screen as a
 * working transfer card. Nothing failed, nothing looked broken, and it was
 * found by a person clicking it.
 *
 * A page asking this question instead cannot fall out of step. The list
 * shrinks the moment a hand-off is configured and grows back if it is turned
 * off, without anybody editing a file.
 *
 * LANDING PRODUCTS ONLY, deliberately. A search product's availability is a
 * question for the affiliate registry — it depends on a pasted redirect, the
 * partner it resolves to and whether that partner can express the search — and
 * routeFor already answers it. This is the simpler question the landing cards
 * need: has the owner enabled it and given it somewhere real to go.
 */
export function essentialIsBookable(id: EssentialServiceId, settings: TravelEssentialsSettings): boolean {
  if (!settings.sectionEnabled) return false;
  const def = defFor(id);
  if (def.linkMode !== "landing") return false;
  const cfg = settings.services[id];
  if (!cfg) return false;
  // ANY provider in the category counts. The first one being switched off does
  // not mean the category is unavailable when a second is live — that is the
  // whole point of a category holding more than one.
  return offersFor(def, cfg).length > 0;
}

/** Why a landing URL cannot be used, or null. */
export function landingUrlProblem(url: string): string | null {
  const value = url.trim();
  if (!value) return "Paste the tracked affiliate link from your dashboard.";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return "The link must start with https://.";
  } catch {
    return "That is not a link. Paste the whole address, starting with https://.";
  }
  return null;
}

/** Network inferred from a pasted landing URL. */
export function networkFromLandingUrl(url: string): AffiliateNetwork {
  const stay = readStay22Link(url);
  if (stay) return "stay22";
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

export type EssentialContext = {
  pageType: EssentialPageType;
  /** Destination display name when known. */
  destinationName?: string;
  destinationSlug?: string;
  /** Optional dates / airports for search-mode cards. */
  checkIn?: string;
  checkOut?: string;
  from?: string;
  to?: string;
  adults?: number;
  /** Path for click reporting. */
  page: string;
  /** Placement prefix, e.g. destination-essentials. */
  placement: string;
};

export type EssentialCard = {
  id: EssentialServiceId;
  /**
   * Which provider in the category, 0 for the first. Carried into /go so the
   * server can resolve THAT provider's URL — the destination never travels in
   * the query string, which is what stops the redirect being pointed anywhere.
   */
  offer: number;
  name: string;
  blurb: string;
  cta: string;
  icon: string;
  href: string;
  product: TravelProduct;
  network: AffiliateNetwork;
  earns: boolean;
  linkMode: EssentialLinkMode;
};

/**
 * Every provider in a category that a visitor could be sent to, first one first.
 *
 * The first is the category's own `url`; the rest are `extra`. An entry with no
 * usable link is dropped rather than rendered as a dead card. An extra with no
 * NAME is dropped too: two cards in one category are told apart by their
 * labels, and an unnamed second card is indistinguishable from the first.
 */
export function offersFor(def: EssentialServiceDef, cfg: EssentialServiceConfig): Array<EssentialOffer & { offer: number }> {
  if (def.linkMode !== "landing") return [];
  const out: Array<EssentialOffer & { offer: number }> = [];
  if (cfg.enabled && landingUrlProblem(cfg.url) === null) {
    out.push({ label: cfg.label ?? "", url: cfg.url, cta: cfg.cta, blurb: cfg.blurb, enabled: true, offer: 0 });
  }
  (cfg.extra ?? []).forEach((row, index) => {
    if (!row.enabled) return;
    if (landingUrlProblem(row.url) !== null) return;
    if (!row.label.trim()) return;
    out.push({ ...row, offer: index + 1 });
  });
  return out;
}

function pageTypesFor(def: EssentialServiceDef, cfg: EssentialServiceConfig): EssentialPageType[] {
  return cfg.pageTypes.length > 0 ? cfg.pageTypes : [...def.defaultPageTypes];
}

/**
 * Admin status line for one service. Never null.
 */
export function describeEssentialService(
  id: EssentialServiceId,
  settings: TravelEssentialsSettings,
  affiliate: AffiliateConfig,
): string {
  const def = defFor(id);
  const cfg = settings.services[id];
  if (!settings.sectionEnabled) return "Section off — hidden everywhere.";
  if (def.linkMode === "landing") {
    // Counted from what would actually render, so the line cannot disagree with
    // the page. A category with a second provider says so, because "live" for
    // one of two is not the same answer as "live".
    const live = offersFor(def, cfg);
    if (live.length === 0) {
      if (!cfg.enabled && (cfg.extra ?? []).length === 0) return "Disabled — hidden from visitors.";
      const problem = landingUrlProblem(cfg.url);
      return `Not shown — ${problem ?? "no provider in this category is enabled with a usable link."}`;
    }
    const untracked = live.filter((offer) => !looksTracked(offer.url)).length;
    const where = pageTypesFor(def, cfg).join(", ");
    const many = live.length > 1 ? `${live.length} providers, side by side, ` : "";
    if (untracked === live.length) {
      return `${many}saved with a direct link. It will show, but may earn nothing — prefer a tracked Travelpayouts or Stay22 link.`;
    }
    const network = networkFromLandingUrl(live[0].url);
    const partial = untracked > 0 ? ` ${untracked} of them earns nothing — check that link.` : "";
    return `${many}live via ${network === "none" ? "tracked link" : network === "stay22" ? "Stay22" : "Travelpayouts"} on ${where}.${partial}`;
  }
  if (!cfg.enabled) return "Disabled — hidden from visitors.";
  const route = routeFor(def.product, affiliate);
  if (route.network === "none" && !route.destinationLabel) {
    return `Not shown — ${route.note}`;
  }
  return `${route.earns ? "Can earn" : "Works, earns nothing"} via ${route.destinationLabel || "partner"} (${route.network}). Pages: ${pageTypesFor(def, cfg).join(", ")}.`;
}

/**
 * Cards a visitor should see for this context, in display order.
 *
 * Hides completely when disabled, missing config, or the affiliate registry
 * cannot build a real hand-off. Never returns placeholder cards.
 */
export function essentialsForContext(
  settings: TravelEssentialsSettings,
  affiliate: AffiliateConfig,
  ctx: EssentialContext,
): EssentialCard[] {
  if (!settings.sectionEnabled) return [];

  const rows = ESSENTIAL_SERVICES.map((def) => ({ def, cfg: settings.services[def.id] })).sort(
    (a, b) => a.cfg.order - b.cfg.order || a.def.name.localeCompare(b.def.name),
  );

  const out: EssentialCard[] = [];
  for (const { def, cfg } of rows) {
    // A landing category is available while ANY provider in it is. The old
    // guard read the first provider's switch as the category's, so turning
    // Airalo off would have taken Yesim down with it.
    if (def.linkMode === "landing" ? offersFor(def, cfg).length === 0 : !cfg.enabled) continue;
    if (!pageTypesFor(def, cfg).includes(ctx.pageType)) continue;
    if (
      ctx.pageType === "destination" &&
      cfg.destinations.length > 0 &&
      ctx.destinationSlug &&
      !cfg.destinations.includes(ctx.destinationSlug)
    ) {
      continue;
    }

    const blurb = cfg.blurb.trim() || def.blurb;
    const cta = cfg.cta.trim() || def.cta;
    const placement = `${ctx.placement}-${def.id}`;
    const campaignId = `essentials_${def.id}`;

    if (def.linkMode === "landing") {
      // ONE CARD PER PROVIDER, side by side. A category with two eSIM
      // programmes shows both, each named, because the traveller is choosing
      // between them — see EssentialOffer.
      const offers = offersFor(def, cfg);
      if (offers.length === 0) continue;
      for (const offer of offers) {
        // Open redirect safety is unchanged: the destination never travels in
        // the query string. `offer` is an index the server resolves against its
        // own config, so a stranger editing it can only ever reach one of the
        // owner's own links — or nothing.
        const href = goHref({
          product: def.product,
          destination: ctx.destinationName,
          destinationSlug: ctx.destinationSlug,
          page: ctx.page,
          placement: `${placement}${offer.offer > 0 ? `-${offer.offer}` : ""}`,
          campaignId,
          checkIn: ctx.checkIn,
          checkOut: ctx.checkOut,
          offer: offer.offer,
        });
        out.push({
          id: def.id,
          offer: offer.offer,
          // THE OWNER'S NAME WINS WHENEVER HE GAVE ONE. Simpler than deciding
          // by how many cards happen to be live, and it survives one of two
          // being switched off: the remaining card keeps saying which company
          // it is rather than reverting to the category's title. Everything
          // saved before this existed has no label, so it reads exactly as it
          // did — that is the compatibility guarantee, not an accident.
          name: offer.label.trim() || def.name,
          blurb: offer.blurb.trim() || def.blurb,
          cta: offer.cta.trim() || def.cta,
          icon: def.icon,
          href,
          product: def.product,
          network: networkFromLandingUrl(offer.url),
          earns: looksTracked(offer.url),
          linkMode: "landing",
        });
      }
      continue;
    }

    const resolved = resolveLink(
      {
        product: def.product,
        destination: ctx.destinationName,
        destinationSlug: ctx.destinationSlug,
        checkIn: ctx.checkIn,
        checkOut: ctx.checkOut,
        from: ctx.from,
        to: ctx.to,
        adults: ctx.adults,
        page: ctx.page,
        placement,
        campaignId,
      },
      affiliate,
    );
    if (!resolved) continue;

    out.push({
      id: def.id,
      offer: 0,
      name: def.name,
      blurb,
      cta,
      icon: def.icon,
      href: goHref({
        product: def.product,
        destination: ctx.destinationName,
        destinationSlug: ctx.destinationSlug,
        checkIn: ctx.checkIn,
        checkOut: ctx.checkOut,
        from: ctx.from,
        to: ctx.to,
        adults: ctx.adults,
        page: ctx.page,
        placement,
        campaignId,
      }),
      product: def.product,
      network: resolved.route.network,
      earns: resolved.route.earns,
      linkMode: "search",
    });
  }
  return out;
}

/** Owner checklist rows for programmes that need dashboard confirmation. */
export const OWNER_PROGRAMME_CHECKLIST = [
  {
    category: "Hotels / stays",
    status: "Configured in project via Stay22 (aid + provider). Confirm aid is live in the Stay22 dashboard.",
    where: "/admin/settings/earnings",
  },
  {
    category: "Flights",
    status: "Earns when a Stay22 Kayak (or Travelpayouts) wrap is pasted on the Flights row.",
    where: "/admin/settings/earnings",
  },
  {
    category: "Cars",
    status: "Earns when a Stay22 Kayak (or Travelpayouts) wrap is pasted on the Cars row.",
    where: "/admin/settings/earnings",
  },
  {
    category: "Travel insurance",
    status: "Not auto-configured. Confirm the programme is approved in Travelpayouts, then paste the tracked link here.",
    where: "/admin/settings/earnings",
  },
  {
    category: "eSIM",
    status: "Not auto-configured. Confirm approval, then paste the tracked link here.",
    where: "/admin/settings/earnings",
  },
  {
    category: "Airport transfers",
    status: "Not auto-configured. Confirm approval, then paste the tracked link here.",
    where: "/admin/settings/earnings",
  },
  {
    category: "Tours / attractions",
    status: "Not auto-configured. Confirm approval, then paste the tracked link here.",
    where: "/admin/settings/earnings",
  },
  {
    category: "Lounges, train/bus, luggage storage",
    status: "Not present in this codebase. Do not enable until a programme is approved and a link is pasted — do not guess.",
    where: "/admin/settings/earnings",
  },
] as const;
