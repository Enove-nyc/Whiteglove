"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { clearCspReports, cspReportStoreAvailable } from "@/lib/csp-reports";

export type ActionResult = { ok: boolean; message: string };

/**
 * Clearing the collected reports, so a watch can start clean after a change.
 *
 * The reports pile up across every deploy, so once the policy has been widened
 * the old rows are about the old policy and reading them is reading history.
 * This wipes them; the next visitor to hit a real violation starts the count
 * again. Gated to the same people the rest of settings is.
 */
export async function clearCspReportsAction(): Promise<ActionResult> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };
  if (!cspReportStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  await clearCspReports();
  revalidatePath("/admin/settings/security");
  return { ok: true, message: "Cleared. The count starts again from the next report." };
}
