/**
 * The zmanim a particular day of a particular trip actually needs.
 *
 * /zmanim answers "what are the times in Kraków on the 14th". Following an
 * itinerary asks something narrower and harder: the traveller does not pick a
 * city, the trip already knows it, and a day of a kever trip does not stay in
 * one place. Two things follow from that, and they are the whole of this file.
 *
 * WHICH TIMES ARE RELEVANT DEPENDS ON THE DAY. Candle-lighting on an ordinary
 * Tuesday is not a time anybody needs; on erev Pesach it is the only one. Alos
 * matters on a fast and not otherwise. So the day is read from the Jewish
 * calendar first, and the list is built from that rather than printed in full
 * every day, which would bury the one line that mattered.
 *
 * A DAY THAT DRIVES 300 KM HAS TWO SETS OF TIMES. Sof zman Shema in Warsaw is
 * not sof zman Shema in Kraków, and the difference is the sort that gets
 * noticed at ten past nine in the morning. Where the traveller wakes and where
 * they spend the night are both worked out, and if the answers differ the day
 * is shown as two — morning where they woke, afternoon and evening where they
 * are going. When they agree, which is most days, it collapses back to one.
 *
 * NOTHING HERE PASKENS, and nothing here guesses a clock. The timezone comes
 * from the coordinates themselves, through tz-lookup's copy of the timezone
 * boundaries, so a trip anywhere in the world gets a zone with daylight saving
 * in it. Where even that has no answer — a point in the open ocean — the day
 * says so rather than falling back to an offset worked out from the longitude,
 * which reads an hour wrong for half the year.
 */

import { JewishCalendar, HebrewDateFormatter } from "kosher-zmanim";
import { calculateZmanim, parseCoordinates, type ZmanEntry } from "@/lib/zmanim";
import { zmanimPlaces } from "@/lib/zmanim-places";
import { timeZoneAt } from "@/lib/place-lookup";
import type { DayPlaceInput, ZmanimDay, ZmanimDayInput } from "@/lib/zmanim-day";

type ResolvedPlace = {
  latitude: number;
  longitude: number;
  timeZoneId: string;
  placeName: string;
};

/**
 * How far a stop may be from a city we keep before its name stops describing
 * where the traveller actually is. The kever circuit runs to towns two hours
 * out of Kraków, which this covers.
 */
const NAME_FROM_CITY_WITHIN_KM = 250;

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const lat = radians(b.lat - a.lat);
  const lon = radians(b.lon - a.lon);
  const haversine =
    Math.sin(lat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

/**
 * Coordinates into a point with a real IANA zone and a name worth reading.
 *
 * The zone is the coordinates' own answer. The NAME is the softer question,
 * and the order there is: a city we already keep, then the country the stop
 * carries, then the zone.
 */
export function resolveDayPlace(input: DayPlaceInput | undefined): ResolvedPlace | null {
  const point = parseCoordinates(input?.coordinates);
  if (!point) return null;

  // THE ZONE COMES FROM THE COORDINATES, not from the country. tz-lookup
  // carries the timezone boundaries and answers offline, so it is right where a
  // country name cannot be — Los Angeles and New York are one country, and this
  // used to hand both of them New York.
  const timeZoneId = timeZoneAt(point.lat, point.lon);
  if (!timeZoneId) return null;

  // The name is a separate question, and a nearby city we already keep is a
  // better answer than a country. Beyond a couple of hours' drive it is not
  // the same place any more, and the country is the honest label.
  const places = zmanimPlaces();
  let nearest: { place: (typeof places)[number]; km: number } | null = null;
  for (const place of places) {
    const km = distanceKm(point, { lat: place.latitude, lon: place.longitude });
    if (!nearest || km < nearest.km) nearest = { place, km };
  }
  const country = input?.country?.trim() ?? "";
  const nearby =
    nearest && nearest.km <= NAME_FROM_CITY_WITHIN_KM && nearest.place.timeZoneId === timeZoneId
      ? nearest.place
      : null;

  return {
    latitude: point.lat,
    longitude: point.lon,
    timeZoneId,
    // Last resort is the zone itself — "Europe/Warsaw" is at least true, and a
    // day labelled with nothing at all reads as a bug.
    placeName: nearby?.city || country || timeZoneId,
  };
}

/**
 * What kind of day it is. inIsrael decides the second day of yom tov, so a
 * trip to Yerushalayim is not told about a yom tov sheni it does not keep.
 */
export function jewishDay(date: string, inIsrael: boolean) {
  const calendar = new JewishCalendar(new Date(`${date}T12:00:00Z`));
  calendar.setInIsrael(inIsrael);
  const formatter = new HebrewDateFormatter();
  const yomTov = formatter.formatYomTov(calendar);
  const shabbos = calendar.getDayOfWeek() === 7;
  const erevShabbos = calendar.getDayOfWeek() === 6;

  // Yom tov names itself; otherwise Shabbos is the only occasion worth a word.
  const occasion = yomTov || (shabbos ? "Shabbos" : erevShabbos ? "Erev Shabbos" : "");

  return {
    occasion,
    restDay: calendar.isAssurBemelacha(),
    candleLighting: calendar.hasCandleLighting(),
    taanis: calendar.isTaanis(),
  };
}

/** Always worth having on a travelling day. */
const EVERY_DAY = [
  "sunrise",
  "sof-zman-shema-mga",
  "sof-zman-shema-gra",
  "sof-zman-tefillah-gra",
  "chatzos",
  "mincha-gedola",
  "plag",
  "sunset",
  "tzeit",
];

/** Before chatzos, so it belongs to where the traveller woke up. */
const MORNING_IDS = new Set([
  "alos",
  "misheyakir",
  "sunrise",
  "sof-zman-shema-mga",
  "sof-zman-shema-gra",
  "sof-zman-tefillah-gra",
  "sof-zman-tefillah-mga",
  "chatzos",
]);

function minutesOf(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":");
  const mins = Number(h) * 60 + Number(m);
  return Number.isFinite(mins) ? mins : null;
}

