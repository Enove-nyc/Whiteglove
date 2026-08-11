"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { runTrelloCandidateReviewSync } from "@/lib/trello-candidate-review-runtime";
import {
  saveTrelloCandidateReviewSettings,
} from "@/lib/trello-candidate-review-store";
import {
  trelloCandidateReviewSettingsProblem,
  type TrelloCandidateReviewSettingsInput,
} from "@/lib/trello-candidate-review";

export type TrelloCandidateReviewActionResult = { ok: boolean; message: string };

async function allowed(): Promise<TrelloCandidateReviewActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "directory")) return { ok: false, message: "Your sign-in does not cover the directory." };
  return null;
}

function settingsFromForm(formData: FormData): TrelloCandidateReviewSettingsInput {
  return {
    boardId: String(formData.get("boardId") ?? "").trim(),
    reviewListId: String(formData.get("reviewListId") ?? "").trim(),
    doneListId: String(formData.get("doneListId") ?? "").trim(),
    enabled: formData.get("enabled") === "on",
  };
}

export async function saveTrelloCandidateReviewSettingsAction(
  _previous: TrelloCandidateReviewActionResult | null,
  formData: FormData,
): Promise<TrelloCandidateReviewActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const settings = settingsFromForm(formData);
  const problem = trelloCandidateReviewSettingsProblem(settings);
  if (problem) return { ok: false, message: problem };
  if (!(await saveTrelloCandidateReviewSettings(settings))) {
    return {
      ok: false,
      message: "The private configuration store is not ready. Connect and set up DATABASE_URL, then try again.",
    };
  }

  revalidatePath("/admin/imports");
  revalidatePath("/admin/imports/trello");
  return {
    ok: true,
    message: settings.enabled
      ? "Saved. A protected sync will still verify the board and both lists before creating any card."
      : "Saved with candidate-card sync disabled.",
  };
}

export async function syncTrelloCandidateReviewCardsAction(
  _previous: TrelloCandidateReviewActionResult | null,
): Promise<TrelloCandidateReviewActionResult> {
  void _previous;
  const refused = await allowed();
  if (refused) return refused;

  try {
    const result = await runTrelloCandidateReviewSync();
    revalidatePath("/admin/imports");
    revalidatePath("/admin/imports/trello");
    return {
      ok: result.ok && result.failed === 0 && result.uncertain === 0,
      message: result.message,
    };
  } catch {
    return {
      ok: false,
      message: "The candidate-card sync could not run. No public listing was changed.",
    };
  }
}
