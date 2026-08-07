"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { SLOTS, type TravelpayoutsLinks } from "@/lib/travelpayouts";
import { saveTravelpayoutsLinks, travelpayoutsStoreAvailable } from "@/lib/travelpayouts-store";

export type ActionResult = { ok: boolean; message: string };

/**
 * Checked here as well as by the settings layout's gate: a server action is its
 * own door. This one decides where the site's commission goes, so it is not a
 * small door.
 */
async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };
  if (!travelpayoutsStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

export async function saveLinksAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const next: TravelpayoutsLinks = {};
  for (const { slot } of SLOTS) {
    const value = String(form.get(slot) ?? "").trim();
    if (value) next[slot] = value;
  }

  // saveTravelpayoutsLinks checks each link against the partner that search
  // actually opens, and refuses the save rather than storing one that cannot
  // earn.
  const saved = await saveTravelpayoutsLinks(next);
  if (saved.ok) {
    revalidatePath("/admin/settings/earnings");
    revalidatePath("/book");
  }
  return saved;
}
