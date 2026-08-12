/**
 * Stay22 Direct Travel API — live places to stay, prices, and tracked deeplinks.
 *
 * WHY THIS IS SEPARATE FROM lib/stay22.ts. That file builds Allez hand-off
 * links from the affiliate ID alone. This file talks to Stay22's inventory API
 * so /book can show options and prices on White Glove before the traveller
 * leaves to pay. Payment stays with the partner; White Glove never takes a card.
 *
 * Auth: X-API-KEY header. Env name: STAY22_API_KEY (from hub.stay22.com →
 * Settings → API). Without it, callers fall back to Allez (AID) hand-off.
 *
 * TERMS: do not cold-store listings. Short in-memory TTL only.
 * Docs: https://dev.stay22.com/docs/api/accommodations/search
 *
 * Flights are not in this API. Stay22's Direct Travel API is accommodations
 * only. Kayak flights earn through Allez (`/allez/kayak?aid=&link=`), built
 * in lib/stay22.ts from the Stay22 ID — STAY22_API_KEY cannot list fares.
 */

import { CAMPAIGN, type HotelSearch, type Stay22Settings } from "@/lib/stay22";

const API_BASE = "https://api.stay22.com/v2/accommodations";
const CACHE_TTL_MS = 90_000;
const MAX_RESULTS = 12;

export type Stay22LiveStay = {
  id: string;
  name: string;
  type?: string;
  address?: string;
  rating?: number | null;
  stars?: number | null;
  thumbnail?: string | null;
  freeCancellation?: boolean;
  /** Cheapest quoted total for the stay, when dates were supplied. */
  priceTotal?: number | null;
  currency: string;
  nights?: number | null;
  /** Tracked Stay22 deeplink — partner takes payment. */
  bookUrl: string;
  supplierLabel?: string;
};

export type Stay22SearchResult =
  | { ok: true; mode: "live"; stays: Stay22LiveStay[]; currency: string; message: string }
  | { ok: false; mode: "unavailable"; message: string; detail?: string };

type CacheEntry = { at: number; value: Stay22SearchResult };
const memoryCache = new Map<string, CacheEntry>();

/** Whether live Stay22 inventory can be attempted. */
export function stay22ApiConfigured(): boolean {
  return Boolean(process.env.STAY22_API_KEY?.trim());
}

function apiKey(): string {
  return process.env.STAY22_API_KEY?.trim() ?? "";
}

function isStay22Url(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && (parsed.host === "stay22.com" || parsed.host.endsWith(".stay22.com"));
  } catch {
    return false;
  }
}

type RawSupplier = {
  id?: string;
  link?: string;
  price?: { total?: number } | null;
};

type RawStay = {
  id?: string;
  name?: string;
  type?: string;
  url?: string;
  location?: { address?: string };
  rating?: { value?: number; hotelStars?: number | null };
  policies?: { freeCancellation?: boolean };
  media?: { thumbnail?: string };
  suppliers?: Record<string, RawSupplier>;
};

function pickBookUrl(stay: RawStay): { url: string; price: number | null; supplier?: string } | null {
  const suppliers = stay.suppliers ?? {};
  let best: { url: string; price: number | null; supplier?: string } | null = null;
  for (const [key, supplier] of Object.entries(suppliers)) {
    const link = supplier.link?.trim() ?? "";
    if (!link || !isStay22Url(link)) continue;
    const total = typeof supplier.price?.total === "number" ? supplier.price.total : null;
    if (!best || (total != null && (best.price == null || total < best.price))) {
      best = { url: link, price: total, supplier: key };
    }
  }
  const top = stay.url?.trim() ?? "";
  if (top && isStay22Url(top)) {
    if (!best || best.price == null) {
      return { url: top, price: best?.price ?? null, supplier: best?.supplier };
    }
  }
  return best;
}

function cacheKey(search: HotelSearch, aid: string): string {
  return [search.address.trim().toLowerCase(), search.checkin, search.checkout, search.adults, aid].join("|");
}

