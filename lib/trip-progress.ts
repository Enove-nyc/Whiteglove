import { formatDateLong } from "@/data/itinerary";

/**
 * How far off the trip is, and — once it starts — where in it you are.
 *
 * The planner has always been a planning tool. It laid the days out beautifully
 * and then said the same thing on the morning of the flight as it did four
 * months earlier, and the same thing again on the third morning in Kraków when
 * the only question is "where am I meant to be now". A trip has three ages and
 * the page only ever spoke to one of them.
 *
 * So: a countdown while it is ahead of you, and while it is happening, the day
 * you are on and the stop you should be at.
 *
 * TODAY IS THE TRAVELER'S TODAY, not the server's. Somebody standing in Poland
 * at one in the morning is on a different date from a server in UTC, and being
 * told it is still yesterday while you are getting into the car is exactly the
 * moment this has to be right. So the date and the clock both come from the
 * device, and everything in this file takes them as arguments rather than
 * asking.
 */

export type TripPhase = "no-dates" | "before" | "during" | "after";

export type TripProgress = {
  phase: TripPhase;
  /** How many days the trip covers. Zero until both dates are set. */
  totalDays: number;
  /** Whole days from today to the first day. Null unless the trip is ahead. */
  daysUntil: number | null;
  /** Which day of the trip today is, counting from 1. Null unless it is on. */
  dayNumber: number | null;
  /** Days still to come, today included. Null unless it is on. */
  daysLeft: number | null;
  /** The big line. */
  headline: string;
  /** The quiet line underneath. */
  detail: string | null;
  /** The date to follow along on — today, while the trip is happening. */
  followDate: string | null;
};

/** A date as days since the epoch, or null when it is not a date. */
function dayNumberOf(date: string | undefined): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(t) ? null : Math.round(t / 86_400_000);
}

/** Whole days from one date to another. Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number | null {
  const a = dayNumberOf(from);
  const b = dayNumberOf(to);
  return a === null || b === null ? null : b - a;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Where this trip stands today.
 *
 * A trip with no dates is not "0 days to go" — it is a trip nobody has said
 * when yet, and saying zero would read as "today".
 */
export function tripProgress(input: { startDate?: string; endDate?: string; today: string }): TripProgress {
  const start = dayNumberOf(input.startDate);
  const end = dayNumberOf(input.endDate);
  const now = dayNumberOf(input.today);

  const none: TripProgress = {
    phase: "no-dates",
    totalDays: 0,
    daysUntil: null,
    dayNumber: null,
    daysLeft: null,
    headline: "No dates yet",
    detail: "Choose when you are going and the countdown starts.",
    followDate: null,
  };
  if (start === null || end === null || end < start) return none;
  const totalDays = end - start + 1;
  // Without the traveler's own date there is nothing to count from, so the
  // trip is described rather than counted — never counted wrongly.
  if (now === null) {
    return {
      ...none,
      phase: "no-dates",
      totalDays,
      headline: `${plural(totalDays, "day")}`,
      detail: input.startDate ? `Starts ${formatDateLong(input.startDate)}.` : null,
    };
  }

  if (now < start) {
    const daysUntil = start - now;
    return {
      phase: "before",
      totalDays,
      daysUntil,
      dayNumber: null,
      daysLeft: null,
      headline: daysUntil === 1 ? "Tomorrow" : `${plural(daysUntil, "day")} to go`,
      detail: `Leaves ${formatDateLong(input.startDate!)} · ${plural(totalDays, "day")} in all.`,
      followDate: null,
    };
  }

  if (now > end) {
    return {
      phase: "after",
      totalDays,
      daysUntil: null,
      dayNumber: null,
      daysLeft: null,
      headline: "This trip has finished",
      detail: `${formatDateLong(input.startDate!)} to ${formatDateLong(input.endDate!)}.`,
      followDate: null,
    };
  }

  const dayNumber = now - start + 1;
  const daysLeft = end - now + 1;
  return {
    phase: "during",
    totalDays,
    daysUntil: null,
    dayNumber,
    daysLeft,
    headline: `Day ${dayNumber} of ${totalDays}`,
    detail:
      daysLeft === 1
        ? `${formatDateLong(input.today)} · last day.`
        : `${formatDateLong(input.today)} · ${plural(daysLeft - 1, "day")} still to come.`,
    followDate: input.today,
  };
}

