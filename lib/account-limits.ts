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
 * NOBODY PLANS A TRIP FOR NOTHING ANY MORE. An account with no plan yet
 * ("free" — see lib/account-plans.ts) has a trip limit of zero: it exists so
 * an account can be signed into and a plan chosen, and nothing else. One Trip
 * asks a single small fee for exactly one trip, ever, on that account. Advisor
 * Starter and Advisor Pro are subscriptions with no trip ceiling at all.
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
  /**
   * How many OTHER logins may be linked to this account as staff — see
   * data/team.ts. The owner's own sign-in is never counted against this
   * number; staffSeats: 0 means "just the owner," not "the account is
   * locked." Only Business ever has more than zero — inviting staff at all
   * is gated the same as everything else about planning on somebody else's
   * behalf (mayServeCompanionClients).
   */
  staffSeats: Limit;
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
 * Advisor Pro actually get you" without grepping.
 *
 * WHERE THE LINE FALLS NOW. One Trip gets the White Glove app for that one
 * trip (companionApp) — nothing about serving a client. Advisor Starter is
 * where the app is handed to CLIENTS (companionClients) — a link, a chat, an
 * inbox — because that is what an advisor's first subscription is actually
 * for. Advisor Pro has everything Starter does, plus its own name on the
 * itinerary and the client app (ownBranding), saved trip templates
 * (templates), and the business-at-a-glance numbers on the pipeline
 * (analytics) — the tools for somebody doing this often enough that the
 * shape of a trip and the shape of the business are both worth reusing.
 *
 * NOTHING ELSE IS INVENTED HERE. Each entitlement in this table was asked for,
 * and the account page changed in the same commit that added it.
 */
export type PlanFeatures = {
  /**
   * Put their own logo and business name on the printed itinerary and on the
   * client app, in place of the White Glove crest. The small credit line in
   * the footer stays either way — see components/PrintableItinerary.tsx,
   * which is where that decision is written down and enforced.
   */
  ownBranding: boolean;
  /**
   * Whether the assistant's conversation is kept between visits.
   *
   * The answers are the same on every plan — a traveler asking about Antwerp
   * gets exactly what a Pro asks gets. What a paid plan buys is that the
   * thread is still there tomorrow instead of starting again. That is a fair
   * thing to charge for and a poor thing to withhold an answer over, so the
   * gate is on the keeping and never on the asking.
   */
  assistantHistory: boolean;
  /**
   * The White Glove app for your OWN trips — a trip in your pocket, at /app.
   *
   * Every paid plan. A day at a time, the wallet kept on the phone with no
   * signal, the guide, the map. This is the app used for the trips the
   * account itself is taking; it says nothing about anybody else.
   * app/app/page.tsx is the door that reads this.
   */
  companionApp: boolean;
  /**
   * The app for OTHER PEOPLE — the client-facing half. Starter and Pro.
   *
   * A link that opens one trip as the app on a client's phone, the chat with
   * that client, and the advisor's inbox of all of them. One Trip has the app
   * for the one trip it is, and none of this — it is not for planning on
   * somebody else's behalf. Read by the share and chat routes and by the
   * advisor inbox — never by app/app/page.tsx, which only asks companionApp.
   */
  companionClients: boolean;
  /**
   * Save a trip as a reusable template, and start a new trip from one. Pro
   * only — see lib/trip-templates.ts and components/TripSwitcher.tsx.
   */
  templates: boolean;
  /**
   * The business-at-a-glance numbers strip above the trip pipeline's board —
   * active trips, departures soon, what is outstanding. Pro only — see
   * pipelineStats in data/trip-pipeline.ts.
   */
  analytics: boolean;
};

export const PLAN_FEATURES: Record<AccountPlan, PlanFeatures> = {
  free: { ownBranding: false, assistantHistory: false, companionApp: false, companionClients: false, templates: false, analytics: false },
  one_trip: { ownBranding: false, assistantHistory: true, companionApp: true, companionClients: false, templates: false, analytics: false },
  starter: { ownBranding: false, assistantHistory: true, companionApp: true, companionClients: true, templates: false, analytics: false },
  pro: { ownBranding: true, assistantHistory: true, companionApp: true, companionClients: true, templates: true, analytics: true },
};

export function featuresFor(plan: AccountPlan): PlanFeatures {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
}

/** Whether the assistant remembers this plan's conversation. Named once. */
export function keepsAssistantHistory(plan: AccountPlan): boolean {
  return featuresFor(plan).assistantHistory;
}

/** Whether this plan may brand its own itineraries and client app. The one gate, named once. */
export function mayBrandOwnItinerary(plan: AccountPlan): boolean {
  return featuresFor(plan).ownBranding;
}

