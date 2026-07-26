"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ContentStatus, PlaceCategory } from "@prisma/client";
import { isValidAccessToken } from "@/lib/secure-access";
import {
  createContact,
  createPlace,
  deleteContact,
  deletePlace,
  updateContact,
  updateDestinationFields,
  updatePlace,
} from "@/lib/content-admin";

export type ActionResult = { ok: boolean; message: string };

// Server Actions are reachable by direct POST, so re-check admin auth in every
// one (middleware already gates /admin, this is defense in depth).
async function requireAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get("white_glove_admin")?.value;
  return isValidAccessToken("admin", cookie);
}

// Refresh both possible public routes for this slug (whichever exists) plus
// the editor itself. A revalidatePath on a route that doesn't match is a no-op.
function revalidateDestination(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath(`/destinations/${slug}`);
  revalidatePath("/admin/destinations");
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullable(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length ? value : null;
}

function fail(error: unknown): ActionResult {
  return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
}

export async function saveDestinationAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  const city = str(formData, "city");
  if (!slug) return { ok: false, message: "Missing destination." };
  if (!city) return { ok: false, message: "City name is required." };
  try {
    await updateDestinationFields(slug, {
      city,
      yiddishCity: str(formData, "yiddishCity"),
      country: str(formData, "country"),
      overview: nullable(formData, "overview"),
      summary: nullable(formData, "summary"),
      safetyNote: nullable(formData, "safetyNote"),
      status: (str(formData, "status") as ContentStatus) || "PUBLISHED",
    });
    revalidateDestination(slug);
    return { ok: true, message: "Destination details saved." };
  } catch (error) {
    return fail(error);
  }
}

export async function savePlaceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  const destinationId = str(formData, "destinationId");
  const placeId = str(formData, "placeId");
  const name = str(formData, "name");
  if (!name) return { ok: false, message: "A name is required." };
  const fields = {
    category: (str(formData, "category") as PlaceCategory) || "ACCOMMODATION",
    name,
    address: nullable(formData, "address"),
    phone: nullable(formData, "phone"),
    whatsapp: nullable(formData, "whatsapp"),
    email: nullable(formData, "email"),
    website: nullable(formData, "website"),
    hours: nullable(formData, "hours"),
    notes: nullable(formData, "notes"),
    status: (str(formData, "status") as ContentStatus) || "PUBLISHED",
  };
  try {
    if (placeId) {
      await updatePlace(placeId, fields);
    } else {
      if (!destinationId) return { ok: false, message: "Missing destination." };
      await createPlace(destinationId, fields);
    }
    revalidateDestination(slug);
    return { ok: true, message: placeId ? "Listing updated." : "Listing added." };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePlaceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const placeId = str(formData, "placeId");
  const slug = str(formData, "slug");
  if (!placeId) return { ok: false, message: "Missing listing." };
  try {
    await deletePlace(placeId);
    revalidateDestination(slug);
    return { ok: true, message: "Listing removed." };
  } catch (error) {
    return fail(error);
  }
}

export async function saveContactAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  const destinationId = str(formData, "destinationId");
  const contactId = str(formData, "contactId");
  const label = str(formData, "label");
  if (!label) return { ok: false, message: "A label is required (e.g. “Shomer”)." };
  const fields = {
    label,
    phone: nullable(formData, "phone"),
    email: nullable(formData, "email"),
    note: nullable(formData, "note"),
  };
  try {
    if (contactId) {
      await updateContact(contactId, fields);
    } else {
      if (!destinationId) return { ok: false, message: "Missing destination." };
      await createContact(destinationId, fields);
    }
    revalidateDestination(slug);
    return { ok: true, message: contactId ? "Contact updated." : "Contact added." };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteContactAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const contactId = str(formData, "contactId");
  const slug = str(formData, "slug");
  if (!contactId) return { ok: false, message: "Missing contact." };
  try {
    await deleteContact(contactId);
    revalidateDestination(slug);
    return { ok: true, message: "Contact removed." };
  } catch (error) {
    return fail(error);
  }
}
