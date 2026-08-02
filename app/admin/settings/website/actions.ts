"use server";

import { revalidatePath } from "next/cache";
import { type BetaNotice, noticeFrom, noticeProblem } from "@/lib/beta-notice";
import { betaStoreAvailable, saveBetaNotice } from "@/lib/beta-notice-store";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";

export type ActionResult = { ok: boolean; message: string };

/**
 * The words in the "this site is new" notice, and whether it shows at all.
 *
 * Website access is the "access" area. Checked here as well as by the layout's
 * gate, because a server action is its own door — anything that knows its name
 * can call it, and a page that refuses to render is not a page that refuses to
 * act.
 */
export async function saveBetaNoticeAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover website access." };
  if (!betaStoreAvailable()) return { ok: false, message: "This needs the private store connected." };

  const text = (name: string) => String(formData.get(name) ?? "");
  // Every blank falls back to the built-in wording rather than being saved as
  // a gap, so clearing a box restores the default instead of emptying the
  // notice — see lib/beta-notice.ts.
  const notice: BetaNotice = noticeFrom({
    on: formData.get("on") === "on",
    heading: text("heading"),
    body: text("body"),
    caution: text("caution"),
    feedback: text("feedback"),
    feedbackHref: text("feedbackHref"),
    feedbackLabel: text("feedbackLabel"),
    dismissLabel: text("dismissLabel"),
    version: text("version"),
  });

  const problem = noticeProblem(notice);
  if (problem) return { ok: false, message: problem };

  if (!(await saveBetaNotice(notice))) return { ok: false, message: "That could not be saved." };
  // The notice is read in the root layout, so every page carries it.
  revalidatePath("/", "layout");
  return {
    ok: true,
    message: notice.on
      ? "Saved. Anyone who has already dismissed it will not see it again unless you change the version."
      : "Saved — the notice is off.",
  };
}
