"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { markMessage } from "@/lib/contact-store";

/**
 * Marking a message answered, or putting it back.
 *
 * Messages are the "access" area, so they are checked here as well as by the
 * layout's gate. A server action is its own door: it can be called by anything
 * that knows its name, and a page that refuses to render is not a page that
 * refuses to act.
 */

export type ActionResult = { ok: boolean; message: string };

async function whoAndMay(): Promise<{ who: string } | ActionResult> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover messages." };
  return { who: identity.how === "account" ? identity.email : "the shared password" };
}

export async function markAnsweredAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const checked = await whoAndMay();
  if ("ok" in checked) return checked;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "No message named." };
  const result = await markMessage(id, "answered", checked.who);
  if (result.ok) revalidatePath("/admin/messages");
  return result;
}

export async function markWaitingAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const checked = await whoAndMay();
  if ("ok" in checked) return checked;
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "No message named." };
  const result = await markMessage(id, "waiting", checked.who);
  if (result.ok) revalidatePath("/admin/messages");
  return result;
}
