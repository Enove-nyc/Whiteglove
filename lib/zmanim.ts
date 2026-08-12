/**
 * Halachic times for a place and date.
 *
 * Calculations come from kosher-zmanim (KosherJava port, LGPL-3.0) using the
 * NOAA solar algorithm.
 *
 * NO DISCLAIMER RIDES ALONG WITH THESE. Every result used to carry
 * "Informational travel aid only. Confirm with the local kehillah custom. White
 * Glove does not pasken." The owner had it removed, and he is right: a sunrise
 * is not an opinion, and a caveat under a number that IS correct teaches people
 * to discount the ones that matter.
 *
 * Where opinions genuinely differ, the ENTRY says so instead of the page —
 * "Sof zman Shema (Gra)" beside "Sof zman Shema (Magen Avraham)", candle
 * lighting labelled with the eighteen minutes it assumes, tzeis noted as the
 * library's default where customs vary. That is the honest form of the same
 * caution: naming which opinion produced the number, rather than apologising
 * for all of them at once. The attribution line stays too, so the page always
 * says what it computed, where, and with what.
 */

import { getZmanimJson } from "kosher-zmanim";

export type ZmanimInput = {
  /** Display name for attribution. */
  locationName: string;
  latitude: number;
  longitude: number;
  /** IANA timezone, e.g. Europe/Rome. */
  timeZoneId: string;
  /** YYYY-MM-DD */
  date: string;
};

export type ZmanEntry = {
  id: string;
  label: string;
  /** Clarifying note when opinions differ. */
  note?: string;
  /** Local clock time HH:MM, or null when the library could not compute it. */
  time: string | null;
};

export type ZmanimResult = {
  locationName: string;
  date: string;
  timeZoneId: string;
  latitude: number;
  longitude: number;
  algorithm: string;
  attribution: string;
  entries: ZmanEntry[];
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCoordinates(value: string | null | undefined): { lat: number; lon: number } | null {
  const match = value?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  if (lat === 0 && lon === 0) return null;
  return { lat, lon };
}

export function isValidZmanimDate(date: string): boolean {
  const match = DATE_RE.exec(date.trim());
  if (!match) return false;
  const parsed = new Date(`${date.trim()}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

/** Rough IANA-style fixed offset from longitude when no better zone is known. */
export function approximateTimeZoneId(longitude: number): string {
  const hours = Math.round(longitude / 15);
  if (hours === 0) return "UTC";
  const sign = hours > 0 ? "-" : "+"; // Etc/GMT signs are inverted
  return `Etc/GMT${sign}${Math.abs(hours)}`;
}

function clockFromIso(iso: string | undefined | null): string | null {
  if (!iso || typeof iso !== "string") return null;
  // "2026-08-11T06:12:34+02:00" → "06:12"
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  return match ? `${match[1]}:${match[2]}` : null;
}

type ZmanSpec = {
  id: string;
  label: string;
  note?: string;
  /** Prefer first available key from the JSON payload. */
  keys: string[];
};

/**
 * A sensible travel set. Sof zman Shema/tefillah show both Gra and Magen Avraham
 * so the page does not pretend there is one opinion.
 */
const TRAVEL_ZMANIM: ZmanSpec[] = [
  { id: "alos", label: "Alos hashachar", note: "18° dawn (common travel default)", keys: ["Alos18Degrees", "AlosHashachar"] },
  { id: "misheyakir", label: "Misheyakir", note: "≈11.5° below horizon", keys: ["Misheyakir11Point5Degrees", "Misheyakir11Degrees"] },
  { id: "sunrise", label: "Sunrise", keys: ["Sunrise", "SeaLevelSunrise"] },
  { id: "sof-zman-shema-gra", label: "Sof zman Shema (Gra)", keys: ["SofZmanShmaGRA"] },
  { id: "sof-zman-shema-mga", label: "Sof zman Shema (Magen Avraham)", keys: ["SofZmanShmaMGA"] },
  { id: "sof-zman-tefillah-gra", label: "Sof zman tefillah (Gra)", keys: ["SofZmanTfilaGRA"] },
  { id: "sof-zman-tefillah-mga", label: "Sof zman tefillah (Magen Avraham)", keys: ["SofZmanTfilaMGA"] },
  { id: "chatzos", label: "Chatzos", keys: ["Chatzos", "ChatzosAsHalfDay"] },
  { id: "mincha-gedola", label: "Mincha gedola", keys: ["MinchaGedola"] },
  { id: "mincha-ketana", label: "Mincha ketana", keys: ["MinchaKetana"] },
  { id: "plag", label: "Plag hamincha", keys: ["PlagHamincha"] },
  { id: "sunset", label: "Sunset", keys: ["Sunset", "SeaLevelSunset"] },
  { id: "candle-lighting", label: "Candle-lighting (18 min)", note: "Widespread custom; confirm local practice", keys: ["CandleLighting"] },
  { id: "tzeit", label: "Tzeit hakochavim", note: "Default library nightfall; customs vary widely", keys: ["Tzais", "TzaisGeonim8Point5Degrees"] },
];

const COMPACT_IDS = new Set([
  "sunrise",
  "sof-zman-shema-gra",
  "chatzos",
  "mincha-gedola",
  "sunset",
  "candle-lighting",
  "tzeit",
]);

/**
 * Compute zmanim for a place and date. Throws only on invalid input; returns
 * null times for individual zmanim the library cannot compute (polar edge cases).
 */
export function calculateZmanim(input: ZmanimInput): ZmanimResult {
  if (!isValidZmanimDate(input.date)) {
    throw new Error("Choose a valid date (YYYY-MM-DD).");
  }
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new Error("Latitude and longitude are required.");
  }
  if (Math.abs(input.latitude) > 90 || Math.abs(input.longitude) > 180) {
    throw new Error("Coordinates are out of range.");
  }
  if (!input.timeZoneId.trim()) {
    throw new Error("A timezone is required.");
  }

  const payload = getZmanimJson({
    date: input.date,
    timeZoneId: input.timeZoneId,
    locationName: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    elevation: 0,
    complexZmanim: true,
  });

  const zmanim = (payload as { Zmanim?: Record<string, string>; BasicZmanim?: Record<string, string> }).Zmanim
    ?? (payload as { BasicZmanim?: Record<string, string> }).BasicZmanim
    ?? {};
  const metadata = (payload as { metadata?: { algorithm?: string } }).metadata;

  const entries: ZmanEntry[] = TRAVEL_ZMANIM.map((spec) => {
    let iso: string | null = null;
    for (const key of spec.keys) {
      const value = zmanim[key];
      if (value) {
        iso = value;
        break;
      }
    }
    return {
      id: spec.id,
      label: spec.label,
      note: spec.note,
      time: clockFromIso(iso),
    };
  });

  return {
    locationName: input.locationName,
    date: input.date,
    timeZoneId: input.timeZoneId,
    latitude: input.latitude,
    longitude: input.longitude,
    algorithm: metadata?.algorithm ?? "US National Oceanic and Atmospheric Administration Algorithm",
    attribution: `Times calculated for ${input.locationName} (${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}) on ${input.date}, ${input.timeZoneId}, via kosher-zmanim / KosherJava.`,
    entries,
  };
}

/** Subset for destination pages — fewer rows, same calculation. */
export function compactZmanim(result: ZmanimResult): ZmanEntry[] {
  return result.entries.filter((entry) => COMPACT_IDS.has(entry.id) && entry.time);
}

/** Today's date in a timezone as YYYY-MM-DD. */
export function todayInTimeZone(timeZoneId: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZoneId,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Fall through to UTC.
  }
  return now.toISOString().slice(0, 10);
}
