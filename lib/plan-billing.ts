/**
 * Whether Pro and Business are offered at all, and how somebody pays for one.
 *
 * ONE SWITCH DECIDES WHETHER ANY OF THIS EXISTS. `open: false` — which is what
 * a deployment that has never been configured gets — means the account page
 * says nothing about Pro or Business, the checkout answers "not open", and the
 * site is exactly what it was before this file was written. The owner turns it
 * on when he wants it on, and nothing happens in the meantime.
 *
 * TWO WAYS TO PAY, AND THEY ARE NOT THE SAME PROMISE.
 *
 *   "ask"    — somebody asks, the owner answers, and the owner sets the plan by
 *              hand from /admin/accounts. No card is taken anywhere on the site.
 *              This is what the plan requests already did, and it still works
 *              with nothing configured at all.
 *
 *   "stripe" — a real subscription. The card is handled by Stripe on Stripe's
 *              own page; no card number ever reaches this site. Stripe tells us
 *              the subscription started, and the plan is set from that.
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

/** The plans somebody can actually pay for. Traveler is what everyone is. */
export const PAID_PLANS = ["pro", "business"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export function isPaidPlan(value: unknown): value is PaidPlan {
  return typeof value === "string" && (PAID_PLANS as readonly string[]).includes(value);
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
  /** How money is taken when it is taken. */
  how: "ask" | "stripe";
  /** Which of the paid plans are offered. Either, both, or neither. */
  plans: Record<PaidPlan, boolean>;
  pricing: Record<PaidPlan, PlanPricing>;
  updatedAt?: string;
  updatedBy?: string;
};

const EMPTY_PRICING: PlanPricing = { askingLine: "", monthlyPriceId: "", yearlyPriceId: "" };

/**
 * What a site that has never been configured has: EXACTLY WHAT IT DID BEFORE
 * THIS FILE EXISTED.
 *
 * Open, and "ask". The account page has offered "ask about Pro" since long
 * before there was any billing, a person answers it, and no card is involved —
 * so a deployment that never opens this settings screen behaves the way it
 * always did. Defaulting to closed would have been the tidier-looking choice
 * and it would have silently removed a working feature from a live site, which
 * is not a default, it is a change nobody asked for.
 *
 * "stripe" IS NEVER THE DEFAULT AND NEVER WILL BE. It is reached only by the
 * owner choosing it on a screen that refuses the choice until the keys and the
 * prices are really there. Nothing about a store outage, a bad parse or a fresh
 * deployment can produce a site that charges people.
 */
export const DEFAULT_OFFERING: PlanOffering = {
  open: true,
  how: "ask",
  plans: { pro: true, business: true },
  pricing: { pro: { ...EMPTY_PRICING }, business: { ...EMPTY_PRICING } },
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
  return {
    open: value.open !== false,
    how: value.how === "stripe" ? "stripe" : "ask",
    plans: { pro: plans.pro !== false, business: plans.business !== false },
    pricing: { pro: one("pro"), business: one("business") },
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
  if (offering.how === "ask") return true;
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
  if (chosen.length === 0) return "Turn on at least one of Pro or Business, or leave the whole thing closed.";
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
    return "Closed. Nobody is shown Pro or Business, and nothing on the site can charge anybody.";
  }
  const names = offerablePlans(offering).map((plan) => PLAN_LABELS[plan]);
  if (names.length === 0) {
    return "Open, but no plan is ready to be offered — so nothing is shown. Check the prices below.";
  }
  const list = names.join(" and ");
  return offering.how === "stripe"
    ? `Open. ${list} can be subscribed to with a card, through Stripe.`
    : `Open. ${list} can be asked about; you set the account by hand and no card is taken.`;
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
  return offering.pricing[plan]?.askingLine.trim() || "";
}

/** "Pro — for planning more than one trip at a time." Used above the button. */
export function offerHeading(plan: AccountPlan): string {
  return PLAN_LABELS[plan];
}
