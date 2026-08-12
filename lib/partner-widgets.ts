/**
 * Official Travelpayouts search-form widgets for /book Flights and Cars.
 *
 * Stay22 has no Kayak embed for flights or cars — only accommodation maps and
 * Allez deep links. Duffel stays off the public site. Hotels stay on the
 * Stay22 live API.
 *
 * Flights: Aviasales search form (promo_id 7879, campaign 100). Search and
 * results happen in that form / on Aviasales. The marker on the script is how
 * the widget earns — different from a pasted tp.media redirect on a link.
 *
 * Cars: EconomyBookings (the programme this account was approved for) has no
 * search-form widget, only banners and deep links. DiscoverCars does have a
 * search form in the Travelpayouts dashboard, but the embed code is generated
 * per account after joining that programme and is not a public promo_id we can
 * paste. Localrent's rental search form (promo_id 4322, campaign 87) is the
 * working public Travelpayouts car widget; it carries the same marker. It
 * earns when Localrent is approved on the account; otherwise the Cars tab
 * still has a tracked /go hand-off for the car partner on the earnings screen.
 *
 * Project id 559771 is the same number already on every public page in
 * components/TravelpayoutsScript.tsx (the Emerald verification snippet).
 */

import { travelpayoutsMarker } from "@/lib/travelpayouts-api";

const WIDGET_ENDPOINT = "https://tp.media/content";
const PROJECT_ID = "559771";

const NAVY = "172d52";
const GOLD = "aa8b52";
const CREAM = "fcfaf6";
const GOLD_LIGHT = "d9c7a3";

export const AVIASALES_SEARCH_FORM = { promo_id: "7879", campaign_id: "100" } as const;
export const LOCALRENT_SEARCH_FORM = { promo_id: "4322", campaign_id: "87" } as const;

export type FlightWidgetPrefill = {
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  oneWay?: boolean;
  adults?: number;
  nonstop?: boolean;
};

function iata(value: string | undefined): string {
  const code = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function iso(value: string | undefined): string {
  const date = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function widgetUrl(params: Record<string, string>): string | "" {
  const marker = travelpayoutsMarker();
  if (!marker) return "";
  const search = new URLSearchParams({
    shmarker: marker,
    trs: PROJECT_ID,
    powered_by: "false",
    ...params,
  });
  return `${WIDGET_ENDPOINT}?${search.toString()}`;
}

/**
 * Aviasales search-form script URL, or "" when the marker is missing.
 *
 * Prefill params are the ones the widget constructor documents (origin,
 * destination, dates). Unsupported values are dropped rather than guessed.
 */
export function aviasalesWidgetSrc(prefill: FlightWidgetPrefill = {}): string {
  const origin = iata(prefill.origin);
  const destination = iata(prefill.destination);
  const depart = iso(prefill.departDate);
  const back = iso(prefill.returnDate);
  const params: Record<string, string> = {
    promo_id: AVIASALES_SEARCH_FORM.promo_id,
    campaign_id: AVIASALES_SEARCH_FORM.campaign_id,
    locale: "en_us",
    currency: "usd",
    searchUrl: "www.aviasales.com/search",
    show_hotels: "false",
    plain: "true",
    border_radius: "16",
    color_button: `#${NAVY}`,
    color_icons: `#${GOLD}`,
    color_focused: `#${GOLD}`,
    dark: `#${NAVY}`,
    light: "#FFFFFF",
    secondary: `#${CREAM}`,
    special: `#${GOLD_LIGHT}`,
  };
  if (origin) params.origin = origin;
  if (destination) params.destination = destination;
  if (depart) params.depart_date = depart;
  if (prefill.oneWay) {
    params.one_way = "true";
  } else if (back) {
    params.return_date = back;
    params.one_way = "false";
  }
  const adults = Math.floor(Number(prefill.adults));
  if (Number.isFinite(adults) && adults >= 1) params.adults = String(Math.min(9, adults));
  if (prefill.nonstop) params.only_direct = "true";
  return widgetUrl(params);
}

/** Localrent car search-form script URL, or "" when the marker is missing. */
export function localrentWidgetSrc(): string {
  return widgetUrl({
    promo_id: LOCALRENT_SEARCH_FORM.promo_id,
    campaign_id: LOCALRENT_SEARCH_FORM.campaign_id,
    locale: "en",
    lang: "en",
    currency: "usd",
    width: "100",
    background: "light",
    header: "false",
    logo: "false",
    footer: "false",
    border: "false",
    cars: "true",
  });
}

export function partnerWidgetsConfigured(): boolean {
  return Boolean(travelpayoutsMarker());
}
