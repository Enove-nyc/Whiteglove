"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { cleanOffering, offeringProblem, PAID_PLANS, type PlanOffering, readOfferingHow } from "@/lib/plan-billing";
import { writePlanOffering } from "@/lib/plan-billing-store";
import { stripeReadiness } from "@/lib/stripe";

export type PlansActionResult = { ok: boolean; message: string };

/**
 * Saving the offering.
 *
 * THE REFUSALS ARE THE POINT. `offeringProblem` is checked here, on save, so a
 * setting that could not work is never written down — an offering that says
 * "open, take cards" with no Stripe key would draw a subscribe button on the
 * account page that fails the moment somebody presses it, and the person who
 * finds out would be a customer rather than the owner.
 */
export async function savePlanOfferingAction(
  _prev: PlansActionResult | null,
  form: FormData,
): Promise<PlansActionResult> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };

  const next = cleanOffering({
    open: String(form.get("open") ?? "") === "on",
    // Handed to readOfferingHow rather than mapped here. This line used to do
    // its own mapping and turned every setting that was not "stripe" into
    // "ask" — including "soon", which is the one the owner had chosen.
    how: readOfferingHow(form.get("how")),
    plans: Object.fromEntries(PAID_PLANS.map((plan) => [plan, String(form.get(`${plan}-on`) ?? "") === "on"])),
    pricing: Object.fromEntries(
      PAID_PLANS.map((plan) => [
        plan,
        {
          askingLine: String(form.get(`${plan}-asking`) ?? ""),
          monthlyPriceId: String(form.get(`${plan}-monthly`) ?? ""),
          yearlyPriceId: String(form.get(`${plan}-yearly`) ?? ""),
        },
      ]),
    ),
  }) as PlanOffering;

  const problem = offeringProblem(next, stripeReadiness());
  if (problem) return { ok: false, message: problem };

  if (!(await writePlanOffering(next, identity.how === "account" ? identity.email : "the shared password"))) {
    return { ok: false, message: "The private store could not be reached. Nothing was changed — try again." };
  }
  revalidatePath("/admin/settings/plans");
  revalidatePath("/account");
  return {
    ok: true,
    message: next.open
      ? "Saved. This is live on the account page now."
      : "Saved. Nothing about Pro or Business is shown to anybody.",
  };
}
