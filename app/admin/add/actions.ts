"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ContentStatus } from "@prisma/client";
import { createBurial, createCemetery, createInfoPage } from "@/lib/content-admin";
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

export async function addCemeteryAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const name = str(formData, "name");
  const city = str(formData, "city");
  if (!name) return { ok: false, message: "A cemetery name is required." };
  if (!city) return { ok: false, message: "A city is required." };
  try {
    await createCemetery({
      name,
      yiddishName: str(formData, "yiddishName"),
      city,
      yiddishCity: str(formData, "yiddishCity"),
      country: str(formData, "country") || "—",
      address: nullable(formData, "address"),
      coordinates: nullable(formData, "coordinates"),
      accessNote: nullable(formData, "accessNote"),
      sourceUrl: nullable(formData, "sourceUrl"),
    });
    revalidatePath("/cemeteries");
    revalidatePath("/admin/add");
    return { ok: true, message: `Added “${name}”. You can fill in more details anytime.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function addBurialAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const cemeteryId = str(formData, "cemeteryId");
  const name = str(formData, "name");
  if (!cemeteryId) return { ok: false, message: "Choose which cemetery this tzadik is in." };
  if (!name) return { ok: false, message: "A name is required." };
  try {
    await createBurial({
      cemeteryId,
      name,
      yiddishName: str(formData, "yiddishName"),
      knownAs: nullable(formData, "knownAs"),
      seforim: nullable(formData, "seforim"),
      yahrzeit: nullable(formData, "yahrzeit"),
      note: nullable(formData, "note"),
    });
    revalidatePath("/cemeteries");
    revalidatePath("/admin/add");
    return { ok: true, message: `Added “${name}”.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function addInfoPageAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const title = str(formData, "title");
  if (!title) return { ok: false, message: "A page title is required." };
  try {
    const page = await createInfoPage({
      title,
      body: str(formData, "body"),
      status: (str(formData, "status") as ContentStatus) || "PUBLISHED",
    });
    revalidatePath("/admin/add");
    revalidatePath(`/info/${page.slug}`);
    return { ok: true, message: `Created “${title}” at /info/${page.slug}.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}
