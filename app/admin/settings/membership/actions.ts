"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { saveMembershipSettings } from "@/lib/growth-settings-store";

export type MembershipActionResult = { ok: boolean; message: string };

export async function saveMembershipAction(
  _prev: MembershipActionResult | null,
  formData: FormData,
): Promise<MembershipActionResult> {
  const { identity, areas } = await currentAdmin();
  if (!mayUse(areas, "access")) return { ok: false, message: "Not allowed." };
  const by = identity?.how === "account" ? identity.email : "admin";
  const status = formData.get("status") === "disabled" ? "disabled" : "planned";
  const result = await saveMembershipSettings(
    {
      status,
      internalNotes: String(formData.get("internalNotes") ?? ""),
    },
    by,
  );
  revalidatePath("/admin/settings/membership");
  revalidatePath("/admin/settings");
  return result;
}
