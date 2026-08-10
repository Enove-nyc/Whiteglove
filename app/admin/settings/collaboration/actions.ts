"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { saveCollaborationSettings } from "@/lib/growth-settings-store";

export type CollaborationActionResult = { ok: boolean; message: string };

export async function saveCollaborationAction(
  _prev: CollaborationActionResult | null,
  formData: FormData,
): Promise<CollaborationActionResult> {
  const { identity, areas } = await currentAdmin();
  if (!mayUse(areas, "access")) return { ok: false, message: "Not allowed." };
  const by = identity?.how === "account" ? identity.email : "admin";
  const result = await saveCollaborationSettings(
    {
      votingEnabled: formData.get("votingEnabled") === "on",
      sharedFavoritesEnabled: formData.get("sharedFavoritesEnabled") === "on",
      roomGroupsEnabled: formData.get("roomGroupsEnabled") === "on",
    },
    by,
  );
  revalidatePath("/admin/settings/collaboration");
  revalidatePath("/admin/settings");
  return result;
}
