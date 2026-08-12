/**
 * Admin-only Duffel Stays search helpers.
 *
 * POST /stays/search is a backend call. Visitors never see Duffel: public
 * hotels go through Stay22 on /book. This module builds the official request,
 * checks Duffel's published limits, and turns Duffel's error objects (title,
 * message, code, type) into something the admin screen can show without
 * inventing hotels.
 *
 * Search by location or by accommodation, never both. cheapest_rate_total_amount
 * is the price to display — room/rate payloads on this endpoint may be incomplete.
 */

import { DUFFEL_API_ORIGIN } from "@/lib/duffel-api";

export const DUFFEL_STAYS_SEARCH_URL = `${DUFFEL_API_ORIGIN}/stays/search`;
export const MAX_CHECK_IN_DAYS_AHEAD = 330;
export const MAX_STAY_NIGHTS = 99;
export const DEFAULT_SEARCH_RADIUS_KM = 5;
export const MAX_STAY_RESULTS = 20;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type StayPlaceMatch = {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};

export type StaySearchResult = {
  id: string;
  name: string;
  address: string;
  city?: string;
  rating?: number;
  totalAmount: string;
  totalCurrency: string;
  photo?: string;
};

export type StaySearchBody = {
  data: {
    rooms: number;
    check_in_date: string;
    check_out_date: string;
    guests: Array<{ type: "adult" }>;
    location: {
      radius: number;
      geographic_coordinates: { latitude: number; longitude: number };
    };
  };
};

type DuffelError = { title?: string; message?: string; code?: string; type?: string };

