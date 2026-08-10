/**
 * How the day is ACTUALLY going, against how it was planned.
 *
 * THE PROBLEM, IN THE OWNER'S WORDS: "the waiting time by borders is by default
 * two hours… if someone passes the border earlier, their whole day will be off
 * the timing." Exactly right, and it is not only the border. A plan is written
 * weeks before the trip and then meets a real morning: the queue was twenty
 * minutes, the kever took an hour longer than anybody expected, the driver
 * stopped for lunch. From that moment every figure the planner shows is wrong,
 * and it is wrong SILENTLY — the day still reads as though it is on time.
 *
 * SO A TRAVELLER CAN SAY SO. At any stop: "done here" — which records that it
 * took less (or more) than planned — or "I need longer", which adds time. The
 * day then reports where they stand: an hour and a half in hand, or forty
 * minutes behind, and what that means for what is left.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO IS REWRITE THE PLAN. The stops keep their
 * planned lengths and the day keeps its shape. Somebody who beats the border by
 * ninety minutes has ninety minutes IN HAND — they have not acquired a
 * different itinerary, and quietly restretching every later stop to swallow the
 * saving would take away the one useful thing they just learned. The plan is
 * the plan; this says how far from it they are.
 *
 * IT IS ALSO NOT A JUDGEMENT. "Behind" is not a telling-off — a beis hachaim
 * that took two hours instead of one is very often the whole point of the trip.
 * The words say what the time means for the rest of the day and nothing about
 * whether it was well spent.
 */

/** One thing a traveller told us on the day. */
export type Adjustment = {
  /** The stop it belongs to. The border of a leg uses `border:<from>>:<to>`. */
  stopId: string;
  /**
   * Minutes different from the plan. NEGATIVE is time saved — the border took
   * twenty minutes instead of two hours — and positive is time spent over.
   *
   * Signed rather than two fields, because "ahead" and "behind" are one
   * quantity and holding them apart is how they end up double-counted.
   */
  deltaMins: number;
  /** ISO, so the newest answer for a stop wins. */
  at: string;
  /** What they were asked. "done" recorded a finish; "longer" asked for more. */
  kind: "done" | "longer";
};

/** How far from the plan somebody is, and what to say about it. */
export type DayStanding = {
  /** Negative is ahead of the plan, positive is behind. Minutes. */
  deltaMins: number;
  /** "ahead" | "behind" | "on-plan". */
  state: "ahead" | "behind" | "on-plan";
  /** One sentence. Never empty. */
  says: string;
  /** How many stops they have answered for. */
  answered: number;
};

/**
 * Under this, nobody is ahead or behind — they are on the plan.
 *
 * Ten minutes on a day of driving is noise, and a site that announces "you are
 * four minutes ahead" trains people to ignore it for the day it matters.
 */
export const NOISE_MINS = 10;

/** The newest answer per stop. Asking twice replaces, it does not add. */
export function currentAdjustments(all: Adjustment[]): Adjustment[] {
  const newest = new Map<string, Adjustment>();
  for (const adjustment of all) {
    if (!Number.isFinite(adjustment.deltaMins)) continue;
    const seen = newest.get(adjustment.stopId);
    if (!seen || Date.parse(adjustment.at) >= Date.parse(seen.at)) newest.set(adjustment.stopId, adjustment);
  }
  return [...newest.values()];
}

/** Minutes different from the plan, over every stop answered for. */
export function totalDelta(all: Adjustment[]): number {
  return currentAdjustments(all).reduce((sum, a) => sum + a.deltaMins, 0);
}

