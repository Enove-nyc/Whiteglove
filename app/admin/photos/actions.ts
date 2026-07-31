"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { deletePhoto, updatePhoto } from "@/lib/content-admin";
import { pathsToRefresh } from "@/lib/photos";
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

function refresh(formData: FormData) {
  const kind = str(formData, "ownerKind");
  const slug = str(formData, "slug");
  if (slug) for (const path of pathsToRefresh(kind, slug)) revalidatePath(path);
  revalidatePath("/admin/photos");
}

/**
 * Put a visitor's picture on the site.
 *
 * This is the confirmation the owner asked for, and it is the only thing that
 * can make a submitted picture public — the endpoint that takes them can only
 * ever write a draft. The caption and credit are saved with it, because the
 * owner will often want to tidy a stranger's wording before it goes up.
 *
 * A credit is still required. A picture somebody sent in is exactly the kind
 * the site can least afford to publish uncredited.
 */
export async function publishSubmissionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const id = str(formData, "photoId");
  const credit = str(formData, "credit");
  if (!id) return { ok: false, message: "Missing picture." };
  if (!credit) return { ok: false, message: "A picture needs a credit before it goes on the site." };
  try {
    await updatePhoto(id, {
      caption: str(formData, "caption") || null,
      credit,
      sourceUrl: str(formData, "sourceUrl") || null,
      status: "PUBLISHED",
    });
    refresh(formData);
    return { ok: true, message: "On the site." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

/**
 * Turn one down.
 *
 * Deleting rather than marking it declined, on purpose. Keeping a stranger's
 * unwanted photograph on the server indefinitely is the opposite of what
 * turning it down means, and a queue that fills with things already decided
 * stops being a queue. The owner writes back from the screen before pressing
 * this, using their own mail.
 */
export async function declineSubmissionAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const id = str(formData, "photoId");
  if (!id) return { ok: false, message: "Missing picture." };
  try {
    await deletePhoto(id);
    refresh(formData);
    return { ok: true, message: "Turned down and removed." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}
