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
export type EssentialPageType = "destination" | "itinerary" | "book" | "transfers";

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
    defaultPageTypes: ["destination"],
    preferredNetwork: "travelpayouts",
    adminNote: "Only enable once a tours/attractions programme link is approved and pasted.",
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

export type EssentialServiceConfig = {
  enabled: boolean;
  /** Landing URL for landing-mode services. Ignored for search-mode. */
  url: string;
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

const PAGE_TYPES: readonly EssentialPageType[] = ["destination", "itinerary", "book", "transfers"];

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
  };
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
  if (!cfg.enabled) return "Disabled — hidden from visitors.";
  if (def.linkMode === "landing") {
    const problem = landingUrlProblem(cfg.url);
    if (problem) return `Not shown — ${problem}`;
    if (!looksTracked(cfg.url)) {
      return "Saved with a direct link. It will show, but may earn nothing — prefer a tracked Travelpayouts or Stay22 link.";
    }
    const network = networkFromLandingUrl(cfg.url);
    return `Live via ${network === "none" ? "tracked link" : network === "stay22" ? "Stay22" : "Travelpayouts"} on ${pageTypesFor(def, cfg).join(", ")}.`;
  }
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
    if (!cfg.enabled) continue;
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
      if (landingUrlProblem(cfg.url)) continue;
      // Open redirect safety: landing URLs never go in the query string.
      // Visitors hit /go with product=…; the server reads the URL from config.
      const href = goHref({
        product: def.product,
        destination: ctx.destinationName,
        destinationSlug: ctx.destinationSlug,
        page: ctx.page,
        placement,
        campaignId,
        checkIn: ctx.checkIn,
        checkOut: ctx.checkOut,
      });
      out.push({
        id: def.id,
        name: def.name,
        blurb,
        cta,
        icon: def.icon,
        href,
        product: def.product,
        network: networkFromLandingUrl(cfg.url),
        earns: looksTracked(cfg.url),
        linkMode: "landing",
      });
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
    where: "/admin/settings/travel-essentials",
  },
  {
    category: "eSIM",
    status: "Not auto-configured. Confirm approval, then paste the tracked link here.",
    where: "/admin/settings/travel-essentials",
  },
  {
    category: "Airport transfers",
    status: "Not auto-configured. Confirm approval, then paste the tracked link here.",
    where: "/admin/settings/travel-essentials",
  },
  {
    category: "Tours / attractions",
    status: "Not auto-configured. Confirm approval, then paste the tracked link here.",
    where: "/admin/settings/travel-essentials",
  },
  {
    category: "Lounges, train/bus, luggage storage",
    status: "Not present in this codebase. Do not enable until a programme is approved and a link is pasted — do not guess.",
    where: "/admin/settings/travel-essentials",
  },
] as const;
