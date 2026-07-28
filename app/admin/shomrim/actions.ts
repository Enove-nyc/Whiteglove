"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCemetery } from "@/data/cemeteries";
import { deleteCemeteryContact, saveCemeteryContact } from "@/lib/content-admin";
import { isValidAccessToken } from "@/lib/secure-access";

export type ActionResult = { ok: boolean; message: string };

async function requireAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get("white_glove_admin")?.value;
  return isValidAccessToken("admin", cookie);
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveShomerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };

  const slug = str(formData, "slug");
  const label = str(formData, "label");
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const note = str(formData, "note");

  if (!slug) return { ok: false, message: "Choose a beis hachaim first." };
  if (!label) return { ok: false, message: "Give the contact a label, e.g. “Shomer”." };
  if (!phone && !email) {
    return { ok: false, message: "Enter a phone number or an email. To take a contact off the page, use Remove." };
  }

  // A built-in beis hachaim has no database row until something is saved
  // against it, so pass its details along for the stub row.
  const builtIn = getCemetery(slug);
  const fallback = {
    city: builtIn?.city ?? slug,
    yiddishCity: builtIn?.yiddishCity ?? slug,
    name: builtIn?.name ?? slug,
    yiddishName: builtIn?.yiddishName ?? slug,
    country: builtIn?.country ?? "",
  };

  try {
    await saveCemeteryContact(slug, fallback, { label, phone: phone || null, email: email || null, note: note || null });
  } catch (error) {
    console.error("[shomrim] save failed:", error);
    return { ok: false, message: "Could not save. Check the database connection and try again." };
  }

  revalidatePath(`/cemeteries/${slug}`);
  revalidatePath("/admin/shomrim");
  return { ok: true, message: `Saved. “${label}” now shows on the ${fallback.city} page.` };
}

export async function removeShomerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const id = str(formData, "id");
  const slug = str(formData, "slug");
  if (!id) return { ok: false, message: "Nothing to remove." };
  try {
    await deleteCemeteryContact(id);
  } catch (error) {
    console.error("[shomrim] remove failed:", error);
    return { ok: false, message: "Could not remove it. Try again." };
  }
  revalidatePath(`/cemeteries/${slug}`);
  revalidatePath("/admin/shomrim");
  return { ok: true, message: "Removed. Any built-in contact with that label is showing again." };
}

/**
 * Hide a built-in contact whose number no longer works, by storing an empty
 * one under the same label. The public page treats a contact with neither a
 * phone nor an email as retired.
 */
export async function retireShomerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  const label = str(formData, "label");
  if (!slug || !label) return { ok: false, message: "Nothing to retire." };

  const builtIn = getCemetery(slug);
  const fallback = {
    city: builtIn?.city ?? slug,
    yiddishCity: builtIn?.yiddishCity ?? slug,
    name: builtIn?.name ?? slug,
    yiddishName: builtIn?.yiddishName ?? slug,
    country: builtIn?.country ?? "",
  };

  try {
    await saveCemeteryContact(slug, fallback, { label, phone: null, email: null, note: "Retired — number no longer in service." });
  } catch (error) {
    console.error("[shomrim] retire failed:", error);
    return { ok: false, message: "Could not retire it. Try again." };
  }

  revalidatePath(`/cemeteries/${slug}`);
  revalidatePath("/admin/shomrim");
  return { ok: true, message: `“${label}” is now hidden on the ${fallback.city} page.` };
}
