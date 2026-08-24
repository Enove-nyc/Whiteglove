"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isValidAccessToken } from "@/lib/secure-access";
import { updateKosherStay, type NewStayFields } from "@/lib/content-admin";

export type ActionResult = { ok: boolean; message: string };

// Server Actions are reachable by direct POST, so re-check admin auth in every
// one — the middleware already gates /admin, this is defense in depth.
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

function lines(formData: FormData, key: string): string[] {
  return str(formData, key)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function refresh(slug: string) {
  // The public list is behind lib/attractions-view.ts's cache tag, which
  // updateKosherStay already busts — these are the pages that read it outside
  // that cache (force-dynamic admin screens, and the itinerary/stops pickers
  // that also read it through revalidatePath elsewhere in this admin).
  revalidatePath("/hotels");
  revalidatePath("/stops");
  revalidatePath("/itinerary");
  revalidatePath("/admin/directory/stays");
  revalidatePath(`/admin/directory/stays/${slug}/edit`);
}

export async function saveKosherStayAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  if (!slug) return { ok: false, message: "Which stay?" };

  const name = str(formData, "name");
  const city = str(formData, "city");
  const summary = str(formData, "summary");
  const anchorName = str(formData, "anchorName");
  const anchorCoords = str(formData, "anchorCoords");
  const sourceUrl = str(formData, "sourceUrl");
  if (!name) return { ok: false, message: "A name is required." };
  if (!city) return { ok: false, message: "A city is required." };
  if (!summary) return { ok: false, message: "Write one line saying what it is." };
  if (!anchorName || !anchorCoords) {
    // The anchor is the whole point of a stay entry: what it is near, and how
    // near. Without it the listing says nothing a booking site does not.
    return {
      ok: false,
      message:
        "Name the shul or quarter this is measured from, and give that place's coordinates — distances are measured from there, never from the hotel.",
    };
  }
  if (!/^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(anchorCoords)) {
    return { ok: false, message: "Coordinates should look like 41.8921, 12.4780." };
  }
  if (!sourceUrl) return { ok: false, message: "A source is required — where this listing came from." };

  const fields: NewStayFields = {
    name,
    city,
    country: str(formData, "country") || "—",
    kind: str(formData, "kind") || "Ordinary hotel, well placed",
    summary,
    anchorName,
    anchorCoords: anchorCoords.trim(),
    season: nullable(formData, "season"),
    kosherClaim: str(formData, "kosherClaim") || "none",
    website: nullable(formData, "website"),
    notes: lines(formData, "notes"),
    sourceUrl,
    onSiteKosherFood: str(formData, "onSiteKosherFood"),
    kosherBreakfast: str(formData, "kosherBreakfast"),
    shabbosMeals: str(formData, "shabbosMeals"),
    nearbyKosherFood: str(formData, "nearbyKosherFood"),
    nearbyShulOrMinyan: str(formData, "nearbyShulOrMinyan"),
    eruv: str(formData, "eruv"),
    shabbosAccessInfo: nullable(formData, "shabbosAccessInfo"),
    shabbosElevator: str(formData, "shabbosElevator"),
    kitchenSelfCatering: str(formData, "kitchenSelfCatering"),
    kosherKitchen: str(formData, "kosherKitchen"),
    walkingDistanceToJewishArea: str(formData, "walkingDistanceToJewishArea"),
  };

  try {
    await updateKosherStay(slug, fields);
    refresh(slug);
    return { ok: true, message: "Saved. It is on the site within a minute." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}
