"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { removeTeamMember, saveTeamMember } from "@/lib/admin-roles";
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

export async function saveTeamMemberAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };

  const admin = formData.get("admin") === "on";
  const siteAccess = formData.get("siteAccess") === "on";
  if (!admin && !siteAccess) {
    return { ok: false, message: "Choose what this person may do — see the site, run the admin area, or both." };
  }

  const result = await saveTeamMember({
    email: str(formData, "email"),
    name: str(formData, "name") || undefined,
    note: str(formData, "note") || undefined,
    admin,
    siteAccess,
  });
  if (result.ok) revalidatePath("/admin/team");
  return result;
}

export async function removeTeamMemberAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const result = await removeTeamMember(str(formData, "email"));
  if (result.ok) revalidatePath("/admin/team");
  return result;
}
