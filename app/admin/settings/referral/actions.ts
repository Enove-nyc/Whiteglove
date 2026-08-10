"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { saveReferralSettings } from "@/lib/referral-store";

export type ReferralActionResult = { ok: boolean; message: string };

export async function saveReferralAction(
  _prev: ReferralActionResult | null,
  formData: FormData,
): Promise<ReferralActionResult> {
  const { identity, areas } = await currentAdmin();
  if (!mayUse(areas, "access")) return { ok: false, message: "Not allowed." };
  const by = identity?.how === "account" ? identity.email : "admin";
  const enabled = formData.get("enabled") === "on";
  const rulesText = String(formData.get("rulesText") ?? "");
  const result = await saveReferralSettings({ enabled, rulesText }, by);
  revalidatePath("/admin/settings/referral");
  revalidatePath("/admin/settings");
  return result;
}
