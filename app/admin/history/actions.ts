"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { CHANGE_AREA } from "@/lib/changes";
import { dropChange, findChange } from "@/lib/changes-store";
import { undoChange } from "@/lib/changes-undo";

export type ActionResult = { ok: boolean; message: string };

/**
 * Checked on the ENTRY rather than on the screen, so a posted id from
 * somebody restricted to the directory cannot put back a page.
 */
async function allowed(id: string) {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false as const, message: "Please sign in as an administrator." };
  const change = await findChange(id);
  if (!change) return { ok: false as const, message: "That change is not in the log any more." };
  if (!mayUse(areas, CHANGE_AREA[change.kind])) {
    return { ok: false as const, message: "That is not part of what you have been given access to." };
  }
  return { ok: true as const, change };
}

export async function undoChangeAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")) : "";
  const check = await allowed(id);
  if (!check.ok) return check;

  const result = await undoChange(check.change);
  if (!result.ok) return result;

  // Taken out only once it has actually been put back, so a failed undo leaves
  // the entry there to try again.
  await dropChange(id);
  revalidatePath("/admin/history");
  revalidatePath("/admin/pages");
  revalidatePath("/admin/destinations");
  revalidatePath("/admin/kevarim");
  return result;
}

export async function dismissChangeAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")) : "";
  const check = await allowed(id);
  if (!check.ok) return check;

  const ok = await dropChange(id);
  if (ok) revalidatePath("/admin/history");
  return ok
    ? { ok: true, message: "Taken off the list. The change itself stands." }
    : { ok: false, message: "Could not take it off. Is the private store connected?" };
}
