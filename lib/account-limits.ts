/**
 * What a plan actually lets somebody do.
 *
 * THIS FILE IS THE CHANGE lib/account-plans.ts said would have to be made on
 * purpose. Its words were: "a plan never decides what anybody can do. Nothing
 * reads it to allow or refuse anything. If that changes, it changes on purpose,
 * in one place, with the words on the page changed to match — not by a gate
 * quietly appearing somewhere and a traveller finding out that something they
 * had yesterday now costs money." This is that one place, and the words on the
 * account page changed with it.
 *
 * TWO LIMITS, both asked for: a Traveler may plan two trips, and may print one
 * a week. Everything else is untouched — every kever, every guide, the whole
 * planner, sharing, the map. The limits are on how much of it one free account
 * can carry, not on what the site is.
 *
 * NOTHING ALREADY MADE IS EVER TAKEN AWAY. The trip limit refuses a NEW trip;
 * it does not hide, lock or delete one that exists. Somebody who already has
 * five keeps five and can still open, edit, print and share all of them — they
 * simply cannot start a sixth. A limit that reaches backwards and closes trips
 * somebody already planned would be a different thing entirely, and not one
 * anybody asked for.
 */

import { type AccountPlan, PLAN_LABELS } from "@/lib/account-plans";

/** No limit at all. `null` rather than a big number, so it cannot be compared by accident. */
export const UNLIMITED = null;
export type Limit = number | typeof UNLIMITED;

export type PlanLimits = {
  /** How many trips this plan may have at once. */
  trips: Limit;
  /** How many printable copies in any seven days. */
  printsPerWeek: Limit;
};

/* ---- what a plan can DO, as opposed to how much of it ------------------- */

/**
 * The one thing a plan unlocks rather than merely raises the ceiling on.
 *
 * IT IS IN THIS FILE FOR THE REASON THE HEADER GIVES. "A third limit belongs in
 * that same file or nowhere" — and an entitlement is the same kind of thing as
 * a limit even though it is a yes/no rather than a number: it is a plan
 * deciding what somebody may do. Putting it in a second module would be the
 * exact drift this file exists to prevent, where nobody can answer "what does
 * Pro actually get you" without grepping.
 *
 * THERE IS ONLY ONE, AND THAT IS THE POINT. Pro is not a feature list — it is
 * the same site without the two limits above, because that is what was asked
 * for: somebody planning more than one trip at a time. Business is the one that
 * genuinely does something different, because it is used by a person planning
 * on somebody else's behalf, and the itinerary they hand their client should
 * carry their name rather than ours.
 *
 * NOTHING ELSE IS INVENTED HERE. When a second entitlement is real, it goes in
 * this table and the account page changes in the same commit.
 */
export type PlanFeatures = {
  /**
   * Put their own logo and business name on the printed itinerary, in place of
   * the White Glove crest. The small credit line in the footer stays either
   * way — see components/PrintableItinerary.tsx, which is where that decision
   * is written down and enforced.
   */
  ownBranding: boolean;
  /**
   * Whether the assistant's conversation is kept between visits.
   *
   * The answers are the same on every plan — a traveler asking about Antwerp
   * gets exactly what a Pro asks gets. What Pro buys is that the thread is
   * still there tomorrow instead of starting again. That is a fair thing to
   * charge for and a poor thing to withhold an answer over, so the gate is on
   * the keeping and never on the asking.
   */
  assistantHistory: boolean;
};

export const PLAN_FEATURES: Record<AccountPlan, PlanFeatures> = {
  traveler: { ownBranding: false, assistantHistory: false },
  pro: { ownBranding: false, assistantHistory: true },
  business: { ownBranding: true, assistantHistory: true },
};

export function featuresFor(plan: AccountPlan): PlanFeatures {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.traveler;
}

/** Whether the assistant remembers this plan's conversation. Named once. */
export function keepsAssistantHistory(plan: AccountPlan): boolean {
  return featuresFor(plan).assistantHistory;
}