/** Whether this plan reaches the White Glove app at /app for its own trips. */
export function mayUseCompanionApp(plan: AccountPlan): boolean {
  return featuresFor(plan).companionApp;
}

/** Whether this plan may hand the app to clients — links, chat, the inbox. */
export function mayServeCompanionClients(plan: AccountPlan): boolean {
  return featuresFor(plan).companionClients;
}

/** Whether this plan may save and start trips from templates. */
export function mayUseTripTemplates(plan: AccountPlan): boolean {
  return featuresFor(plan).templates;
}

/** Whether this plan sees the business-at-a-glance numbers on the pipeline. */
export function mayViewPipelineAnalytics(plan: AccountPlan): boolean {
  return featuresFor(plan).analytics;
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
  // Nothing bought yet — signed in, and able to choose a plan, and nothing
  // else. Not a locked account by accident; this is the whole point of it.
  free: { trips: 0, printsPerWeek: 0, staffSeats: 0 },
  // Exactly the one trip the fee was for.
  one_trip: { trips: 1, printsPerWeek: UNLIMITED, staffSeats: 0 },
  // Nothing has been decided about trips or printing for these, so neither is
  // limited — an invented number would be a promise nobody made. Staff seats
  // are different: a plan that cannot serve clients at all (companionClients
  // above) has nobody to add a teammate for, so seats follow that gate.
  starter: { trips: UNLIMITED, printsPerWeek: UNLIMITED, staffSeats: 2 },
  pro: { trips: UNLIMITED, printsPerWeek: UNLIMITED, staffSeats: 2 },
};

export type LimitOverrides = Partial<Record<AccountPlan, Partial<PlanLimits>>>;

/** A stored number, or the built-in one. Nonsense falls back rather than throwing. */
function cleanLimit(value: unknown, fallback: Limit): Limit {
  if (value === null) return UNLIMITED;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const whole = Math.floor(value);
  // Zero would mean "cannot make a single trip", which is not a limit, it is a
  // locked account. Anybody who wants that should close the account. The one
  // deliberate exception, `free`, is not read through this function at all —
  // it is a BUILT_IN_LIMITS constant, never an admin-entered override.
  return whole < 1 ? fallback : whole;
}

/**
 * The same cleaning as cleanLimit, except zero is a real, valid value here —
 * "no staff seats on this plan" is an ordinary state (every plan below
 * Business), not a locked account the way zero trips would be.
 */
function cleanSeatLimit(value: unknown, fallback: Limit): Limit {
  if (value === null) return UNLIMITED;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const whole = Math.floor(value);
  return whole < 0 ? fallback : whole;
}

export function limitsFor(plan: AccountPlan, overrides?: LimitOverrides | null): PlanLimits {
  const built = BUILT_IN_LIMITS[plan] ?? BUILT_IN_LIMITS.free;
  const over = overrides?.[plan];
  if (!over) return built;
  return {
    trips: "trips" in over ? cleanLimit(over.trips, built.trips) : built.trips,
    printsPerWeek: "printsPerWeek" in over ? cleanLimit(over.printsPerWeek, built.printsPerWeek) : built.printsPerWeek,
    staffSeats: "staffSeats" in over ? cleanSeatLimit(over.staffSeats, built.staffSeats) : built.staffSeats,
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
  if (plan === "free") return "Choose a plan to start your first trip.";
  const n = limits.trips;
  return (
    `${PLAN_LABELS[plan]} can have ${n} ${n === 1 ? "trip" : "trips"} at a time, and you have ${existing}. ` +
    "Delete one you have finished with, or choose a plan with more room."
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
      `${PLAN_LABELS[plan]} can print ${n} ${n === 1 ? "copy" : "copies"} a week, and ${n === 1 ? "this week's has been used" : "this week's have been used"}. ` +
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
  if (plan === "free") return "Choose a plan below to start planning a trip.";
  const parts: string[] = [];
  if (limits.trips !== UNLIMITED) parts.push(`${limits.trips} ${limits.trips === 1 ? "trip" : "trips"} at a time`);
  if (limits.printsPerWeek !== UNLIMITED) {
    parts.push(`${limits.printsPerWeek} printable ${limits.printsPerWeek === 1 ? "copy" : "copies"} a week`);
  }
  const everythingElse =
    "Everything else on the site is the same — every kever, every guide, the planner, the map, and sharing a trip with anybody you like.";
  if (parts.length === 0) return `${PLAN_LABELS[plan]} has no limits on trips or printing. ${everythingElse}`;
  return `${PLAN_LABELS[plan]}: ${parts.join(", and ")}. ${everythingElse}`;
}
