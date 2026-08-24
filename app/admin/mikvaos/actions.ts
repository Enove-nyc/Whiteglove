"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ContentStatus } from "@prisma/client";
import { isValidAccessToken } from "@/lib/secure-access";
import { deletePlace, isDbEnabled, updatePlace, type PlaceFields } from "@/lib/content-admin";

export type ActionResult = { ok: boolean; message: string };

// A server action is its own door — checked here as well as by the layout's
// gate, because anything that knows its name can POST to it.
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

const STATUSES: ContentStatus[] = ["PUBLISHED", "DRAFT", "NEEDS_REVIEW"];

function revalidate() {
  revalidatePath("/admin/mikvaos");
  revalidatePath("/mikvaos");
}

/**
 * Edit one mikvah in place.
 *
 * A mikvah is a PracticalPlace row (category MIKVAH), so it belongs to a town
 * and cannot be created from this screen — only the ones already in the
 * database are editable here. The seed catalog lives in code and its rows are
 * opened in their town editor instead.
 *
 * The row is read first so the fields this short form does not show — the
 * listing's category, its whatsapp and email, and how far it has been checked
 * (verification / lastVerified) — are carried through unchanged rather than
 * blanked. A quick edit to the hours must not quietly un-verify a listing or
 * wipe a WhatsApp number the form never displayed.
 */
export async function saveMikvahAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  if (!isDbEnabled()) return { ok: false, message: "The content database is not connected, so nothing here can be saved yet." };

  const placeId = str(formData, "placeId");
  if (!placeId) return { ok: false, message: "Missing listing." };
  const name = str(formData, "name");
  if (!name) return { ok: false, message: "A name is required." };

  const status = (STATUSES.includes(str(formData, "status") as ContentStatus)
    ? (str(formData, "status") as ContentStatus)
    : "PUBLISHED") satisfies ContentStatus;

  try {
    const { prisma } = await import("@/lib/prisma");
    const existing = await prisma.practicalPlace.findUnique({ where: { id: placeId } });
    if (!existing) return { ok: false, message: "That listing could not be found." };
    if (existing.category !== "MIKVAH") return { ok: false, message: "That listing is not a mikvah." };

    const fields: PlaceFields = {
      category: existing.category,
      name,
      address: nullable(formData, "address"),
      phone: nullable(formData, "phone"),
      // Kept from the row — this short form does not show them, and null would erase them.
      whatsapp: existing.whatsapp,
      email: existing.email,
      website: nullable(formData, "website"),
      hours: nullable(formData, "hours"),
      notes: nullable(formData, "notes"),
      status,
      // How far the listing has been checked is a separate decision, made in the
      // town editor. Carry it through untouched.
      verification: existing.verification,
      sourceUrl: nullable(formData, "sourceUrl"),
      lastVerified: existing.lastVerified,
    };
    await updatePlace(placeId, fields);
    revalidate();
    return { ok: true, message: `Saved ${name}.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function deleteMikvahAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  if (!isDbEnabled()) return { ok: false, message: "The content database is not connected." };

  const placeId = str(formData, "placeId");
  if (!placeId) return { ok: false, message: "Missing listing." };
  try {
    await deletePlace(placeId);
    revalidate();
    return { ok: true, message: "Removed." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}
