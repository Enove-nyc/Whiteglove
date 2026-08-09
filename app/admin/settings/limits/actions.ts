"use server";

import { revalidatePath } from "next/cache";
import { ACCOUNT_PLANS, type AccountPlan } from "@/lib/account-plans";
import { type LimitOverrides, UNLIMITED } from "@/lib/account-limits";
import { saveLimitOverrides } from "@/lib/account-limits-store";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";

export type ActionResult = { ok: boolean; message: string };

/** A field left blank means no limit; a number means that many. */
function readLimit(form: FormData, name: string): number | null {
  const raw = String(form.get(name) ?? "").trim();
  if (!raw) return UNLIMITED;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : UNLIMITED;
}

export async function saveLimitsAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };

  const next: LimitOverrides = {};
  for (const plan of ACCOUNT_PLANS as readonly AccountPlan[]) {
    next[plan] = {
      trips: readLimit(form, `${plan}-trips`),
      printsPerWeek: readLimit(form, `${plan}-prints`),
    };
  }

  if (!(await saveLimitOverrides(next))) {
    return { ok: false, message: "The private store could not be reached. Nothing was changed — try again." };
  }
  revalidatePath("/admin/settings/limits");
  revalidatePath("/account");
  return { ok: true, message: "Saved. New trips and printable copies are checked against these from now on." };
}
