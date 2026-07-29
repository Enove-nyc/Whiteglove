"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { HechsherState } from "@/data/hechsherim";
import { clearHechsher, saveHechsher } from "@/lib/hechsher-store";
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
