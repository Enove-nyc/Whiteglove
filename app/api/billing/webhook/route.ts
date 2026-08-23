import { NextRequest, NextResponse } from "next/server";
import { type AccountPlan, PLAN_LABELS } from "@/lib/account-plans";
import { getPlan, setPlan } from "@/lib/account-plan-store";
import { sendSubscriptionNotification } from "@/lib/email";
import { isOneTimePlan, isPaidPlan } from "@/lib/plan-billing";
import {
  accountForCustomer,
  readSubscription,
  rememberCustomer,
  type SubscriptionRecord,
  writeSubscription,
} from "@/lib/plan-billing-store";
import { customerIdOf, readSubscriptionFromStripe, statusIsPaid, stripeWebhookSecret, verifyWebhook } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * What Stripe tells us, and the only thing on this site that puts an account
 * onto a paid plan without a person deciding to.
 *
 * SO IT VERIFIES FIRST AND DOES NOTHING ELSE UNTIL IT HAS. The raw body is
 * signed with the endpoint secret; anything that does not match is a 400 with
 * no detail. Without that check this URL would hand out paid accounts to
 * anybody who could POST to it.
 *
 * IT ALWAYS ANSWERS 200 ONCE THE EVENT IS REAL. Stripe retries anything else
 * for days, and an event this endpoint does not care about — there are
 * hundreds — is not a failure. A real failure is logged and still acknowledged,
 * because the useful repair is the owner reading the log, not Stripe posting
 * the same broken thing every hour for three days.
 *
 * IT NEVER TAKES A PLAN AWAY THAT IT DID NOT GIVE. A cancellation only demotes
 * an account whose current plan is the one this subscription paid for. Somebody
 * the owner put on Business by hand, who separately tried a Pro subscription
 * and cancelled it, keeps what the owner gave them.
 */

async function accountFor(object: Record<string, unknown>): Promise<string> {
  const metadata = (object.metadata ?? {}) as Record<string, string>;
  if (typeof metadata.account === "string" && metadata.account) return metadata.account;
  const reference = object.client_reference_id;
  if (typeof reference === "string" && reference) return reference;
  const customer = customerIdOf(object.customer);
  return customer ? ((await accountForCustomer(customer)) ?? "") : "";
}

function planFrom(object: Record<string, unknown>): AccountPlan | null {
  const metadata = (object.metadata ?? {}) as Record<string, string>;
  return isPaidPlan(metadata.plan) ? metadata.plan : null;
}

function periodEnd(object: Record<string, unknown>): string | undefined {
  const seconds = object.current_period_end;
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return undefined;
  return new Date(seconds * 1000).toISOString();
}

export async function POST(request: NextRequest) {
  const secret = stripeWebhookSecret();
  if (!secret) {
    // Not configured is not the same as forged. Say so in the log, since a
    // deployment taking payments with no webhook secret has a subscription
    // nobody will ever be granted.
    console.error("[billing] webhook received but STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  // The bytes as they arrived. Parsing first and re-serialising would change
  // them — key order, spacing — and the signature would never match again.
  const raw = await request.text();
  const event = verifyWebhook(raw, request.headers.get("stripe-signature"), secret);
  if (!event) return NextResponse.json({ error: "Bad signature." }, { status: 400 });

  try {
    const object = event.data.object;

    if (event.type === "checkout.session.completed") {
      const account = await accountFor(object);
      const plan = planFrom(object);
      const customerId = customerIdOf(object.customer);
      if (!account || !plan) {
        console.error("[billing] checkout completed with no account or plan on it:", { account, plan, customerId });
        return NextResponse.json({ received: true });
      }
      if (customerId) await rememberCustomer(customerId, account);

      // One Trip pays once — no subscription object exists for it at all, so
      // there is nothing to record beyond the plan itself, and nothing that
      // could ever end it from underneath somebody the way a cancelled
      // subscription can. See lib/plan-billing.ts's ONE_TIME_PLANS.
      if (object.mode === "payment" || isOneTimePlan(plan)) {
        if (!(await setPlan(account, plan, "Stripe one-time purchase"))) {
          console.error("[billing] paid but the plan could not be set:", { account, plan });
        }
        await sendSubscriptionNotification({ account, plan: PLAN_LABELS[plan], event: "started" });
        return NextResponse.json({ received: true });
      }

      const subscriptionId = typeof object.subscription === "string" ? object.subscription : customerIdOf(object.subscription);
      const now = new Date().toISOString();
      const existing = await readSubscription(account);
      // Read back from Stripe rather than assuming "active" — a first
      // subscription with a trial attached (see lib/plan-billing.ts's
      // TRIAL_DAYS) is "trialing" from the moment this event fires, and the
      // next event that would otherwise correct it may not arrive for the
      // whole length of the trial.
      const stripeSub = subscriptionId ? await readSubscriptionFromStripe(subscriptionId) : null;
      const record: SubscriptionRecord = {
        account,
        plan,
        customerId,
        subscriptionId,
        status: stripeSub?.status || "active",
        startedAt: existing?.startedAt || now,
        updatedAt: now,
      };
      await writeSubscription(record);

      // The plan is set LAST, and its failure is loud. Everything above is
      // bookkeeping; this is the thing the person actually paid for.
      if (!(await setPlan(account, plan, "Stripe subscription"))) {
        console.error("[billing] paid but the plan could not be set:", { account, plan });
      }
      await sendSubscriptionNotification({ account, plan: PLAN_LABELS[plan], event: "started" });
      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const account = await accountFor(object);
      if (!account) {
        console.error("[billing] subscription event with no account behind it:", customerIdOf(object.customer));
        return NextResponse.json({ received: true });
      }
      const status = typeof object.status === "string" ? object.status : "canceled";
      const existing = await readSubscription(account);
      const plan = planFrom(object) ?? existing?.plan ?? null;
      const now = new Date().toISOString();

      if (plan) {
        await writeSubscription({
          account,
          plan,
          customerId: customerIdOf(object.customer) || existing?.customerId || "",
          subscriptionId: typeof object.id === "string" ? object.id : existing?.subscriptionId || "",
          status: event.type === "customer.subscription.deleted" ? "canceled" : status,
          currentPeriodEnd: periodEnd(object) ?? existing?.currentPeriodEnd,
          cancelAtPeriodEnd: object.cancel_at_period_end === true,
          startedAt: existing?.startedAt || now,
          updatedAt: now,
        });
      }

      const ended = event.type === "customer.subscription.deleted" || !statusIsPaid(status);
      if (ended && plan) {
        // Only what this subscription gave. See the note at the top: a plan the
        // owner granted by hand is his to take away, not Stripe's.
        const current = await getPlan(account);
        if (current === plan) {
          await setPlan(account, "free", "Stripe subscription ended");
          await sendSubscriptionNotification({ account, plan: PLAN_LABELS[plan], event: "ended" });
        }
      }
      return NextResponse.json({ received: true });
    }

    // Everything else Stripe sends. Acknowledged and ignored on purpose.
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[billing] webhook handler threw:", error);
    // Still 200. See the note at the top.
    return NextResponse.json({ received: true });
  }
}