/**
 * Live accommodation search. Returns unavailable when the key is missing so
 * the UI can fall back to Allez without pretending inventory was empty.
 */
export async function searchStay22Accommodations(
  search: HotelSearch,
  settings: Stay22Settings,
): Promise<Stay22SearchResult> {
  const key = apiKey();
  if (!key) {
    return {
      ok: false,
      mode: "unavailable",
      message: "Live places to stay need STAY22_API_KEY on the server.",
      detail: "Add the key from hub.stay22.com (Settings → API) to .env.local and Vercel. Searches still open via Stay22 AID when that is set.",
    };
  }

  const address = search.address.trim();
  if (!address) {
    return { ok: false, mode: "unavailable", message: "Enter a city or destination." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(search.checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(search.checkout)) {
    return { ok: false, mode: "unavailable", message: "Choose check-in and check-out dates." };
  }
  if (search.checkout <= search.checkin) {
    return { ok: false, mode: "unavailable", message: "Check-out must be after check-in." };
  }

  const aid = settings.aid.trim();
  const memoKey = cacheKey(search, aid);
  const hit = memoryCache.get(memoKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const params = new URLSearchParams();
  params.set("address", address);
  params.set("checkin", search.checkin);
  params.set("checkout", search.checkout);
  params.set("adults", String(Math.max(1, Math.floor(search.adults) || 1)));
  params.set("rooms", "1");
  params.set("currency", "USD");
  params.set("lang", "en");
  params.set("pageSize", String(MAX_RESULTS));
  params.set("page", "1");
  params.set("campaign", CAMPAIGN);
  if (aid) params.set("aid", aid);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-KEY": key,
      },
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      mode: "unavailable",
      message: "Stay22 could not be reached just now.",
      detail: "Try again shortly, or open the partner search to compare options there.",
    };
  }

  if (response.status === 401) {
    return {
      ok: false,
      mode: "unavailable",
      message: "Stay22 did not accept the API key.",
      detail: "Check STAY22_API_KEY in Vercel and regenerate it at hub.stay22.com if needed.",
    };
  }
  if (response.status === 429) {
    return {
      ok: false,
      mode: "unavailable",
      message: "Stay22 is rate-limiting searches.",
      detail: "Wait a minute and try again.",
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      mode: "unavailable",
      message: "Stay22 could not complete this search.",
      detail: `HTTP ${response.status}`,
    };
  }

  const body = (await response.json().catch(() => null)) as {
    meta?: { currency?: string; nights?: number; total?: number };
    results?: RawStay[];
  } | null;

  const currency = body?.meta?.currency?.toUpperCase() || "USD";
  const nights = body?.meta?.nights ?? null;
  const stays: Stay22LiveStay[] = [];

  for (const raw of body?.results ?? []) {
    const picked = pickBookUrl(raw);
    if (!picked) continue;
    stays.push({
      id: String(raw.id ?? picked.url),
      name: raw.name?.trim() || "Place to stay",
      type: raw.type,
      address: raw.location?.address,
      rating: raw.rating?.value ?? null,
      stars: raw.rating?.hotelStars ?? null,
      thumbnail: raw.media?.thumbnail ?? null,
      freeCancellation: Boolean(raw.policies?.freeCancellation),
      priceTotal: picked.price,
      currency,
      nights,
      bookUrl: picked.url,
      supplierLabel: picked.supplier,
    });
    if (stays.length >= MAX_RESULTS) break;
  }

  const result: Stay22SearchResult = {
    ok: true,
    mode: "live",
    stays,
    currency,
    message: stays.length
      ? `${stays.length} place${stays.length === 1 ? "" : "s"} to stay for your dates.`
      : "No places returned for those dates. Try nearby dates, or open the partner search.",
  };
  memoryCache.set(memoKey, { at: Date.now(), value: result });
  return result;
}