// ---- Following along on the day -------------------------------------

/** Minutes past midnight for "HH:MM", or null when it is not a time. */
export function minutesOfClock(time: string | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((time ?? "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

/** Only what following along needs — so this file never depends on the planner. */
export type FollowStop = {
  id: string;
  name: string;
  address?: string;
  coordinates?: string;
  arrivalTime?: string;
  departureTime?: string;
};

export type FollowAlong = {
  /** Where they should be at this minute, if the plan puts them anywhere. */
  now: FollowStop | null;
  /** What comes after that. */
  next: FollowStop | null;
  /** Stops already behind them. */
  done: FollowStop[];
  /** Stops with no time on them — listed, never guessed at. */
  untimed: FollowStop[];
  /** How many of the day's timed stops are finished. */
  doneCount: number;
  timedCount: number;
  /** The one sentence to put on screen. */
  says: string;
};

/**
 * Where you are on today's plan.
 *
 * A stop is "now" from the minute it starts until the minute it ends. Between
 * two stops nothing is "now" — that is the drive, and pretending the traveler
 * is already at the next kever would be worse than saying when it starts.
 *
 * A STOP WITH NO TIME IS NEVER PLACED ON THE CLOCK. The planner works arrival
 * times out from the driving, but a stop it could not work out has none, and
 * inventing one would put somebody at a kever the plan never said they would
 * be at. They are listed separately and plainly.
 */
export function followAlong(input: { stops: FollowStop[]; nowMinutes: number | null }): FollowAlong {
  const untimed = input.stops.filter((stop) => minutesOfClock(stop.arrivalTime) === null);
  const timed = input.stops
    .map((stop) => ({ stop, from: minutesOfClock(stop.arrivalTime) }))
    .filter((row): row is { stop: FollowStop; from: number } => row.from !== null)
    .sort((a, b) => a.from - b.from);

  const empty: FollowAlong = {
    now: null,
    next: null,
    done: [],
    untimed,
    doneCount: 0,
    timedCount: timed.length,
    says: "",
  };

  if (!timed.length) {
    return {
      ...empty,
      says: untimed.length
        ? `${plural(untimed.length, "stop")} planned today, with no times on them.`
        : "Nothing is planned for today.",
    };
  }
  if (input.nowMinutes === null) {
    return { ...empty, next: timed[0].stop, says: `First today: ${timed[0].stop.name}.` };
  }

  const nowMinutes = input.nowMinutes;
  const done: FollowStop[] = [];
  let current: FollowStop | null = null;
  let next: FollowStop | null = null;

  for (let i = 0; i < timed.length; i += 1) {
    const { stop, from } = timed[i];
    // A stop with no leaving time runs until the next one starts, and the last
    // one runs to the end of the day. Neither is invented — it is what the day
    // already says.
    const until = minutesOfClock(stop.departureTime) ?? timed[i + 1]?.from ?? 24 * 60;
    if (nowMinutes >= until) {
      done.push(stop);
    } else if (nowMinutes >= from) {
      current = stop;
    } else if (!next) {
      next = stop;
    }
  }

  const says = current
    ? `${current.name} now${current.departureTime ? `, until about ${current.departureTime}` : ""}.`
    : next
      ? `Next: ${next.name}${next.arrivalTime ? ` at about ${next.arrivalTime}` : ""}.`
      : "Everything planned for today is behind you.";

  return { now: current, next, done, untimed, doneCount: done.length, timedCount: timed.length, says };
}

/**
 * The countdown as one short phrase, for a list of trips.
 *
 * Short on purpose: it sits beside a trip name in a row, not on its own.
 */
export function countdownPhrase(progress: TripProgress): string | null {
  if (progress.phase === "before") return progress.daysUntil === 1 ? "tomorrow" : `in ${plural(progress.daysUntil!, "day")}`;
  if (progress.phase === "during") return `on now — day ${progress.dayNumber} of ${progress.totalDays}`;
  if (progress.phase === "after") return "finished";
  return null;
}
