"use server";

import { revalidatePath } from "next/cache";
import type { CaseStudyDraft } from "@/data/case-studies";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import {
  caseStudiesStoreAvailable,
  deleteCaseStudy,
  reorderCaseStudy,
  setCaseStudyApproved,
  upsertCaseStudy,
} from "@/lib/case-studies-store";

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

  const sortRaw = String(form.get("sortOrder") ?? "").trim();
  const sortOrder = sortRaw === "" ? undefined : Number(sortRaw);

  const draft: CaseStudyDraft = {
    id: String(form.get("id") ?? "").trim() || undefined,
    attribution: String(form.get("attribution") ?? ""),
    anonymised: form.get("anonymised") === "on",
    location: String(form.get("location") ?? ""),
    tripType: String(form.get("tripType") ?? ""),
    quote: String(form.get("quote") ?? ""),
    tripRequest: String(form.get("tripRequest") ?? ""),
    whatSolved: String(form.get("whatSolved") ?? ""),
    outcome: String(form.get("outcome") ?? ""),
    itineraryHref: String(form.get("itineraryHref") ?? ""),
    permissionRecorded: form.get("permissionRecorded") === "on",
    approved: form.get("approved") === "on",
    sortOrder: typeof sortOrder === "number" && Number.isFinite(sortOrder) ? sortOrder : 0,
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

export async function publishCaseStudyAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;
  const id = String(form.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Nothing to publish." };
  const result = await setCaseStudyApproved(id, true);
  if (result.ok) revalidatePath("/admin/settings/proof");
  return result;
}

export async function unpublishCaseStudyAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;
  const id = String(form.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Nothing to unpublish." };
  const result = await setCaseStudyApproved(id, false);
  if (result.ok) revalidatePath("/admin/settings/proof");
  return result;
}

export async function reorderCaseStudyAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;
  const id = String(form.get("id") ?? "").trim();
  const direction = String(form.get("direction") ?? "").trim();
  if (!id || (direction !== "up" && direction !== "down")) {
    return { ok: false, message: "Nothing to reorder." };
  }
  const result = await reorderCaseStudy(id, direction);
  if (result.ok) revalidatePath("/admin/settings/proof");
  return result;
}
