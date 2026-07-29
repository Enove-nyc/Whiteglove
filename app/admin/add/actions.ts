"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ContentStatus } from "@prisma/client";
import { createAttraction, createCemetery, createInfoPage, createKosherStay } from "@/lib/content-admin";
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

/**
 * Everything an entry has to touch to count as added.
 *
 * A new attraction or stay is stored once and read everywhere through
 * lib/attractions-view.ts, but Next caches the pages that do the reading. These
 * are the paths that show one — its own directory, the search that finds it,
 * and the planner that puts it on a day — so the entry is live on all of them
 * the moment it is saved rather than whenever the cache next turns over.
 */
function revalidateTripContent(kind: "attraction" | "stay") {
  revalidatePath(kind === "attraction" ? "/attractions" : "/kosher-stays");
  revalidatePath("/stops");
  revalidatePath("/itinerary");
  revalidatePath("/admin/add");
}

/** Multi-line textarea → one note per line, blanks dropped. */
function lines(formData: FormData, key: string): string[] {
  return str(formData, key)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function addAttractionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const name = str(formData, "name");
  const city = str(formData, "city");
  const summary = str(formData, "summary");
  const sourceUrl = str(formData, "sourceUrl");
  if (!name) return { ok: false, message: "A name is required." };
  if (!city) return { ok: false, message: "A city is required." };
  if (!summary) return { ok: false, message: "Write one line saying what it is — that line is what people read in the search results." };
  // Same rule as everywhere else on the site: nothing is published without
  // saying where it came from.
  if (!sourceUrl) return { ok: false, message: "A source is required — the official site or the page this came from." };
  try {
    await createAttraction({
      name,
      city,
      country: str(formData, "country") || "—",
      kind: str(formData, "kind") || "Landmark",
      summary,
      address: nullable(formData, "address"),
      coordinates: nullable(formData, "coordinates"),
      website: nullable(formData, "website"),
      shabbos: nullable(formData, "shabbos"),
      notes: lines(formData, "notes"),
      sourceUrl,
    });
    revalidateTripContent("attraction");
    return { ok: true, message: `Added “${name}”. It is in the things-to-do list, the search and the planner now.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function addKosherStayAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
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
    return { ok: false, message: "Name the shul or quarter this is measured from, and give that place's coordinates — distances are measured from there, never from the hotel." };
  }
  if (!/^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(anchorCoords)) {
    return { ok: false, message: "Coordinates should look like 41.8921, 12.4780." };
  }
  if (!sourceUrl) return { ok: false, message: "A source is required — where this listing came from." };
  try {
    await createKosherStay({
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
    });
    revalidateTripContent("stay");
    return { ok: true, message: `Added “${name}”. It is in the where-to-stay list, the search and the hotel picker now.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}
