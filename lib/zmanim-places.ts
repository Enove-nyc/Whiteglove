/**
 * Places a traveller can pick for zmanim — Jewish quarters with published
 * coordinates, plus a country→timezone map so the clock is IANA-backed.
 */

import { kosherAreas } from "@/data/kosher-stays";
import { approximateTimeZoneId, parseCoordinates } from "@/lib/zmanim";

export type ZmanimPlace = {
  id: string;
  label: string;
  city: string;
  country: string;
  coordinates: string;
  latitude: number;
  longitude: number;
  timeZoneId: string;
  /** True when the zone came from longitude alone. */
  timeZoneApproximate: boolean;
};

/** City overrides where the country default is wrong (Israel, UK islands, etc.). */
const CITY_TIMEZONES: Record<string, string> = {
  jerusalem: "Asia/Jerusalem",
  "tel aviv": "Asia/Jerusalem",
  "tel aviv-yafo": "Asia/Jerusalem",
  tiberias: "Asia/Jerusalem",
  tzfat: "Asia/Jerusalem",
  safed: "Asia/Jerusalem",
  netanya: "Asia/Jerusalem",
  eilat: "Asia/Jerusalem",
  london: "Europe/London",
  manchester: "Europe/London",
};

const COUNTRY_TIMEZONES: Record<string, string> = {
  italy: "Europe/Rome",
  france: "Europe/Paris",
  switzerland: "Europe/Zurich",
  austria: "Europe/Vienna",
  germany: "Europe/Berlin",
  "united kingdom": "Europe/London",
  uk: "Europe/London",
  spain: "Europe/Madrid",
  greece: "Europe/Athens",
  israel: "Asia/Jerusalem",
  poland: "Europe/Warsaw",
  hungary: "Europe/Budapest",
  slovakia: "Europe/Bratislava",
  "czech republic": "Europe/Prague",
  czechia: "Europe/Prague",
  netherlands: "Europe/Amsterdam",
  belgium: "Europe/Brussels",
  ukraine: "Europe/Kyiv",
  romania: "Europe/Bucharest",
  "united states": "America/New_York",
  usa: "America/New_York",
  canada: "America/Toronto",
};

export function timeZoneForPlace(city: string, country: string, longitude: number): {
  timeZoneId: string;
  approximate: boolean;
} {
  const cityKey = city.toLocaleLowerCase("en").replace(/\s*\(.*?\)\s*/g, " ").trim();
  if (CITY_TIMEZONES[cityKey]) return { timeZoneId: CITY_TIMEZONES[cityKey], approximate: false };
  const countryKey = country.toLocaleLowerCase("en").trim();
  if (COUNTRY_TIMEZONES[countryKey]) return { timeZoneId: COUNTRY_TIMEZONES[countryKey], approximate: false };
  return { timeZoneId: approximateTimeZoneId(longitude), approximate: true };
}

/** Places offered on /zmanim — one row per Jewish quarter with coordinates. */
export function zmanimPlaces(): ZmanimPlace[] {
  const out: ZmanimPlace[] = [];
  for (const area of kosherAreas) {
    const point = parseCoordinates(area.coordinates);
    if (!point) continue;
    const zone = timeZoneForPlace(area.city, area.country, point.lon);
    out.push({
      id: area.slug,
      label: `${area.city} — ${area.name}`,
      city: area.city,
      country: area.country,
      coordinates: area.coordinates,
      latitude: point.lat,
      longitude: point.lon,
      timeZoneId: zone.timeZoneId,
      timeZoneApproximate: zone.approximate,
    });
  }
  return out.sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city) || a.label.localeCompare(b.label));
}

export function zmanimPlaceById(id: string): ZmanimPlace | undefined {
  return zmanimPlaces().find((place) => place.id === id);
}
