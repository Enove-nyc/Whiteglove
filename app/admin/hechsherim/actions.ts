"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { HechsherState } from "@/data/hechsherim";
import { agencyIdFrom, clearHechsher, deleteAgency, saveAgency, saveHechsher } from "@/lib/hechsher-store";
import { isValidAccessToken } from "@/lib/secure-access";

export type ActionResult = { ok: boolean; message: string };

async function requireAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get("white_glove_admin")?.value;
  return isValidAccessToken("admin", cookie);
}

const STATES: HechsherState[] = ["certified", "reported", "none", "unverified"];

/** Record what the owner checked about one place's hechsher. */
export async function saveHechsherAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };

  const placeId = String(formData.get("placeId") ?? "").trim();
  const raw = String(formData.get("state") ?? "");
  const state = (STATES as string[]).includes(raw) ? (raw as HechsherState) : "unverified";

  const result = await saveHechsher(placeId, {
    state,
    hechsherId: String(formData.get("hechsherId") ?? "").trim() || undefined,
    note: String(formData.get("note") ?? "").trim() || undefined,
    source: String(formData.get("source") ?? "").trim() || undefined,
    placeName: String(formData.get("placeName") ?? "").trim() || undefined,
    placeAddress: String(formData.get("placeAddress") ?? "").trim() || undefined,
  });

  if (result.ok) revalidatePath("/admin/hechsherim");
  return result;
}

/** Put a place back to unverified. */
export async function clearHechsherAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const placeId = String(formData.get("placeId") ?? "").trim();
  if (!placeId) return { ok: false, message: "No place to clear." };
  const ok = await clearHechsher(placeId);
  if (ok) revalidatePath("/admin/hechsherim");
  return ok
    ? { ok: true, message: "Back to unverified." }
    : { ok: false, message: "Could not clear it. Is the private store connected?" };
}

/** Add a hechsher to the list, or change one — including uploading its mark. */
export async function saveAgencyAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };

  const name = String(formData.get("name") ?? "").trim();
  // An existing agency is edited by its id; a new one takes an id from its name.
  const id = String(formData.get("id") ?? "").trim() || agencyIdFrom(name);
  if (!id) return { ok: false, message: "Give it a name first." };

  const aliases = String(formData.get("aliases") ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);

  const result = await saveAgency({
    id,
    name: name || undefined,
    mark: String(formData.get("mark") ?? "").trim() || undefined,
    region: String(formData.get("region") ?? "").trim() || undefined,
    aliases: aliases.length ? aliases : undefined,
    logo: String(formData.get("logo") ?? "").trim() || undefined,
  });

  if (result.ok) revalidatePath("/admin/hechsherim");
  return result;
}

/** Remove an added hechsher, or the changes made to a built-in one. */
export async function deleteAgencyAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Which one?" };
  const ok = await deleteAgency(id);
  if (ok) revalidatePath("/admin/hechsherim");
  return ok
    ? { ok: true, message: "Removed. Places already marked with it keep their record." }
    : { ok: false, message: "Could not remove it. Is the private store connected?" };
}
