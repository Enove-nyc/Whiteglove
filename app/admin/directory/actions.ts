"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ContentStatus, ProviderCategory } from "@prisma/client";
import { createProvider, deleteProvider, updateProvider } from "@/lib/content-admin";
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

function nullable(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length ? value : null;
}

// Split a comma- or newline-separated field into a clean string[].
function list(formData: FormData, key: string): string[] {
  return str(formData, key)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const CATEGORIES = ["TOUR_OPERATOR", "VACATION_PLANNER", "TRAVEL_AGENCY", "GUIDE_DRIVER"];

function revalidateDirectory() {
  revalidatePath("/directory");
  revalidatePath("/admin/directory");
}

export async function saveProviderAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  const name = str(formData, "name");
  if (!name) return { ok: false, message: "A business name is required." };
  const categoryValue = str(formData, "category");
  const category = (CATEGORIES.includes(categoryValue) ? categoryValue : "TOUR_OPERATOR") as ProviderCategory;
  const fields = {
    name,
    category,
    tagline: nullable(formData, "tagline"),
    description: nullable(formData, "description"),
    phone: nullable(formData, "phone"),
    whatsapp: nullable(formData, "whatsapp"),
    email: nullable(formData, "email"),
    website: nullable(formData, "website"),
    basedIn: nullable(formData, "basedIn"),
    regions: list(formData, "regions"),
    languages: list(formData, "languages"),
    specialties: list(formData, "specialties"),
    featured: str(formData, "featured") === "on",
    status: (str(formData, "status") as ContentStatus) || "PUBLISHED",
  };
  try {
    if (slug) {
      await updateProvider(slug, fields);
    } else {
      await createProvider(fields);
    }
    revalidateDirectory();
    return { ok: true, message: slug ? "Provider updated." : "Provider added." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function deleteProviderAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  if (!slug) return { ok: false, message: "Missing provider." };
  try {
    await deleteProvider(slug);
    revalidateDirectory();
    return { ok: true, message: "Provider removed." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}
