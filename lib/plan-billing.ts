/**
 * Whether One Trip, Advisor Starter and Advisor Pro are offered at all, and
 * how somebody pays for one.
 *
 * ONE SWITCH DECIDES WHETHER ANY OF THIS EXISTS. `open: false` — which is what
 * a deployment that has never been configured gets — means the account page
 * says nothing about any of the three, the checkout answers "not open", and
 * the site is exactly what it was before this file was written. The owner
 * turns it on when he wants it on, and nothing happens in the meantime.
 *
 * THREE WAYS SOMEBODY CAN COME BY ONE, AND THEY ARE NOT THE SAME PROMISE.
 *
 *   "soon"   — the three accounts are named, and nobody can take one yet.
 *              Asking leaves an address to be written to on the day they
 *              open. This is for the stretch where the owner knows what he
 *              is building and has not settled what each one includes, and
 *              it exists so that stretch does not have to be spent with a
 *              live sign-up nobody can honour.
 *
 *   "ask"    — somebody asks, the owner answers, and the owner sets the plan by
 *              hand from /admin/accounts. No card is taken anywhere on the site.
 *              This is what the plan requests already did, and it still works
 *              with nothing configured at all.
 *
 *   "stripe" — real money. One Trip is a single Checkout in payment mode —
 *              no card number ever reaches this site, and there is nothing to
 *              renew. Advisor Starter and Advisor Pro are real subscriptions,
 *              the same way. Stripe tells us what happened, and the plan is
 *              set from that.
 *
 * "soon" AND "ask" DIFFER IN ONE WORD AND ONE PROMISE. Both take a request and
 * neither takes a card. "ask" says a person will answer about an account they
 * can have today; "soon" says the account is not open and they will be told
 * when it is. Saying the first while meaning the second is the whole reason
 * this third setting exists rather than a note in the copy.
 *
 * A PRICE IS NEVER INVENTED HERE. In "stripe" mode the number shown to a
 * traveller is read from Stripe itself, so the words on the button and the
 * amount on the card cannot disagree — the commonest and worst failure a
 * pricing page has. In "ask" mode there is no charge to read, so the owner
 * types what he wants it to say and nothing is shown until he does.
 *
 * STRIPE CANNOT BE TURNED ON BY WISHING. `offeringProblem` refuses the mode
 * until the secret key, the webhook secret and a price for each offered plan
 * are all present — because a checkout button that 500s is worse than one that
 * was never shown.
 */

import { type AccountPlan, PLAN_LABELS } from "@/lib/account-plans";

