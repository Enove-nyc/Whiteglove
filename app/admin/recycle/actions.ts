"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { KIND_AREA } from "@/lib/recycle";
import { forgetDeleted, listDeleted, takeFromBin } from "@/lib/recycle-store";
import { restoreDeleted } from "@/lib/recycle-restore";

export type ActionResult = { ok: boolean; message: string };

function id(formData: FormData): string {
  const value = formData.get("id");
  return typeof value === "string" ? value : "";
}

/**
 * The one gate both actions go through.
 *
 * Checked on the ENTRY, not on the screen: somebody restricted to the
 * directory must not be able to restore an advertisement by posting its id,
 * even though the screen would never have shown it to them.
 */
async function mayTouch(entryId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in as an administrator." };
  const entry = (await listDeleted()).find((row) => row.id === entryId);
  if (!entry) return { ok: false, message: "That is not in the bin any more." };
  if (!mayUse(areas, KIND_AREA[entry.kind])) {
    return { ok: false, message: "That is not part of what you have been given access to." };
  }
  return { ok: true };
}

export async function restoreAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const entryId = id(formData);
  const allowed = await mayTouch(entryId);
  if (!allowed.ok) return allowed;

  const entry = (await listDeleted()).find((row) => row.id === entryId);
  if (!entry) return { ok: false, message: "That is not in the bin any more." };

  // WRITTEN BACK FIRST, taken out of the bin second. The other order leaves a
  // moment where the record exists nowhere at all, and a process that dies in
  // that moment loses the thing this whole screen exists to protect. This way
  // the worst case is a stale entry, and pressing it again says "already
  // there" rather than making a second copy.
  const result = await restoreDeleted(entry);
  if (!result.ok) return result;

  await takeFromBin(entryId);
  revalidatePath("/admin/recycle");
  revalidatePath("/admin/directory");
  revalidatePath("/admin/kevarim");
  return result;
}

export async function forgetAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const entryId = id(formData);
  const allowed = await mayTouch(entryId);
  if (!allowed.ok) return allowed;

  const ok = await forgetDeleted(entryId);
  if (ok) revalidatePath("/admin/recycle");
  return ok
    ? { ok: true, message: "Thrown away for good." }
    : { ok: false, message: "Could not throw it away. Is the private store connected?" };
}