/**
 * The day's list, in the order the day happens.
 *
 * Candle-lighting is eighteen minutes BEFORE sunset, and the master list has
 * it after, so the rows are put in clock order rather than list order.
 */
function relevantEntries(entries: ZmanEntry[], day: ReturnType<typeof jewishDay>): ZmanEntry[] {
  const wanted = new Set(EVERY_DAY);
  if (day.candleLighting) wanted.add("candle-lighting");
  // A fast begins at alos and ends at tzeis; tzeis is already in every day.
  if (day.taanis) wanted.add("alos");

  return entries
    .filter((entry) => wanted.has(entry.id) && entry.time)
    .sort((a, b) => (minutesOf(a.time) ?? 0) - (minutesOf(b.time) ?? 0));
}

/**
 * Close enough that splitting the day would be noise.
 *
 * A minute is the tolerance rather than nothing at all: two hotels at opposite
 * ends of the same city can put a single zman either side of a rounding, and
 * two tables of otherwise identical times is a worse answer than one.
 */
function sameTimes(a: ZmanEntry[], b: ZmanEntry[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((entry, i) => {
    const other = b[i];
    if (other?.id !== entry.id) return false;
    const left = minutesOf(entry.time);
    const right = minutesOf(other.time);
    if (left === null || right === null) return left === right;
    return Math.abs(left - right) <= 1;
  });
}

function blockFor(place: ResolvedPlace, date: string, day: ReturnType<typeof jewishDay>): ZmanEntry[] {
  const result = calculateZmanim({
    locationName: place.placeName,
    latitude: place.latitude,
    longitude: place.longitude,
    timeZoneId: place.timeZoneId,
    date,
  });
  return relevantEntries(result.entries, day);
}

/**
 * One day of the trip, worked out.
 *
 * Never throws for a day it cannot do: a trip half-planned is the normal state
 * of a trip, and a day with no place on it yet should say so quietly rather
 * than take the whole strip down with it.
 */
export function zmanimForDay(input: ZmanimDayInput): ZmanimDay {
  const morningPlace = resolveDayPlace(input.morning);
  const eveningPlace = resolveDayPlace(input.evening) ?? morningPlace;
  const anchor = morningPlace ?? eveningPlace;

  const inIsrael = /jerusalem|israel/i.test(anchor?.timeZoneId ?? "");
  const day = jewishDay(input.date, inIsrael);
  const base = { date: input.date, occasion: day.occasion, restDay: day.restDay };

  if (!anchor) {
    // Two different silences, and they ask different things of the reader. An
    // empty day wants a stop added; a day whose places we cannot put a clock to
    // wants nothing, because there is nothing the traveller can do about it —
    // so it says what happened rather than sending them to fix a day that is
    // already filled in.
    const hasSomewhere = Boolean(
      parseCoordinates(input.morning?.coordinates) || parseCoordinates(input.evening?.coordinates),
    );
    return {
      ...base,
      blocks: [],
      unavailable: hasSomewhere
        ? "We could not place this day in a timezone we trust, so no times are shown."
        : "This day has no place on it yet.",
    };
  }

  try {
    const start = morningPlace ?? anchor;
    const end = eveningPlace ?? anchor;
    const startEntries = blockFor(start, input.date, day);

    if (start.timeZoneId === end.timeZoneId && start.latitude === end.latitude && start.longitude === end.longitude) {
      return { ...base, blocks: [{ span: "day", placeName: start.placeName, timeZoneId: start.timeZoneId, entries: startEntries }] };
    }

    const endEntries = blockFor(end, input.date, day);
    if (sameTimes(startEntries, endEntries)) {
      // Far enough apart to be different places, close enough to be the same
      // clock. One table, named for where the night is.
      return { ...base, blocks: [{ span: "day", placeName: end.placeName, timeZoneId: end.timeZoneId, entries: endEntries }] };
    }

    return {
      ...base,
      blocks: [
        {
          span: "morning",
          placeName: start.placeName,
          timeZoneId: start.timeZoneId,
          entries: startEntries.filter((entry) => MORNING_IDS.has(entry.id)),
        },
        {
          span: "evening",
          placeName: end.placeName,
          timeZoneId: end.timeZoneId,
          entries: endEntries.filter((entry) => !MORNING_IDS.has(entry.id)),
        },
      ],
    };
  } catch {
    return { ...base, blocks: [], unavailable: "These times could not be worked out." };
  }
}
