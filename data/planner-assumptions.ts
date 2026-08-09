/**
 * The numbers the route planner judges a day by.
 *
 * Every "this day is over-packed", every "about 4 free hours — room for another
 * stop", every arrival time on every day card comes out of the figures below.
 * They were written into two source files, they are opinions rather than facts,
 * and there was nowhere in the admin that even said what they were.
 *
 * They are opinions about SOMEBODY ELSE'S TRAVELLER. A fourteen-hour day
 * running 08:00 to 22:00 is a reasonable guess for a general holiday and a poor
 * one for a group that davens shacharis before it moves and wants to be off the
 * road before maariv. Ninety minutes is a reasonable guess for a stop and a
 * poor one for a beis hachaim on a yahrzeit. Eighty-eight km/h is a reasonable
 * guess for a motorway and the person who drives the road from Lizhensk knows
 * better than the guess does.
 *
 * THE DEFAULTS BELOW ARE EXACTLY WHAT THE CODE DID BEFORE. Turning this on
 * changes nothing; only changing a number changes anything. That is deliberate:
 * a settings screen that quietly moves every trip on the site the day it ships
 * would be a worse problem than the one it solves.
 *
 * A data file, like the airports and the border crossings, for the same reason:
 * lib/ may read data/ and data/ never reads lib/, so the planner arithmetic
 * cannot end up depending on a store.
 */

export type PlannerAssumptions = {
  /** When a planned day starts, HH:MM, unless the traveller sets their own. */
  dayStart: string;
  /** When it ends. The two together are the day the planner measures against. */
  dayEnd: string;
  /** A day finishing after this is worth saying something about. */
  lateFinish: string;

  /** How long a stop takes when nobody has said, in minutes. */
  stopMins: number;
  /** How long a beis hachaim takes when nobody has said. */
  keverMins: number;

  /**
   * What to allow at a border out of the Schengen area when NOBODY HAS CHECKED
   * that crossing lately.
   *
   * An allowance, not a measurement — and this is why it has to be editable. It
   * was hardcoded at two hours, reachable from nowhere, and two hours is a very
   * large piece of a day to be unable to change. Somebody who knows the crossing
   * they use is usually twenty minutes should be able to say so; somebody
   * travelling at Rosh Hashanah, when Korczowa can take five hours, should be
   * able to say that too. A crossing that HAS been checked recently uses the
   * figure written down for it at /admin/borders and ignores this.
   */
  borderAllowanceMins: number;

  /** Roads are not straight. Straight-line distance is multiplied by this. */
  detourFactor: number;
  /** Parking, getting going, finding the entrance. Added to every leg. */
  transferMins: number;

  /** km/h under 5 km — town crawl. */
  townKmh: number;
  /** km/h under 25 km — village and back road. */
  ruralKmh: number;
  /** km/h under 100 km — cross-country road. */
  regionalKmh: number;
  /** km/h beyond that — motorway. */
  motorwayKmh: number;

  /** Free hours in a day before the planner offers room for another stop. */
  freeHoursWorthMentioning: number;
  /** An empty gap this long between two timed stops is worth pointing out. */
  gapHoursWorthMentioning: number;
};

/**
 * What the planner has always used.
 *
 * The speeds are deliberately on the cautious side, and that caution is the
 * whole reason they are worth someone's attention: an estimate that runs
 * slightly long costs a traveller nothing, and one that runs short hands them
 * hours that do not exist and a kever they reach after it has shut.
 */
export const BUILT_IN_ASSUMPTIONS: PlannerAssumptions = {
  dayStart: "08:00",
  dayEnd: "22:00",
  lateFinish: "21:00",

  stopMins: 90,
  keverMins: 90,
  // Two hours: what the planner has always allowed, kept exactly so nothing
  // about an existing plan changes on the day this became editable.
  borderAllowanceMins: 120,

  detourFactor: 1.35,
  transferMins: 10,

  townKmh: 22,
  ruralKmh: 38,
  regionalKmh: 58,
  motorwayKmh: 88,

  freeHoursWorthMentioning: 4,
  gapHoursWorthMentioning: 3,
};

/**
 * Which speed a leg is driven at, chosen by how long the ROAD is.
 *
 * One list, used both by the arithmetic and by the admin screen's worked
 * example, so a row cannot end up labelled with a band it is not actually
 * driven at. Measured after the detour allowance, which is why changing that
 * allowance can move a leg from one band into the next.
 */
export const SPEED_BANDS = [
  { key: "townKmh", underRoadKm: 5, label: "town" },
  { key: "ruralKmh", underRoadKm: 25, label: "back road" },
  { key: "regionalKmh", underRoadKm: 100, label: "cross-country" },
  { key: "motorwayKmh", underRoadKm: Number.POSITIVE_INFINITY, label: "motorway" },
] as const satisfies ReadonlyArray<{ key: keyof PlannerAssumptions; underRoadKm: number; label: string }>;

export type SpeedBand = (typeof SPEED_BANDS)[number];

/** The band a straight-line distance falls in, once the roads are allowed for. */
export function bandFor(straightLineKm: number, a: PlannerAssumptions): SpeedBand {
  const roadKm = straightLineKm * a.detourFactor;
  return SPEED_BANDS.find((band) => roadKm < band.underRoadKm) ?? SPEED_BANDS[SPEED_BANDS.length - 1];
}

/** "08:00" → 480. Null for anything that is not a clock time. */
export function clockToMins(value: string | undefined | null): number | null {
  const match = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value ?? "");
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** How many hours long the planning day is, from the two clock times. */
export function usableDayHours(a: PlannerAssumptions): number {
  const start = clockToMins(a.dayStart) ?? 0;
  const end = clockToMins(a.dayEnd) ?? 0;
  return Math.max(0, Math.round(((end - start) / 60) * 10) / 10);
}
