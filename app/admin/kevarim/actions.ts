"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCemetery } from "@/data/cemeteries";
import { createCemeteryWithBurial, deleteCemeteryBurial, saveCemeteryBurial } from "@/lib/content-admin";
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

function burialFrom(formData: FormData) {
  return {
    name: str(formData, "name"),
    yiddishName: str(formData, "yiddishName"),
    knownAs: nullable(formData, "knownAs"),
    seforim: nullable(formData, "seforim"),
    yahrzeit: nullable(formData, "yahrzeit"),
    note: nullable(formData, "note"),
  };
}

/**
 * A built-in beis hachaim has no database row until something is saved against
 * it, so its details travel along to fill the stub row.
 */
function fallbackFor(slug: string) {
  const builtIn = getCemetery(slug);
  return {
    city: builtIn?.city ?? slug,
    yiddishCity: builtIn?.yiddishCity ?? slug,
    name: builtIn?.name ?? slug,
    yiddishName: builtIn?.yiddishName ?? slug,
    country: builtIn?.country ?? "",
  };
}

/** Add a person to a beis hachaim that is already on the site. */
export async function addPersonToCemeteryAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };

  const slug = str(formData, "slug");
  const burial = burialFrom(formData);
  if (!slug) return { ok: false, message: "Choose which beis hachaim he is buried in." };
  if (!burial.name) return { ok: false, message: "Enter the name." };

  const fallback = fallbackFor(slug);
  try {
    await saveCemeteryBurial(slug, fallback, burial);
  } catch (error) {
    console.error("[kevarim] add person failed:", error);
    return { ok: false, message: "Could not save. Check the database connection and try again." };
  }

  revalidatePath(`/cemeteries/${slug}`);
  revalidatePath("/cemeteries");
  revalidatePath("/admin/kevarim");
  return { ok: true, message: `Saved. ${burial.name} now shows on the ${fallback.city} page.` };
}

/** The other direction: a person whose beis hachaim isn't on the site yet. */
export async function addCemeteryForPersonAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };

  const burial = burialFrom(formData);
  const city = str(formData, "city");
  const cemeteryName = str(formData, "cemeteryName");
  if (!burial.name) return { ok: false, message: "Enter the name." };
  if (!city) return { ok: false, message: "Enter the town he is buried in." };

  try {
    const created = await createCemeteryWithBurial(
      {
        // Naming the site after the town is what a traveler reads on the
        // directory, and it is what they will search for.
        name: cemeteryName || `${city} — Jewish cemetery`,
        yiddishName: str(formData, "cemeteryYiddishName"),
        city,
        yiddishCity: str(formData, "yiddishCity"),
        country: str(formData, "country") || "—",
        address: nullable(formData, "address"),
        coordinates: nullable(formData, "coordinates"),
        accessNote: nullable(formData, "accessNote"),
        sourceUrl: nullable(formData, "sourceUrl"),
      },
      burial,
    );
    revalidatePath("/cemeteries");
    revalidatePath(`/cemeteries/${created.slug}`);
    revalidatePath("/admin/kevarim");
    return { ok: true, message: `Added ${burial.name} at ${created.city}. Open /cemeteries/${created.slug} to see it.` };
  } catch (error) {
    console.error("[kevarim] add cemetery for person failed:", error);
    return { ok: false, message: "Could not save. Check the database connection and try again." };
  }
}

/** Remove a person you added. Built-in burials live in code and are untouched. */
export async function removePersonAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const id = str(formData, "id");
  const slug = str(formData, "slug");
  if (!id) return { ok: false, message: "Nothing to remove." };
  try {
    await deleteCemeteryBurial(id);
  } catch (error) {
    console.error("[kevarim] remove person failed:", error);
    return { ok: false, message: "Could not remove him. Try again." };
  }
  revalidatePath(`/cemeteries/${slug}`);
  revalidatePath("/cemeteries");
  revalidatePath("/admin/kevarim");
  return { ok: true, message: "Removed." };
}
