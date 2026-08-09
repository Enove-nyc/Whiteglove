import { type Crossing, checkAge, crossingsBetween } from "@/lib/border-crossings";

/**
 * How long the border actually costs, folded into the driving time.
 *
 * The planner has always worked driving time out from the road and then said,
 * separately and further down the page, that the border can take hours. So the
 * arithmetic and the warning disagreed: a Lizhensk-to-Uman day read as five
 * hours of driving with a note underneath, and somebody planning around the
 * five hours arrived at Korczowa with a kever to reach before dark.
 *
 * WHAT IS COUNTED, AND WHAT IT IS CALLED. Three different things, never
 * confused with one another:
 *
 *   • Somebody checked this crossing recently and wrote down how long — that
 *     is a MEASUREMENT, and it is used and attributed.
 *   • Nobody has checked it — that is an ALLOWANCE. A standing figure for a
 *     border of that kind, said as an allowance, so nobody reads it as a fact
 *     about today.
 *   • Inside the Schengen area — nothing is added. It is a drive-through, and
 *     padding every internal border by ten minutes would make the whole day
 *     wrong in the other direction.
 *
 * THE ALLOWANCE IS DELIBERATELY CAUTIOUS. An allowance that runs long costs a
 * traveller an early start; one that runs short hands them free hours that do
 * not exist and a beis hachaim they arrive at after it has shut. The same
 * reasoning the driving estimate already uses.
 */

/**
 * What a crossing out of the EU costs when nobody has checked it.
 *
 * THE FALLBACK, NOT THE SETTING. This was the only figure there was, hardcoded
 * here and reachable from nowhere — two hours is a very large piece of a day to
 * be unable to change, and somebody who knows their crossing is usually twenty
 * minutes had no way to say so. It now lives in the planner's assumptions
 * (`borderAllowanceMins`, /admin/planner) and this is what that falls back to,
 * so a caller that has not been given one behaves exactly as before.
 */
export const UNCHECKED_EXTERNAL_MINUTES = 120;

export type BorderCost = {
  /** Minutes to add to the leg. Zero for an internal border. */
  minutes: number;
  /** True only when somebody checked this crossing and wrote a figure down. */
  measured: boolean;
  /** The crossing the figure belongs to, when there is one. */
  crossingName?: string;
  /** How it reads beside the driving time. Empty when nothing is added. */
  says: string;
};

export const NO_BORDER: BorderCost = { minutes: 0, measured: false, says: "" };

/**
 * What to add for crossing from one country into another.
 *
 * `major` is the caller's answer to "does this leave or enter the Schengen
 * area" — lib/borders.ts already works that out and this does not repeat it.
 */
export function borderCost(input: {
  from: string;
  to: string;
  major: boolean;
  crossings: Crossing[];
  today: string;
  /** From the planner's assumptions. The built-in two hours when absent. */
  allowanceMinutes?: number;
}): BorderCost {
  // Inside Schengen. Passports still matter and the planner still says so;
  // the clock does not.
  if (!input.major) return NO_BORDER;

  const here = crossingsBetween(input.from, input.to, input.crossings, input.today);
  // The best-known crossing with a figure on it, in the order the crossings
  // are already ranked: found open first, then queueing.
  const checked = here.find(
    (crossing) =>
      typeof crossing.waitMinutes === "number" &&
      crossing.waitMinutes >= 0 &&
      crossing.state &&
      crossing.state !== "closed" &&
      checkAge(crossing.checkedAt, input.today).fresh,
  );

  if (checked) {
    const age = checkAge(checked.checkedAt, input.today);
    return {
      minutes: Math.round(checked.waitMinutes!),
      measured: true,
      crossingName: checked.name,
      says: `${formatWait(checked.waitMinutes!)} at ${checked.name} — ${age.says.toLowerCase().replace(/\.$/, "")}`,
    };
  }

  const allowance =
    typeof input.allowanceMinutes === "number" && Number.isFinite(input.allowanceMinutes) && input.allowanceMinutes >= 0
      ? Math.round(input.allowanceMinutes)
      : UNCHECKED_EXTERNAL_MINUTES;

  // Zero is a real answer — a crossing the owner knows is driven straight
  // through. It must add nothing AND say nothing, rather than "0 min allowed",
  // which would read as a measurement of no wait at all.
  if (allowance === 0) return NO_BORDER;

  return {
    minutes: allowance,
    measured: false,
    says: `${formatWait(allowance)} allowed for the border — nobody has checked it lately`,
  };
}

/** "2 h", "45 min", "2 h 30 min". */
export function formatWait(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  if (whole < 60) return `${whole} min`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/**
 * The day's driving, with the border said separately.
 *
 * Kept apart from the driving on purpose. "Seven hours" tells somebody to
 * leave early; "five hours driving and two at the border" tells them to leave
 * early AND that two of those hours are a queue they might beat by going at
 * six in the morning. The second is actionable and the first is not.
 */
export function describeDayTravel(input: {
  drivingMinutes: number;
  borderMinutes: number;
  allMeasured: boolean;
}): string {
  const driving = `${input.allMeasured ? "" : "≈"}${formatWait(input.drivingMinutes)} driving`;
  if (!input.borderMinutes) return driving;
  return `${driving} + ${formatWait(input.borderMinutes)} at the border`;
}

/** Whether a border allowance is worth mentioning at all on a day. */
export function borderIsWorthSaying(minutes: number): boolean {
  return minutes >= 15;
}