export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function nightsBetween(checkInDate: string, checkOutDate: string): number | null {
  if (!ISO_DATE.test(checkInDate) || !ISO_DATE.test(checkOutDate)) return null;
  const start = Date.parse(`${checkInDate}T00:00:00Z`);
  const end = Date.parse(`${checkOutDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.round((end - start) / 86_400_000);
}

export function daysAhead(isoDate: string, today = utcToday()): number | null {
  if (!ISO_DATE.test(isoDate) || !ISO_DATE.test(today)) return null;
  const start = Date.parse(`${today}T00:00:00Z`);
  const when = Date.parse(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(when)) return null;
  return Math.round((when - start) / 86_400_000);
}

function wholeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim());
    if (Number.isInteger(n)) return n;
  }
  return null;
}

function validIsoDate(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!ISO_DATE.test(text)) return null;
  const [year, month, day] = text.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return text;
}

export function parseCoordinates(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } | null {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return null;
  const lat = typeof latitude === "number" ? latitude : Number(String(latitude).trim());
  const lng = typeof longitude === "number" ? longitude : Number(String(longitude).trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { latitude: lat, longitude: lng };
}

/** Typed "40.72, -74.00" from the admin box, not a place name. */
export function parseCoordinateQuery(value: unknown): { latitude: number; longitude: number } | null {
  const match = String(value ?? "").trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return parseCoordinates(match[1], match[2]);
}

export function validateStaySearchInput(
  input: {
    checkInDate: unknown;
    checkOutDate: unknown;
    rooms?: unknown;
    guests?: unknown;
  },
  today = utcToday(),
): { ok: true; checkInDate: string; checkOutDate: string; rooms: number; guests: number } | { ok: false; message: string } {
  const checkInDate = validIsoDate(input.checkInDate);
  const checkOutDate = validIsoDate(input.checkOutDate);
  if (!checkInDate || !checkOutDate) {
    return { ok: false, message: "Enter check-in and check-out as complete dates." };
  }

  const ahead = daysAhead(checkInDate, today);
  if (ahead === null || ahead < 0) {
    return { ok: false, message: "Check-in cannot be in the past." };
  }
  if (ahead > MAX_CHECK_IN_DAYS_AHEAD) {
    return { ok: false, message: `Check-in cannot be more than ${MAX_CHECK_IN_DAYS_AHEAD} days from today.` };
  }

  const nights = nightsBetween(checkInDate, checkOutDate);
  if (nights === null || nights < 1) {
    return { ok: false, message: "Check-out must be after check-in." };
  }
  if (nights > MAX_STAY_NIGHTS) {
    return { ok: false, message: `A stay cannot be more than ${MAX_STAY_NIGHTS} nights.` };
  }

  const rooms = wholeInt(input.rooms ?? 1) ?? 0;
  const guests = wholeInt(input.guests ?? 2) ?? 0;
  if (rooms < 1 || rooms > 8) {
    return { ok: false, message: "Rooms must be a whole number from 1 to 8." };
  }
  if (guests < 1 || guests > 16) {
    return { ok: false, message: "Guests must be a whole number from 1 to 16." };
  }
  if (guests < rooms) {
    return { ok: false, message: "Duffel needs at least one adult guest per room." };
  }

  return { ok: true, checkInDate, checkOutDate, rooms, guests };
}

/**
 * Location search only. The accommodation object is omitted on purpose:
 * Duffel rejects a request that sends both.
 */
export function staysSearchBody(params: {
  checkInDate: string;
  checkOutDate: string;
  rooms: number;
  guests: number;
  latitude: number;
  longitude: number;
  radius?: number;
}): StaySearchBody {
  return {
    data: {
      rooms: params.rooms,
      check_in_date: params.checkInDate,
      check_out_date: params.checkOutDate,
      guests: Array.from({ length: params.guests }, () => ({ type: "adult" as const })),
      location: {
        radius: params.radius ?? DEFAULT_SEARCH_RADIUS_KM,
        geographic_coordinates: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
      },
    },
  };
}

type StayAddress = {
  line_one?: string;
  city_name?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
};

export function formatStayAddress(address?: StayAddress | null): string {
  if (!address) return "";
  return [address.line_one, address.city_name, address.region, address.postal_code, address.country_code]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

type RawStayResult = {
  id?: string;
  cheapest_rate_total_amount?: string;
  cheapest_rate_currency?: string;
  accommodation?: {
    name?: string;
    rating?: number;
    photos?: Array<{ url?: string }>;
    address?: StayAddress;
    location?: { address?: StayAddress };
  };
};

export function mapStayResults(raw: unknown): StaySearchResult[] {
  const rows = Array.isArray(raw) ? raw : [];
  const hotels: StaySearchResult[] = [];
  for (const row of rows) {
    const item = row as RawStayResult;
    if (!item?.id) continue;
    const acc = item.accommodation;
    const address = formatStayAddress(acc?.location?.address ?? acc?.address);
    const photo = acc?.photos?.find((p) => typeof p?.url === "string" && /^https:\/\//.test(p.url))?.url;
    hotels.push({
      id: item.id,
      name: acc?.name?.trim() || "Stay",
      address,
      city: acc?.location?.address?.city_name ?? acc?.address?.city_name,
      rating: acc?.rating,
      totalAmount: String(item.cheapest_rate_total_amount ?? ""),
      totalCurrency: String(item.cheapest_rate_currency ?? "USD"),
      photo,
    });
    if (hotels.length >= MAX_STAY_RESULTS) break;
  }
  return hotels;
}

export function parseDuffelErrorList(body: string): DuffelError | null {
  try {
    const parsed = JSON.parse(body) as { errors?: DuffelError[] };
    return parsed.errors?.[0] ?? null;
  } catch {
    return null;
  }
}

export function duffelErrorSaid(error: DuffelError | null): string {
  if (!error) return "";
  return [error.title, error.message].filter(Boolean).join(" — ");
}

/**
 * Duffel's error objects, turned into admin copy.
 *
 * 403 / insufficient_permissions on this endpoint usually means Stays is not
 * enabled on the account. The API's own title and message are kept so the
 * screen does not invent a hotel list.
 */
export function explainDuffelStaysError(
  status: number,
  body: string,
  requestId?: string | null,
): { message: string; detail?: string } {
  const first = parseDuffelErrorList(body);
  const said = duffelErrorSaid(first);
  const code = `${first?.code ?? ""} ${first?.type ?? ""}`.toLowerCase();
  const support = requestId ? ` Duffel request id: ${requestId}.` : "";

  // 403 insufficient_permissions is typed authentication_error. Check it
  // before the token-rejected branch, or a missing Stays product looks like a
  // bad key.
  if (status === 403 || /insufficient_permissions/.test(code)) {
    return {
      message: "Duffel Stays is not enabled on this account.",
      detail:
        (said ? `${said} ` : "") +
        "The token was accepted, but this search was refused. Enable Stays in the Duffel dashboard. White Glove will not invent hotels when Duffel refuses.",
    };
  }

  if (status === 401 || /access_token|invalid_api_token|unauthorized|invalid_authorization/.test(code)) {
    return {
      message: "Duffel did not accept the access token.",
      detail:
        said ||
        "Check DUFFEL_ACCESS_TOKEN. Duffel issues separate tokens for test and live. Environment variables are read at build time, so redeploy after changing it.",
    };
  }

  if (status === 429 || /rate_limit/.test(code)) {
    return { message: "Duffel is rate-limiting this account.", detail: said || "Wait a minute and try again." };
  }

  if (/stay_too_long/.test(code)) {
    return { message: `A stay cannot be more than ${MAX_STAY_NIGHTS} nights.`, detail: said || undefined };
  }
  if (/check_out_not_after_check_in/.test(code)) {
    return { message: "Check-out must be after check-in.", detail: said || undefined };
  }
  if (/rooms_must_have_at_least_one_adult/.test(code)) {
    return { message: "Duffel needs at least one adult guest per room.", detail: said || undefined };
  }

  if (status === 400 || status === 422) {
    return {
      message: "Duffel refused the stay search as written.",
      detail: said || "One of the dates, rooms, guests, or the location was not something Duffel accepts.",
    };
  }

  if (status >= 500) {
    return {
      message: "Duffel's own service is having trouble.",
      detail: (said || "Nothing is wrong at this end — try again shortly.") + support,
    };
  }

  return {
    message: `Duffel returned HTTP ${status}.`,
    detail: (said || "Duffel sent no explanation with this.") + support,
  };
}
