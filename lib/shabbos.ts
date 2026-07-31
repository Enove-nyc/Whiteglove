/**
 * Shabbos, and whether a plan runs into it.
 *
 * This is a kosher-travel planner, so a day that has somebody driving from
 * Kraków to Uman on a Friday afternoon is not a scheduling inefficiency — it
 * is the trip going wrong. The planner warned about over-packed days and
 * tight connections and said nothing at all about the one deadline that
 * cannot move.
 *
 * Sunset is computed, not fetched. An API would mean a network call per stop,
 * a key to keep, and a planner that says nothing about Shabbos whenever that
 * service is down — for an answer that astronomy gives to well within the
 * minute or two that candle-lighting margins already absorb.
 *
 * What this is NOT: a substitute for a local zman. It is a warning that a
 * plan is close to the line, and it says so. Anyone within an hour of the
 * line should be checking the town's own times, and the wording says that.
 */

const DEGREES = Math.PI / 180;

/** Minutes before sunset that candles are lit. The widespread custom. */
export const CANDLE_LIGHTING_MINUTES = 18;

function dayOfYear(date: Date): number {
  return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000);
}

/**
 * Sunset, as minutes after UTC midnight on that date, or null above the
 * arctic circle in the weeks where the sun does not set at all — where the
 * answer is genuinely "there is no sunset today" and inventing one would be
 * worse than saying nothing.
 *
 * The NOAA low-precision solar equations: accurate to about a minute at these
 * latitudes, which is far inside the margin candle-lighting already carries.
 */
export function sunsetMinutesUtc(date: Date, latitude: number, longitude: number): number | null {
  const n = dayOfYear(date);
  // Fractional year, in radians.
  const gamma = ((2 * Math.PI) / 365) * (n - 1 + 0.5);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // 90.833° accounts for refraction and the sun's own width — the standard
  // zenith for sunrise/sunset.
  const latRad = latitude * DEGREES;
  const cosH =
    Math.cos(90.833 * DEGREES) / (Math.cos(latRad) * Math.cos(decl)) - Math.tan(latRad) * Math.tan(decl);
  if (cosH < -1 || cosH > 1) return null; // midnight sun, or polar night
  const ha = Math.acos(cosH) / DEGREES;

  return 720 + 4 * (ha - longitude) - eqTime;
}

function parseCoordinates(coordinates?: string | null): { lat: number; lon: number } | null {
  const match = coordinates?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** YYYY-MM-DD → a UTC date, or null. Noon, so no timezone can roll the day. */
function parseDate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!match) return null;
  const parsed = new Date(`${date.trim()}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** 5 = Friday, 6 = Shabbos. Computed in UTC, which is what parseDate returns. */
export function isFriday(date: string): boolean {
  return parseDate(date)?.getUTCDay() === 5;
}

export function isShabbos(date: string): boolean {
  return parseDate(date)?.getUTCDay() === 6;
}

export type ShabbosWarning = {
  kind: "on-shabbos" | "after-candles" | "close-to-candles";
  message: string;
  /** Local clock time candles are lit, "17:42", when it could be worked out. */
  candleLighting?: string;
};

/**
 * Whether something planned for `date` at `time` runs into Shabbos.
 *
 * `time` is the local clock time at the stop ("16:30"), which is what somebody
 * typed into the planner. Local clock time is what candle-lighting is quoted
 * in too, so the comparison is like for like without needing the town's
 * timezone: sunset is computed in UTC and shifted by the longitude's own
 * solar offset, which is what a local clock approximates anyway.
 *
 * Returns null when nothing is wrong, or when there is not enough to say —
 * no coordinates, an unreadable date. Silence is correct there; a warning
 * built on a guess would be worse than none.
 */
export function shabbosWarning(
  date: string,
  time: string | undefined,
  coordinates: string | undefined,
  what: string,
): ShabbosWarning | null {
  const day = parseDate(date);
  if (!day) return null;

  if (isShabbos(date)) {
    return { kind: "on-shabbos", message: `${what} is planned for Shabbos.` };
  }
  if (!isFriday(date)) return null;

  const point = parseCoordinates(coordinates);
  if (!point) {
    // Friday, but nowhere to work out when Shabbos starts. Still worth saying
    // — the day itself is the warning.
    return { kind: "close-to-candles", message: `${what} is on Friday. Check the local candle-lighting time before fixing this.` };
  }

  const sunsetUtc = sunsetMinutesUtc(day, point.lat, point.lon);
  if (sunsetUtc === null) return { kind: "close-to-candles", message: `${what} is on Friday, and this far north the sun may not set at all — use the local community's times.` };

  // Local solar time: the clock in a town runs roughly at its longitude's
  // offset, which is what makes a printed candle-lighting time comparable to
  // what somebody types into the planner.
  const localSunset = sunsetUtc + longitudeOffsetMinutes(point.lon);
  const candles = localSunset - CANDLE_LIGHTING_MINUTES;
  const candleClock = clock(candles);

  const planned = timeToMinutes(time);
  if (planned === null) {
    return { kind: "close-to-candles", message: `${what} is on Friday — candles are lit around ${candleClock}.`, candleLighting: candleClock };
  }
  if (planned >= candles) {
    return { kind: "after-candles", message: `${what} is planned for ${time} on Friday, after candle-lighting at about ${candleClock}.`, candleLighting: candleClock };
  }
  if (candles - planned <= 90) {
    return {
      kind: "close-to-candles",
      message: `${what} is planned for ${time} on Friday, leaving under ${Math.round((candles - planned) / 15) * 15 || 15} minutes before candles at about ${candleClock}.`,
      candleLighting: candleClock,
    };
  }
  return null;
}

/** Roughly how far a town's clock sits from UTC, from its longitude alone. */
function longitudeOffsetMinutes(longitude: number): number {
  // Rounded to the hour: real timezones are political, but they follow the
  // sun closely enough that this lands within the margin candle-lighting
  // already carries, and it needs no timezone database.
  return Math.round(longitude / 15) * 60;
}

function timeToMinutes(time?: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((time ?? "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function clock(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}