/** Whether this plan may brand its own itineraries. The one gate, named once. */
export function mayBrandOwnItinerary(plan: AccountPlan): boolean {
  return featuresFor(plan).ownBranding;
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Reopening the same trip's printable copy inside this window does not count
 * again.
 *
 * Because a printer jams, a tab gets closed, a phone locks. Charging somebody a
 * week's allowance for a page they never got out of the printer is the kind of
 * rule that makes a site feel hostile, and it would be indistinguishable from a
 * bug.
 */
export const SAME_PRINT_GRACE_MS = 30 * 60 * 1000;

/** What each plan gets, before the owner changes anything. */
export const BUILT_IN_LIMITS: Record<AccountPlan, PlanLimits> = {
  traveler: { trips: 2, printsPerWeek: 1 },
  // Nothing has been decided about these, so nothing is limited. An invented
  // number here would be a promise nobody made.
  pro: { trips: UNLIMITED, printsPerWeek: UNLIMITED },
  business: { trips: UNLIMITED, printsPerWeek: UNLIMITED },
};

export type LimitOverrides = Partial<Record<AccountPlan, Partial<PlanLimits>>>;

/** A stored number, or the built-in one. Nonsense falls back rather than throwing. */
function cleanLimit(value: unknown, fallback: Limit): Limit {
  if (value === null) return UNLIMITED;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const whole = Math.floor(value);
  // Zero would mean "cannot make a single trip", which is not a limit, it is a
  // locked account. Anybody who wants that should close the account.
  return whole < 1 ? fallback : whole;
}

export function limitsFor(plan: AccountPlan, overrides?: LimitOverrides | null): PlanLimits {
  const built = BUILT_IN_LIMITS[plan] ?? BUILT_IN_LIMITS.traveler;
  const over = overrides?.[plan];
  if (!over) return built;
  return {
    trips: "trips" in over ? cleanLimit(over.trips, built.trips) : built.trips,
    printsPerWeek: "printsPerWeek" in over ? cleanLimit(over.printsPerWeek, built.printsPerWeek) : built.printsPerWeek,
  };
}

/* ---- trips -------------------------------------------------------------- */

/**
 * Why a new trip cannot be started, or null.
 *
 * `existing` is how many they have RIGHT NOW. Over the limit already — because
 * the limit was lowered, or because they made them before there was one — is
 * refused for new ones and nothing else.
 */
export function newTripProblem(plan: AccountPlan, existing: number, limits: PlanLimits): string | null {
  if (limits.trips === UNLIMITED) return null;
  if (existing < limits.trips) return null;
  const n = limits.trips;
  return (
    `A ${PLAN_LABELS[plan]} account can have ${n} ${n === 1 ? "trip" : "trips"} at a time, and you have ${existing}. ` +
    "Delete one you have finished with, or ask about Pro."
  );
}

/** "1 of 2 trips used." Never null — a screen should always be able to say. */
export function describeTrips(existing: number, limits: PlanLimits): string {
  if (limits.trips === UNLIMITED) {
    return existing === 1 ? "You have 1 trip." : `You have ${existing} trips.`;
  }
  const left = limits.trips - existing;
  if (left <= 0) {
    return `You have ${existing} of ${limits.trips} trips. Delete one before starting another.`;
  }
  return `You have ${existing} of ${limits.trips} trips. ${left === 1 ? "One more" : `${left} more`} can be started.`;
}

/* ---- printing ----------------------------------------------------------- */

/** One printable copy, taken. */
export type PrintEvent = {
  /** Which trip. Reopening the same one inside the grace window is not a new print. */
  tripId: string;
  /** ISO. */
  at: string;
};

/** The prints inside the last seven days of `now`, newest first. */
export function printsThisWeek(prints: PrintEvent[], now: number): PrintEvent[] {
  return prints
    .filter((p) => {
      const at = Date.parse(p.at);
      return Number.isFinite(at) && now - at < WEEK_MS && at <= now + 60_000;
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export type PrintDecision =
  | { allowed: true; counted: boolean; message: string }
  | { allowed: false; message: string; nextAt: string };

/**
 * Whether this printable copy may be opened, and whether it costs an allowance.
 *
 * `counted: false` is the same trip again inside the grace window — it opens,
 * and nothing is spent.
 */
export function decidePrint(input: {
  plan: AccountPlan;
  limits: PlanLimits;
  prints: PrintEvent[];
  tripId: string;
  now: number;
}): PrintDecision {
  const { plan, limits, tripId, now } = input;
  if (limits.printsPerWeek === UNLIMITED) return { allowed: true, counted: true, message: "" };

  const recent = printsThisWeek(input.prints, now);

  // The same trip, just now. Not a second print by any fair reading.
  const sameTrip = recent.find((p) => p.tripId === tripId && now - Date.parse(p.at) < SAME_PRINT_GRACE_MS);
  if (sameTrip) return { allowed: true, counted: false, message: "" };

  if (recent.length < limits.printsPerWeek) {
    const left = limits.printsPerWeek - recent.length - 1;
    return {
      allowed: true,
      counted: true,
      message:
        left > 0
          ? `${left} more printable ${left === 1 ? "copy" : "copies"} this week.`
          : "That is this week's printable copy. Reopening this same trip in the next half hour will not count again.",
    };
  }

  // The oldest one inside the window is the one that has to fall out of it.
  const oldest = recent[recent.length - 1];
  const nextAt = new Date(Date.parse(oldest.at) + WEEK_MS).toISOString();
  const n = limits.printsPerWeek;
  return {
    allowed: false,
    nextAt,
    message:
      `A ${PLAN_LABELS[plan]} account can print ${n} ${n === 1 ? "copy" : "copies"} a week, and ${n === 1 ? "this week's has been used" : "this week's have been used"}. ` +
      `The next one is available ${whenIsThat(nextAt, now)}. Your trip is still here, and you can still look at it on screen and share it.`,
  };
}

/**
 * "tomorrow morning", "in 3 days" — how long until they can print again.
 *
 * Deliberately not a date and a time. The exact moment is not the useful part,
 * and a timestamp printed to the minute invites somebody to sit and wait for it.
 */
export function whenIsThat(iso: string, now: number): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "in a few days";
  const hours = Math.ceil((at - now) / 3_600_000);
  if (hours <= 1) return "within the hour";
  if (hours < 24) return `in ${hours} hours`;
  const days = Math.round(hours / 24);
  return days <= 1 ? "tomorrow" : `in ${days} days`;
}

/** What to tell somebody about printing before they try. Never null. */
export function describePrints(prints: PrintEvent[], limits: PlanLimits, now: number): string {
  if (limits.printsPerWeek === UNLIMITED) return "You can print as many copies as you like.";
  const used = printsThisWeek(prints, now).length;
  const left = Math.max(0, limits.printsPerWeek - used);
  const n = limits.printsPerWeek;
  if (left === 0) {
    const oldest = printsThisWeek(prints, now).slice(-1)[0];
    const nextAt = oldest ? new Date(Date.parse(oldest.at) + WEEK_MS).toISOString() : "";
    return `You have used this week's ${n === 1 ? "printable copy" : `${n} printable copies`}. The next is available ${nextAt ? whenIsThat(nextAt, now) : "in a few days"}.`;
  }
  return `${left} of ${n} printable ${n === 1 ? "copy" : "copies"} left this week.`;
}

/**
 * The whole thing in a paragraph, for the account page and the admin.
 *
 * Says what a plan DOES NOT limit as well as what it does, because a list of
 * restrictions with no floor under it reads as though the rest might go next.
 */
export function describeLimits(plan: AccountPlan, limits: PlanLimits): string {
  const parts: string[] = [];
  if (limits.trips !== UNLIMITED) parts.push(`${limits.trips} ${limits.trips === 1 ? "trip" : "trips"} at a time`);
  if (limits.printsPerWeek !== UNLIMITED) {
    parts.push(`${limits.printsPerWeek} printable ${limits.printsPerWeek === 1 ? "copy" : "copies"} a week`);
  }
  if (parts.length === 0) return `${PLAN_LABELS[plan]} has no limits on trips or printing.`;
  return (
    `${PLAN_LABELS[plan]}: ${parts.join(", and ")}. ` +
    "Everything else on the site is the same — every kever, every guide, the planner, the map, and sharing a trip with anybody you like."
  );
}
