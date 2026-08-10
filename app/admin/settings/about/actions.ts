"use server";

import { revalidatePath } from "next/cache";
import { EMPTY_ABOUT_PROFILE, type AboutProfile } from "@/data/about-profile";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { ABOUT_KEYS, aboutProfileProblem } from "@/lib/about-profile";
import { aboutProfileStoreAvailable, saveAboutProfile } from "@/lib/about-profile-store";

export type ActionResult = { ok: boolean; message: string };

async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };
  if (!aboutProfileStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

export async function saveAboutProfileAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const next = { ...EMPTY_ABOUT_PROFILE } as AboutProfile;
  for (const key of ABOUT_KEYS) {
    next[key] = String(form.get(key) ?? "").trim();
  }

  const problem = aboutProfileProblem(next);
  if (problem) return { ok: false, message: problem };

  const saved = await saveAboutProfile(next);
  if (saved.ok) revalidatePath("/admin/settings/about");
  return saved;
}
