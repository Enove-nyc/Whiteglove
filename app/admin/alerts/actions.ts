"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { unsubscribeByEmail } from "@/lib/email-alerts-store";

export type AlertActionResult = { ok: boolean; message: string };

export async function adminUnsubscribeAlert(
  _prev: AlertActionResult | null,
  formData: FormData,
): Promise<AlertActionResult> {
  const { areas } = await currentAdmin();
  if (!mayUse(areas, "content")) return { ok: false, message: "Not allowed." };
  const email = String(formData.get("email") ?? "");
  const result = await unsubscribeByEmail(email);
  revalidatePath("/admin/alerts");
  return result.ok
    ? { ok: true, message: "Unsubscribed." }
    : { ok: false, message: result.error || "Could not unsubscribe." };
}
