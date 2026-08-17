/**
 * One shape for travel inventory, whoever supplied it.
 *
 * WHY THIS EXISTS. The site already talks to four travel companies, and each
 * one answers in its own shape: Duffel returns offers, Stay22 returns
 * accommodations, Travelpayouts returns Aviasales tickets, and the car "search"
 * returns a single compare row because there is no car API at all. Every page
 * that wants to show any of it has had to know which company it was talking to.
 *
 * This is the shape they all become. It is deliberately small — what a card
 * shows, what a price is, and how a traveler actually gets the thing — with
 * everything an accountant or a comparison needs kept in `meta`, out of the
 * way of the UI.
 *
 * NOTHING HERE REPLACES THE EXISTING MODULES. The adapters wrap them. Duffel
 * still speaks Duffel; this is the translation.
 */

/** Every company that can put inventory in front of a traveler. */
export type ProviderId = "duffel" | "stay22" | "travelpayouts" | "routestack";

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  duffel: "Duffel",
  stay22: "Stay22",
  travelpayouts: "Travelpayouts",
  routestack: "RouteStack",
};

/** The three things a traveler searches for. Kosher data is never in here. */
export type TravelCategory = "flight" | "hotel" | "car";

export const TRAVEL_CATEGORIES: readonly TravelCategory[] = ["flight", "hotel", "car"] as const;

export const CATEGORY_LABELS: Record<TravelCategory, string> = {
  flight: "Flights",
  hotel: "Hotels",
  car: "Cars",
};

/**
 * HOW A TRAVELER ACTUALLY GETS THIS — the field the whole design turns on.
 *
 * Three genuinely different products hide behind the word "offer":
 *
 *   api-booking  We create the reservation ourselves and take the money.
 *                Duffel. The margin is ours and so is every consequence:
 *                the refund, the chargeback, the phone call at four in the
 *                afternoon when a gate is locked.
 *   deep-link    We hand the traveler to a checkout somebody else owns,
 *                pre-filled, and are paid a share. Stay22, RouteStack.
 *   widget       A partner's own search panel on our page. No offer of ours
 *                at all — the prices are theirs and we never quote them.
 *
 * A page that renders all three identically is telling the visitor a lie
 * about who they are buying from, which is why this is not optional and not
 * buried in `meta`.
 */
export type Fulfilment = "api-booking" | "deep-link" | "widget";

/** Everything a comparison, an audit or an invoice needs. Never rendered. */
export type OfferMeta = {
  provider: ProviderId;
  /** The provider's own id for this result, for support and reconciliation. */
  providerOfferId: string;
  /** When the quote stops being real. Absent means we were not told. */
  expiresAt?: string;
  /** "unknown" is a real answer and is treated as not-comparable. */
  refundable?: boolean | "unknown";
  cancellation?: string;

  /* flights */
  cabin?: string;
  bags?: number;
  stops?: number;
  airline?: string;

  /* hotels */
  roomType?: string;
  mealPlan?: string;

  /* cars */
  carClass?: string;
  mileage?: string;
  deposit?: string;
  /** The car, pictured by the provider. Absent when they have no photograph. */
  image?: string;
  /** Who is actually at the desk — Sixt, Green Motion — and their mark. */
  supplier?: string;
  supplierLogo?: string;

  /** What we earn, when the provider tells us. Never shown publicly. */
  commission?: { model: "share" | "cpa" | "none"; note?: string };
};

/** One result, in White Glove's own shape. */
export type TravelOffer = {
  /** Ours, stable within a single search. Not the provider's. */
  id: string;
  category: TravelCategory;
  /** What the card says. */
  headline: string;
  detail?: string;
  price?: { amount: number; currency: string };
  fulfilment: Fulfilment;
  /** Where the traveler goes. Absent for a widget. */
  bookHref?: string;
  /**
   * The provider's own payload for this offer. SERVER-SIDE ONLY.
   *
   * RouteStack's car checkout does not take a fare code — it takes the whole
   * car object back — so something has to carry it from the search to the
   * click. It rides here rather than to the browser and back, which would put
   * a provider's internals on a public page and let anyone edit the car they
   * are about to be quoted for.
   *
   * EVERY ROUTE THAT ANSWERS A BROWSER MUST DROP THIS. They all build their
   * response from named fields rather than spreading an offer, and a test
   * holds them to it — see tests/travel-provider-layer.test.ts.
   */
  raw?: unknown;
  meta: OfferMeta;
};

/**
 * What a traveler asked for.
 *
 * One shape for all three categories rather than three, because the fields
 * genuinely overlap — a place, some dates, some people — and a provider simply
 * ignores what does not apply to it. Adapters validate what they need.
 */
export type SearchQuery = {
  /** Airport code, city, or free text. What it means is the adapter's problem. */
  origin?: string;
  destination: string;
  /** YYYY-MM-DD. Departure, or check-in, or pick-up. */
  startDate: string;
  /** YYYY-MM-DD. Return, or check-out, or drop-off. Absent for one-way. */
  endDate?: string;
  adults?: number;
  children?: number;
  rooms?: number;
  currency?: string;
};

/** What one provider did when we asked it. Recorded whether it worked or not. */
export type ProviderAttempt = {
  provider: ProviderId;
  category: TravelCategory;
  ok: boolean;
  /** Milliseconds from request to usable answer. */
  ms: number;
  count: number;
  /** Grouped, never the raw provider message — see telemetry.ts. */
  error?: ErrorCategory;
  /** True when this provider ran out of time rather than failing. */
  timedOut?: boolean;
  /**
   * What the provider actually said, for the admin comparison screen.
   *
   * NEVER STORED. lib/travel/telemetry.ts builds its rows from named fields
   * and this is not among them, because a provider's error text can quote the
   * search back at us — and a search is somebody's travel plans.
   */
  detail?: string;
};

/**
 * Error kinds worth counting separately.
 *
 * Grouped rather than free text so a month of failures can be counted, and so
 * nothing a provider wrote about a traveler's search ends up in a log.
 */
export type ErrorCategory =
  | "not-configured"
  | "auth"
  | "rate-limited"
  | "timeout"
  | "bad-request"
  | "provider-error"
  | "network"
  | "unexpected";

/** The result of asking every enabled provider in a category. */
export type SearchOutcome = {
  category: TravelCategory;
  offers: TravelOffer[];
  /** One entry per provider asked, in the order they answered. */
  tried: ProviderAttempt[];
  /** True when at least one provider failed or ran out of time. */
  partial: boolean;
};