/** "1 h 20 min", "45 min". Always positive — the direction is said in words. */
export function formatSpan(minutes: number): string {
  const whole = Math.abs(Math.round(minutes));
  if (whole < 60) return `${whole} min`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/**
 * Where the day stands, in one sentence.
 *
 * `hoursLeftInDay` is what the planner already knows about the rest of the day,
 * so being ahead can be turned into something useful — "enough for another
 * stop" — rather than a number on its own.
 */
export function dayStanding(all: Adjustment[], options: { stopsLeft?: number; typicalStopMins?: number } = {}): DayStanding {
  const current = currentAdjustments(all);
  const deltaMins = current.reduce((sum, a) => sum + a.deltaMins, 0);
  const answered = current.length;

  if (answered === 0) {
    return {
      deltaMins: 0,
      state: "on-plan",
      says: "Nothing recorded yet today. Tell the plan when you leave a stop and it will keep track of whether you are ahead or behind.",
      answered: 0,
    };
  }

  if (Math.abs(deltaMins) < NOISE_MINS) {
    return { deltaMins, state: "on-plan", says: "You are running to plan.", answered };
  }

  if (deltaMins < 0) {
    const span = formatSpan(deltaMins);
    const stopMins = options.typicalStopMins ?? 0;
    // Only offered when it is genuinely true: enough saved for a whole stop,
    // and a stop still to come that it could go to.
    const enoughForAnother = stopMins > 0 && -deltaMins >= stopMins && (options.stopsLeft ?? 0) > 0;
    return {
      deltaMins,
      state: "ahead",
      says: enoughForAnother
        ? `You are ${span} ahead of the plan — enough for another stop, if there is one you wanted.`
        : `You are ${span} ahead of the plan.`,
      answered,
    };
  }

  return {
    deltaMins,
    state: "behind",
    // Says what it means for the rest of the day rather than passing judgement.
    // Two hours at a kever instead of one is very often the point of the trip.
    says: `You are ${formatSpan(deltaMins)} behind the plan. Whatever is left today will finish about that much later.`,
    answered,
  };
}

/**
 * The adjustment for "I finished here at this time".
 *
 * `plannedMins` is what the plan allowed; `actualMins` is what it took. Returns
 * null when there is nothing worth recording, so a stray tap does not fill the
 * day with zeroes.
 */
export function fromFinishing(input: {
  stopId: string;
  plannedMins: number;
  actualMins: number;
  now: string;
}): Adjustment | null {
  if (!Number.isFinite(input.actualMins) || input.actualMins < 0) return null;
  const deltaMins = Math.round(input.actualMins - input.plannedMins);
  if (deltaMins === 0) return null;
  return { stopId: input.stopId, deltaMins, at: input.now, kind: "done" };
}

/** The adjustment for "I need another twenty minutes here". */
export function fromNeedingLonger(input: { stopId: string; extraMins: number; now: string }): Adjustment | null {
  const extra = Math.round(input.extraMins);
  if (!Number.isFinite(extra) || extra <= 0) return null;
  return { stopId: input.stopId, deltaMins: extra, at: input.now, kind: "longer" };
}

/** The choices offered beside a stop. Minutes. */
export const LONGER_BY = [15, 30, 60] as const;

/**
 * What a single stop's answer reads as, beside that stop.
 *
 * Empty string when there is no answer, so a stop nobody has touched says
 * nothing rather than "0 min".
 */
export function describeStop(adjustment: Adjustment | undefined): string {
  if (!adjustment || adjustment.deltaMins === 0) return "";
  if (adjustment.deltaMins < 0) return `${formatSpan(adjustment.deltaMins)} quicker than planned`;
  return adjustment.kind === "longer"
    ? `${formatSpan(adjustment.deltaMins)} longer here`
    : `${formatSpan(adjustment.deltaMins)} over the plan`;
}

/** The stop id for the border on the way into a stop. */
export function borderStopId(fromCountry: string, toCountry: string): string {
  return `border:${fromCountry}>${toCountry}`;
}

/**
 * What to say beside a border the plan only ALLOWED for.
 *
 * The most valuable place to ask, and the one the owner named: two hours is a
 * guess, it is the largest single guess in the day, and the traveller is the
 * only person who will ever know what it really was.
 */
export function borderAsk(minutesAllowed: number, measured: boolean): string {
  if (measured) return "How long it actually took";
  return `The plan allows ${formatSpan(minutesAllowed)} here, which is a guess. How long did it really take?`;
}
