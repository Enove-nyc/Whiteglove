"use server";

import { revalidatePath } from "next/cache";
import { BUILT_IN_WORDS, type SiteWords } from "@/data/site-words";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { WORD_KEYS, wordProblem } from "@/lib/site-words";
import { resetWords, saveWords, wordsStoreAvailable } from "@/lib/site-words-store";

export type ActionResult = { ok: boolean; message: string };

/**
 * Checked here as well as by the settings layout's gate: a server action is its
 * own door, and a page that refuses to render is not a page that refuses to act.
 * These words are on the front of the website, so this is not a small door.
 */
async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };
  if (!wordsStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

export async function saveWordsAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  // A field that did not arrive keeps what the site ships with rather than
  // becoming blank. A half-submitted form must not be able to empty the front
  // page.
  const next = { ...BUILT_IN_WORDS } as SiteWords;
  for (const key of WORD_KEYS) {
    const value = String(form.get(key) ?? "").trim();
    if (value) next[key] = value;
  }

  const problem = wordProblem(next);
  if (problem) return { ok: false, message: problem };

  const saved = await saveWords(next);
  if (saved.ok) revalidatePath("/admin/settings/words");
  return saved;
}

/** `prev` is what useActionState passes; putting the words back ignores it. */
export async function resetWordsAction(prev: ActionResult | null): Promise<ActionResult> {
  void prev;
  const refused = await allowed();
  if (refused) return refused;
  if (!(await resetWords())) return { ok: false, message: "Could not put them back. Try again." };
  revalidatePath("/admin/settings/words");
  return { ok: true, message: "Every line is back to the wording the site ships with." };
}
