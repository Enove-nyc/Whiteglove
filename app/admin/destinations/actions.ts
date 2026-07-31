"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ContentStatus, PlaceCategory, VerificationStatus } from "@prisma/client";
import { getCemetery } from "@/data/cemeteries";
import { isPhotoOwnerKind, pathsToRefresh, photoDecision, type PhotoOwnerKind } from "@/lib/photos";
import { isValidAccessToken } from "@/lib/secure-access";
import {
  cemeteryPhotoOwner,
  createPhoto,
  deletePhoto,
  updatePhoto,
  type PhotoOwner,
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

/** The pages a picture could have changed — see pathsToRefresh for which and why. */
function revalidatePhoto(ownerKind: string, slug: string) {
  for (const path of pathsToRefresh(ownerKind, slug)) revalidatePath(path);
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

/** A date box left blank is no date, not the epoch. */
function dateOrNull(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(`${trimmed}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A photo may not be published without a credit.
 *
 * Enforced here as well as on the screen, because the screen can be skipped.
 * A picture nobody can say where it came from is one the site cannot defend
 * publishing, and the safe direction for that is a draft, not a refusal —
 * upload it, find out whose it is, then publish.
 */
export async function savePhotoAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  const photoId = str(formData, "photoId");
  const url = str(formData, "url");
  // Which of the three this belongs to, sent by the screen. One only.
  const ownerKind = str(formData, "ownerKind");
  const ownerRef = str(formData, "ownerRef");
  const credit = nullable(formData, "credit");
  const { status, message } = photoDecision(str(formData, "status"), credit, !photoId);
  const fields = { caption: nullable(formData, "caption"), credit, sourceUrl: nullable(formData, "sourceUrl"), status };
  try {
    if (photoId) {
      await updatePhoto(photoId, fields);
    } else {
      if (!ownerRef || !isPhotoOwnerKind(ownerKind)) {
        return { ok: false, message: "Missing what this picture is of." };
      }
      if (!url) return { ok: false, message: "Choose a picture first." };
      await createPhoto(await photoOwner(ownerKind, ownerRef), { ...fields, url });
    }
    revalidatePhoto(ownerKind, slug);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

/**
 * What a picture is of, from what the screen sent.
 *
 * A destination and a listing arrive as database ids. A beis hachaim arrives
 * as a SLUG, because the built-in ones have no row until something is saved
 * against them — so the first picture of Lizhensk makes the row, carrying the
 * town's details across from the built-in record to fill it.
 */
async function photoOwner(kind: PhotoOwnerKind, ref: string): Promise<PhotoOwner> {
  if (kind !== "cemetery") return { kind, id: ref };
  const builtIn = getCemetery(ref);
  return cemeteryPhotoOwner(ref, {
    city: builtIn?.city ?? ref,
    yiddishCity: builtIn?.yiddishCity ?? ref,
    name: builtIn?.name ?? ref,
    yiddishName: builtIn?.yiddishName ?? ref,
    country: builtIn?.country ?? "",
  });
}

export async function deletePhotoAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const id = str(formData, "photoId");
  if (!id) return { ok: false, message: "Missing picture." };
  try {
    await deletePhoto(id);
    revalidatePhoto(str(formData, "ownerKind"), str(formData, "slug"));
    return { ok: true, message: "Picture removed." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
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
    // How far this one listing has been checked, and where it came from.
    // Per listing rather than per page, because the sections of a destination
    // are checked separately and at different times.
    verification: (str(formData, "verification") as VerificationStatus) || "NEEDS_VERIFICATION",
    sourceUrl: nullable(formData, "sourceUrl"),
    lastVerified: dateOrNull(str(formData, "lastVerified")),
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
