"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isValidAccessToken } from "@/lib/secure-access";
import { clearEmptySearch } from "@/lib/site-analytics";

export type ActionResult = { ok: boolean; message: string };

/**
 * Take one term off the not-found list.
 *
 * For a typo, or for something that has since been added. It forgets only that
 * the search found nothing — the search itself stays in the totals, because
 * somebody did look for it and that remains true.
 */
export async function forgetSearchAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const cookie = (await cookies()).get("white_glove_admin")?.value;
  if (!isValidAccessToken("admin", cookie)) return { ok: false, message: "Please sign in as an administrator." };

  const term = typeof formData.get("term") === "string" ? String(formData.get("term")).trim() : "";
  if (!term) return { ok: false, message: "Nothing to forget." };

  const ok = await clearEmptySearch(term);
  if (ok) revalidatePath("/admin/reports");
  return ok
    ? { ok: true, message: `Forgot “${term}”.` }
    : { ok: false, message: "Could not forget it. Is the private store connected?" };
}
