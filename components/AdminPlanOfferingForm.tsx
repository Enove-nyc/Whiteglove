"use client";

import { useActionState, useState } from "react";
import { savePlanOfferingAction } from "@/app/admin/settings/plans/actions";
import { PLAN_BLURB, PLAN_LABELS } from "@/lib/account-plans";
import { PAID_PLANS, type PaidPlan, type PlanOffering } from "@/lib/plan-billing";

const input =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const caption = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

/**
 * The one screen that decides whether this site sells anything.
 *
 * The Stripe fields are shown even in "ask" mode rather than hidden behind the
 * choice: the owner filling them in ahead of time, and switching the mode on
 * the day he is ready, is the whole shape of how this was asked for.
 */
export default function AdminPlanOfferingForm({
  current,
  storeReady,
  stripe,
}: {
  current: PlanOffering;
  storeReady: boolean;
  stripe: { secretKey: boolean; webhookSecret: boolean; testMode: boolean };
}) {
  const [state, act, busy] = useActionState(savePlanOfferingAction, null);
  const [open, setOpen] = useState(current.open);
  const [how, setHow] = useState<"ask" | "stripe">(current.how);

  return (
    <form action={act} className="mt-6 space-y-8">
      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected. Nothing here can be saved until it is.
        </p>
      )}

      <section>
        <label className="flex cursor-pointer gap-3 text-sm leading-6 text-stone-700">
          <input
            type="checkbox"
            name="open"
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
            disabled={!storeReady || busy}
            className="mt-1.5"
          />
          <span>
            <span className="font-semibold text-[var(--navy)]">Offer Pro and Business</span>
            <span className="block text-stone-500">
              Off means the account page says nothing about either, and nothing on the site can charge anybody. This is
              the switch — everything below is what happens when it is on.
            </span>
          </span>
        </label>
      </section>

      <fieldset disabled={!open || !storeReady || busy} className={open ? "" : "opacity-50"}>
        <legend className={caption}>How somebody gets one</legend>
        <div className="mt-2 space-y-2">
          <label className="flex cursor-pointer gap-3 text-sm leading-6 text-stone-700">
            <input type="radio" name="how" value="ask" checked={how === "ask"} onChange={() => setHow("ask")} className="mt-1.5" />
            <span>
              <span className="font-semibold text-[var(--navy)]">They ask, you answer</span>
              <span className="block text-stone-500">
                No card is taken anywhere on the site. The request arrives in your inbox and you grant the account under
                Visitor accounts. You settle up however you like, outside the site.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 text-sm leading-6 text-stone-700">
            <input type="radio" name="how" value="stripe" checked={how === "stripe"} onChange={() => setHow("stripe")} className="mt-1.5" />
            <span>
              <span className="font-semibold text-[var(--navy)]">Stripe subscription</span>
              <span className="block text-stone-500">
                A real recurring payment on Stripe&rsquo;s own page. The account is put on the plan when Stripe says the
                money moved, and taken off it when the subscription ends.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-4 rounded-md border border-[var(--gold-light)] bg-white p-4 text-sm leading-6 text-stone-600">
          <p className="font-semibold text-[var(--navy)]">What this deployment has</p>
          <p className="mt-1">
            Secret key: {stripe.secretKey ? (stripe.testMode ? "set — a TEST key, so no real money moves" : "set") : "not set"}.
            {" "}Webhook secret: {stripe.webhookSecret ? "set" : "not set"}.
          </p>
          {(!stripe.secretKey || !stripe.webhookSecret) && (
            <p className="mt-2">
              Stripe cannot be chosen until both are set on the deployment as <code>STRIPE_SECRET_KEY</code> and{" "}
              <code>STRIPE_WEBHOOK_SECRET</code>. The webhook endpoint to give Stripe is{" "}
              <code>/api/billing/webhook</code>, listening for <code>checkout.session.completed</code>,{" "}
              <code>customer.subscription.updated</code> and <code>customer.subscription.deleted</code>.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset disabled={!open || !storeReady || busy} className={`space-y-6 ${open ? "" : "opacity-50"}`}>
        <legend className={caption}>The two plans</legend>
        {PAID_PLANS.map((plan: PaidPlan) => (
          <div key={plan} className="rounded-md border border-[var(--gold-light)] bg-white p-4">
            <label className="flex cursor-pointer gap-3 text-sm leading-6 text-stone-700">
              <input type="checkbox" name={`${plan}-on`} defaultChecked={current.plans[plan]} className="mt-1.5" />
              <span>
                <span className="font-semibold text-[var(--navy)]">{PLAN_LABELS[plan]}</span>
                <span className="block text-stone-500">{PLAN_BLURB[plan]}</span>
              </span>
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={caption}>What the page says it costs — only used when they ask rather than pay</span>
                <input
                  name={`${plan}-asking`}
                  defaultValue={current.pricing[plan].askingLine}
                  placeholder="Leave blank to say nothing about money"
                  className={input}
                />
              </label>
              <label className="block">
                <span className={caption}>Stripe price id — monthly</span>
                <input name={`${plan}-monthly`} defaultValue={current.pricing[plan].monthlyPriceId} placeholder="price_…" className={input} />
              </label>
              <label className="block">
                <span className={caption}>Stripe price id — yearly</span>
                <input name={`${plan}-yearly`} defaultValue={current.pricing[plan].yearlyPriceId} placeholder="price_… (optional)" className={input} />
              </label>
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              With Stripe chosen, the price a visitor reads is fetched from Stripe itself — so it cannot disagree with
              what their card is charged. The line above is not used then.
            </p>
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!storeReady || busy}
          className="bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {current.updatedAt && (
          <span className="text-xs text-stone-500">
            Last changed {new Date(current.updatedAt).toLocaleDateString()} by {current.updatedBy || "somebody"}.
          </span>
        )}
      </div>

      {state && (
        <p
          className={`rounded-md px-4 py-3 text-sm leading-6 ${
            state.ok ? "bg-emerald-50 text-emerald-900" : "border border-amber-200 bg-amber-50 text-amber-900"
          }`}
          role="status"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
