"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { listTeam, removeTeamMember, saveTeamMember } from "@/lib/admin-roles";
import { recordAdminAction } from "@/lib/admin-actions-store";
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

  const areas = formData.getAll("areas").filter((value): value is string => typeof value === "string");
  // Every box unticked is not a grant of nothing — it is a grant with no
  // meaning, and storing it would silently hand them everything. Say so
  // instead.
  if (admin && areas.length === 0) {
    return { ok: false, message: "Choose at least one part of the admin for them, or untick “run the admin area”." };
  }

  const email = str(formData, "email");
  // Read BEFORE the write, so a new grant and a changed one can be told apart.
  // "gave somebody the finances" and "adjusted what they already had" are
  // different lines, and afterwards they look identical.
  const existed = (await listTeam()).some((member) => member.email === email.trim().toLowerCase());

  const result = await saveTeamMember({
    email,
    name: str(formData, "name") || undefined,
    note: str(formData, "note") || undefined,
    admin,
    areas,
    siteAccess,
  });
  if (result.ok) {
    await recordAdminAction({
      kind: existed ? "access-changed" : "access-granted",
      subject: email,
      detail: [admin ? `admin: ${areas.join(", ") || "everything"}` : null, siteAccess ? "can see the closed site" : null]
        .filter(Boolean)
        .join(" · "),
    });
    revalidatePath("/admin/team");
  }
  return result;
}

export async function removeTeamMemberAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const email = str(formData, "email");
  const result = await removeTeamMember(email);
  if (result.ok) {
    await recordAdminAction({ kind: "access-removed", subject: email });
    revalidatePath("/admin/team");
  }
  return result;
}