/** The plans somebody can actually pay for. "free" is what nothing bought looks like. */
export const PAID_PLANS = ["one_trip", "starter", "pro"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export function isPaidPlan(value: unknown): value is PaidPlan {
  return typeof value === "string" && (PAID_PLANS as readonly string[]).includes(value);
}

/**
 * One Trip is a single fee, not a subscription — there is nothing to renew
 * and nothing to cancel. Checked wherever a subscription's usual assumptions
 * (a period, a renewal, a cancel-at-period-end) would otherwise be made of
 * it: the checkout mode (lib/stripe.ts), the webhook (app/api/billing/
 * webhook/route.ts), and the account page's own wording.
 */
export const ONE_TIME_PLANS = ["one_trip"] as const;

export function isOneTimePlan(plan: AccountPlan): boolean {
  return (ONE_TIME_PLANS as readonly string[]).includes(plan);
}

/**
 * How many days a first subscription runs free before the card is charged.
 *
 * ONLY THE FIRST. Somebody upgrading from Starter to Pro, or resubscribing
 * after cancelling, has already had their trial — `trialEligible` below
 * takes whether they have ever had a subscription at all, not which plan
 * they are choosing now. One Trip is a single payment, not a subscription,
 * so it is never eligible regardless.
 */
export const TRIAL_DAYS = 14;

/**
 * Whether THIS checkout gets a trial. THE ONE PLACE THIS IS DECIDED, so the
 * checkout route and the account page (which has to say so before anybody
 * presses the button) cannot drift apart on who qualifies.
 */
export function trialEligible(plan: PaidPlan, hasSubscribedBefore: boolean): boolean {
  return !isOneTimePlan(plan) && !hasSubscribedBefore;
}

/** How often the subscription renews. Both are offered; neither is assumed. */
export const BILLING_PERIODS = ["monthly", "yearly"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return value === "monthly" || value === "yearly";
}

export type PlanPricing = {
  /**
   * What the account page says this costs, in the owner's own words —
   * "$12 a month". Used ONLY in "ask" mode, where there is no charge to read
   * from anywhere. Blank means the page says nothing about money, which is the
   * honest state until he decides.
   */
  askingLine: string;
  /** Stripe price ids. `price_…`, copied out of the Stripe dashboard. */
  monthlyPriceId: string;
  yearlyPriceId: string;
};

export type PlanOffering = {
  /** The master switch. Off means none of this is visible or callable. */
  open: boolean;
  /** How somebody comes by one of them. See the note at the top of this file. */
  how: "soon" | "ask" | "stripe";
  /** Which of the paid plans are offered. Any, all, or none. */
  plans: Record<PaidPlan, boolean>;
  pricing: Record<PaidPlan, PlanPricing>;
  /**
   * The $25-a-seat add-on Advisor Pro buys into an agency (lib/agency.ts).
   * Not a plan of its own — offerablePlans/PAID_PLANS know nothing about
   * it — so it is its own field rather than a fourth entry pretending to be
   * a plan. `askingLine` and the two price ids mean exactly what they do for
   * a plan; there is simply one of it, since only Advisor Pro can have seats.
   */
  agencySeat: PlanPricing;
  updatedAt?: string;
  updatedBy?: string;
};

const EMPTY_PRICING: PlanPricing = { askingLine: "", monthlyPriceId: "", yearlyPriceId: "" };
const EMPTY_PLANS: Record<PaidPlan, boolean> = { one_trip: true, starter: true, pro: true };
const EMPTY_PRICING_BY_PLAN: Record<PaidPlan, PlanPricing> = {
  one_trip: { ...EMPTY_PRICING },
  starter: { ...EMPTY_PRICING },
  pro: { ...EMPTY_PRICING },
};

/**
 * Which setting a value is asking for. THE ONLY PLACE THAT DECIDES.
 *
 * WHY THIS IS A FUNCTION AND NOT TWO TERNARIES. It was two: one here, reading a
 * stored record, and one in the admin's save action, reading a form. When
 * "soon" was added the first was updated and the second was not — so the form
 * offered three choices, and saving any of them wrote "ask". The owner picked
 * "named, not open", pressed save, and watched the radio move back to a setting
 * he had not chosen, on a live site.
 *
 * A second copy of a mapping like this is not a duplicate, it is a fork waiting
 * for the next value to be added. There is one now, and both callers use it.
 *
 * Anything unrecognised is "soon", which can neither charge anybody nor promise
 * anybody an account — so the direction this fails in is the harmless one.
 */
export function readOfferingHow(raw: unknown): PlanOffering["how"] {
  return raw === "stripe" ? "stripe" : raw === "ask" ? "ask" : "soon";
}

/**
 * What a site that has never been configured has.
 *
 * Open, and "soon" — THE OWNER'S OWN DECISION, made while the prices were being
 * set up: the two accounts may be named, and nobody may sign up for either
 * until he has settled what each one includes. A request leaves an address to
 * write to, which is the honest version of a thing that is not open yet.
 *
 * This was "ask" for one commit, chosen so that a site which never opened the
 * settings screen kept the "ask about Pro" panel it already had. That reasoning
 * still holds and is why the switch exists — it is one radio button away, and
 * the day the details are settled it moves.
 *
 * "stripe" IS NEVER THE DEFAULT AND NEVER WILL BE. It is reached only by the
 * owner choosing it on a screen that refuses the choice until the keys and the
 * prices are really there. Nothing about a store outage, a bad parse or a fresh
 * deployment can produce a site that charges people.
 */
export const DEFAULT_OFFERING: PlanOffering = {
  open: true,
  how: "soon",
  plans: { ...EMPTY_PLANS },
  pricing: { ...EMPTY_PRICING_BY_PLAN },
  agencySeat: { ...EMPTY_PRICING },
};

/**
 * Merge a stored record onto the defaults without trusting any of its shapes.
 *
 * `open` is read as "anything but an explicit false", because a record written
 * before the field existed should behave like the default rather than close the
 * offering. `how` is read the other way round — only an explicit "stripe" is
 * Stripe — for the reason given above the defaults.
 */
export function cleanOffering(raw: unknown): PlanOffering {
  const value = (raw ?? {}) as Partial<PlanOffering>;
  const pricing = (value.pricing ?? {}) as Partial<Record<PaidPlan, Partial<PlanPricing>>>;
  const plans = (value.plans ?? {}) as Partial<Record<PaidPlan, unknown>>;
  const one = (plan: PaidPlan): PlanPricing => ({
    askingLine: typeof pricing[plan]?.askingLine === "string" ? pricing[plan]!.askingLine!.slice(0, 80) : "",
    monthlyPriceId: typeof pricing[plan]?.monthlyPriceId === "string" ? pricing[plan]!.monthlyPriceId!.trim() : "",
    yearlyPriceId: typeof pricing[plan]?.yearlyPriceId === "string" ? pricing[plan]!.yearlyPriceId!.trim() : "",
  });
  const seat = (value.agencySeat ?? {}) as Partial<PlanPricing>;
  return {
    open: value.open !== false,
    how: readOfferingHow(value.how),
    plans: {
      one_trip: plans.one_trip !== false,
      starter: plans.starter !== false,
      pro: plans.pro !== false,
    },
    pricing: { one_trip: one("one_trip"), starter: one("starter"), pro: one("pro") },
    agencySeat: {
      askingLine: typeof seat.askingLine === "string" ? seat.askingLine.slice(0, 80) : "",
      monthlyPriceId: typeof seat.monthlyPriceId === "string" ? seat.monthlyPriceId.trim() : "",
      yearlyPriceId: typeof seat.yearlyPriceId === "string" ? seat.yearlyPriceId.trim() : "",
    },
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
    updatedBy: typeof value.updatedBy === "string" ? value.updatedBy : undefined,
  };
}

/** The Stripe price id for one plan on one period, or "" if it is not set. */
export function priceIdFor(offering: PlanOffering, plan: PaidPlan, period: BillingPeriod): string {
  const pricing = offering.pricing[plan];
  if (!pricing) return "";
  return (period === "yearly" ? pricing.yearlyPriceId : pricing.monthlyPriceId).trim();
}

/**
 * Whether this plan can be offered right now, in the mode that is set.
 *
 * In "ask" mode anything the owner has ticked is offerable — there is nothing
 * to go wrong. In "stripe" mode a plan with no price id is not offerable, and
 * saying so here means the account page can simply not draw the button rather
 * than draw one that fails when it is pressed.
 */
export function planIsOfferable(offering: PlanOffering, plan: PaidPlan): boolean {
  if (!offering.open || !offering.plans[plan]) return false;
  if (offering.how !== "stripe") return true;
  return Boolean(priceIdFor(offering, plan, "monthly") || priceIdFor(offering, plan, "yearly"));
}

/** The paid plans somebody could actually take up today. Possibly none. */
export function offerablePlans(offering: PlanOffering): PaidPlan[] {
  return PAID_PLANS.filter((plan) => planIsOfferable(offering, plan));
}

/** Which periods are available for a plan. Empty in "ask" mode — nothing renews. */
export function periodsFor(offering: PlanOffering, plan: PaidPlan): BillingPeriod[] {
  if (offering.how !== "stripe") return [];
  return BILLING_PERIODS.filter((period) => Boolean(priceIdFor(offering, plan, period)));
}

/** The Stripe price id for one agency seat on one period, or "" if it is not set. */
export function agencySeatPriceId(offering: PlanOffering, period: BillingPeriod): string {
  return (period === "yearly" ? offering.agencySeat.yearlyPriceId : offering.agencySeat.monthlyPriceId).trim();
}

/**
 * Whether seats can actually be bought right now.
 *
 * AGENCY IS STRIPE-ONLY. There is real money in a seat — $25 a month per
 * person — and this site never invents a price or takes one without a card
 * on Stripe's own page, the same rule offeringProblem enforces for every
 * plan. In "ask" or "soon" mode there is no seat button; an advisor who
 * wants an agency before then asks the way anybody asks about an account.
 */
export function agencySeatOfferable(offering: PlanOffering, period: BillingPeriod): boolean {
  return offering.open && offering.how === "stripe" && Boolean(agencySeatPriceId(offering, period));
}

/**
 * Why this offering cannot be saved as it stands, or null.
 *
 * Checked when the owner presses save, so the refusal names the missing thing
 * instead of a traveller finding it. `stripeReady` is whether the deployment
 * has the keys — read from the environment by the caller, since this module
 * must stay a pure description of the settings.
 */
export function offeringProblem(offering: PlanOffering, stripeReady: { secretKey: boolean; webhookSecret: boolean }): string | null {
  if (!offering.open) return null; // Closed is always a valid thing to be.
  const chosen = PAID_PLANS.filter((plan) => offering.plans[plan]);
  if (chosen.length === 0) {
    return `Turn on at least one of ${PAID_PLANS.map((p) => PLAN_LABELS[p]).join(", ")}, or leave the whole thing closed.`;
  }
  if (offering.how !== "stripe") return null;

  if (!stripeReady.secretKey) return "Stripe cannot take payment until STRIPE_SECRET_KEY is set on the deployment.";
  if (!stripeReady.webhookSecret) {
    return "Stripe cannot be trusted to report a payment until STRIPE_WEBHOOK_SECRET is set on the deployment.";
  }
  const missing = chosen.filter((plan) => !priceIdFor(offering, plan, "monthly") && !priceIdFor(offering, plan, "yearly"));
  if (missing.length > 0) {
    return `${missing.map((plan) => PLAN_LABELS[plan]).join(" and ")} ${missing.length === 1 ? "has" : "have"} no Stripe price, so nothing could be charged. Paste a price id, or turn that plan off.`;
  }
  return null;
}

/**
 * What the admin screen says the site is doing right now, in one sentence.
 *
 * Deliberately blunt about the closed case: a settings page that describes a
 * feature at length without saying it is switched off is how a thing ends up
 * believed to be live for a year.
 */
export function describeOffering(offering: PlanOffering): string {
  if (!offering.open) {
    return `Closed. Nobody is shown ${PAID_PLANS.map((p) => PLAN_LABELS[p]).join(", ")}, and nothing on the site can charge anybody.`;
  }
  const names = offerablePlans(offering).map((plan) => PLAN_LABELS[plan]);
  if (names.length === 0) {
    return "Open, but no plan is ready to be offered — so nothing is shown. Check the prices below.";
  }
  const list = names.join(" and ");
  if (offering.how === "stripe") return `Open. ${list} can be subscribed to with a card, through Stripe.`;
  if (offering.how === "ask") return `Open. ${list} can be asked about; you set the account by hand and nothing is charged.`;
  return `Named, not open. ${list} are shown, nobody can sign up, and anybody interested leaves an address for you to write to.`;
}

/**
 * What a traveller is told about a plan they could take up.
 *
 * `stripeLine` is the price read back from Stripe, which is the only price this
 * site will ever print in "stripe" mode. No line at all is better than one that
 * turns out to be wrong at the moment somebody's card is charged.
 */
export function offerLine(offering: PlanOffering, plan: PaidPlan, stripeLine?: string | null): string {
  if (offering.how === "stripe") return stripeLine?.trim() || "";
  // Nothing about money while nothing is open. A price beside an account
  // somebody cannot have is the beginning of an argument later about what they
  // were promised.
  if (offering.how === "soon") return "";
  return offering.pricing[plan]?.askingLine.trim() || "";
}

/** "Pro — for planning more than one trip at a time." Used above the button. */
export function offerHeading(plan: AccountPlan): string {
  return PLAN_LABELS[plan];
}
