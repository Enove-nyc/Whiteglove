"use server";

import { revalidatePath } from "next/cache";
import { answerRequest, setPlan } from "@/lib/account-plan-store";
import { isAccountPlan } from "@/lib/account-plans";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";

/**
 * Answering somebody who asked for a different kind of account.
 *
 * Accounts are the "access" area, and these change one — so they are checked
 * here as well as by the layout's gate. A server action is its own door: it
 * can be called by anything that knows its name, and a page that refuses to
 * render is not a page that refuses to act.
 */

export type ActionResult = { ok: boolean; message: string };

async function whoAndMay(): Promise<{ who: string } | ActionResult> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover accounts." };
  return { who: identity.how === "account" ? identity.email : "the shared password" };
}

export async function grantRequestAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const checked = await whoAndMay();
  if ("ok" in checked) return checked;
  const account = String(formData.get("account") ?? "");
  if (!account) return { ok: false, message: "No account named." };
  const result = await answerRequest(account, "granted", checked.who);
  if (result.ok) revalidatePath("/admin/accounts");
  return result;
}

export async function declineRequestAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const checked = await whoAndMay();
  if ("ok" in checked) return checked;
  const account = String(formData.get("account") ?? "");
  if (!account) return { ok: false, message: "No account named." };
  const result = await answerRequest(account, "declined", checked.who);
  if (result.ok) revalidatePath("/admin/accounts");
  return result;
}

/**
 * Put an account on a plan without anybody having asked.
 *
 * The only way a plan can be taken away as well as given, which is why it is
 * separate from answering a request rather than folded into it: a request is a
 * person waiting for a yes, and this is the owner deciding on his own.
 */
export async function setPlanAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const checked = await whoAndMay();
  if ("ok" in checked) return checked;
  const account = String(formData.get("account") ?? "");
  const plan = String(formData.get("plan") ?? "");
  if (!account) return { ok: false, message: "No account named." };
  if (!isAccountPlan(plan)) return { ok: false, message: "That is not one of the plans." };
  if (!(await setPlan(account, plan, checked.who))) {
    return { ok: false, message: "That account could not be read, so nothing was changed." };
  }
  revalidatePath("/admin/accounts");
  return { ok: true, message: "Saved." };
}
