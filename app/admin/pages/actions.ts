"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ContentStatus } from "@prisma/client";
import { getPageDef } from "@/data/pages";
import { upsertPage } from "@/lib/content-admin";
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

export async function savePageAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  if (!slug || !getPageDef(slug)) return { ok: false, message: "Unknown page." };
  const title = str(formData, "title");
  if (!title) return { ok: false, message: "A heading is required." };
  const body = str(formData, "body");
  const status = (str(formData, "status") as ContentStatus) || "PUBLISHED";
  try {
    await upsertPage(slug, { title, body, status });
    // Refresh the public page and the admin editor.
    revalidatePath(`/${slug}`);
    revalidatePath("/admin/pages");
    return { ok: true, message: "Page saved. Changes are live within a minute." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}
