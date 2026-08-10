"use server";

import { revalidatePath } from "next/cache";
import type { CaseStudyDraft } from "@/data/case-studies";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { caseStudiesStoreAvailable, deleteCaseStudy, upsertCaseStudy } from "@/lib/case-studies-store";

export type ActionResult = { ok: boolean; message: string };

async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };
  if (!caseStudiesStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

export async function saveCaseStudyAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const draft: CaseStudyDraft = {
    id: String(form.get("id") ?? "").trim() || undefined,
    attribution: String(form.get("attribution") ?? ""),
    anonymised: form.get("anonymised") === "on",
    tripRequest: String(form.get("tripRequest") ?? ""),
    whatSolved: String(form.get("whatSolved") ?? ""),
    outcome: String(form.get("outcome") ?? ""),
    permissionRecorded: form.get("permissionRecorded") === "on",
    approved: form.get("approved") === "on",
  };

  const saved = await upsertCaseStudy(draft);
  if (saved.ok) revalidatePath("/admin/settings/proof");
  return saved;
}

export async function deleteCaseStudyAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;
  const id = String(form.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Nothing to delete." };
  const result = await deleteCaseStudy(id);
  if (result.ok) revalidatePath("/admin/settings/proof");
  return result;
}
