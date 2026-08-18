"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isValidAccessToken } from "@/lib/secure-access";
import { slugify } from "@/lib/admin-content";
import {
  deleteVacationDestinationRow,
  saveVacationDestination,
  setVacationDestinationVisible,
  type VacationDestinationFields,
} from "@/lib/vacation-destinations-admin";
import { vacationDestinations } from "@/data/vacation-destinations";

export type ActionResult = { ok: boolean; message: string };

// Server Actions are reachable by direct POST, so re-check admin auth in every
// one — the middleware already gates /admin, this is defense in depth.
async function requireAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get("white_glove_admin")?.value;
  return isValidAccessToken("admin", cookie);
}

function refresh(slug: string) {
  revalidatePath(`/destinations/${slug}`);
  revalidatePath("/destinations");
  // The front page features destinations and the planner offers them as
  // starting points; both read the same list.
  revalidatePath("/");
  revalidatePath("/itinerary");
  revalidatePath("/admin/vacation-destinations");
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullable(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length ? value : null;
}

/**
 * A textarea holding one item per line.
 *
 * Lines rather than commas because these are sentences — "The Colosseum is
 * timed-entry and sells out in season." has a comma in it, and splitting on
 * that would cut the caution in half.
 */
function lines(formData: FormData, key: string): string[] {
  return str(formData, key)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** A comma-separated list of short names — cities, themes. No sentences here. */
function commas(formData: FormData, key: string): string[] {
  return str(formData, key)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function fieldsFrom(formData: FormData): VacationDestinationFields {
  return {
    name: nullable(formData, "name"),
    country: nullable(formData, "country"),
    region: nullable(formData, "region"),
    cities: commas(formData, "cities"),
    kosherBaseCities: commas(formData, "kosherBaseCities"),
    kosherBaseNote: nullable(formData, "kosherBaseNote"),
    themes: formData.getAll("themes").filter((value): value is string => typeof value === "string"),
    seasons: formData.getAll("seasons").filter((value): value is string => typeof value === "string"),
    whyGo: nullable(formData, "whyGo"),
    bestFor: commas(formData, "bestFor"),
    suggestedLength: nullable(formData, "suggestedLength"),
    overview: nullable(formData, "overview"),
    whyVisit: lines(formData, "whyVisit"),
    bestTime: nullable(formData, "bestTime"),
    suits: nullable(formData, "suits"),
    transport: nullable(formData, "transport"),
    outlineTitle: nullable(formData, "outlineTitle"),
    outlineDays: lines(formData, "outlineDays"),
    cautions: lines(formData, "cautions"),
  };
}

export async function saveDestinationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  if (!slug) return { ok: false, message: "Which destination?" };
  try {
    await saveVacationDestination(slug, fieldsFrom(formData));
    refresh(slug);
    return { ok: true, message: "Saved. It is on the site within a minute." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

/**
 * Add a destination the site did not ship with.
 *
 * A page cannot be rendered from nothing, so this asks for the four things
 * that decide whether it works at all: what it is called, where it is, which
 * towns it joins against, and one sentence saying why anybody would go. The
 * rest is filled in afterwards on the same screen as an edit.
 */
export async function createDestinationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const name = str(formData, "name");
  const country = str(formData, "country");
  const cities = commas(formData, "cities");
  const whyGo = str(formData, "whyGo");
  if (!name) return { ok: false, message: "Give it a name." };
  if (!country) return { ok: false, message: "Say which country it is in." };
  if (!cities.length) {
    return {
      ok: false,
      message: "Name at least one town. This is what the page joins your listings against — get it wrong and the page shows nothing.",
    };
  }
  if (!whyGo) return { ok: false, message: "One sentence on why somebody would go." };

  const slug = slugify(str(formData, "slug") || name);
  if (!slug) return { ok: false, message: "That name does not make a usable web address." };
  // A slug the file already uses would silently turn a new destination into an
  // edit of a shipped one, which is not what this form is for.
  if (vacationDestinations.some((destination) => destination.slug === slug)) {
    return { ok: false, message: `The site already has a destination at /destinations/${slug}. Edit that one instead.` };
  }

  try {
    await saveVacationDestination(slug, {
      name,
      country,
      region: nullable(formData, "region"),
      cities,
      kosherBaseCities: [],
      kosherBaseNote: null,
      themes: formData.getAll("themes").filter((value): value is string => typeof value === "string"),
      seasons: formData.getAll("seasons").filter((value): value is string => typeof value === "string"),
      whyGo,
      bestFor: [],
      suggestedLength: null,
      overview: nullable(formData, "overview"),
      whyVisit: [],
      bestTime: null,
      suits: null,
      transport: null,
      outlineTitle: null,
      outlineDays: [],
      cautions: [],
    });
    refresh(slug);
    return { ok: true, message: `Added. It is at /destinations/${slug}.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function setVisibleAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  const visible = str(formData, "visible") === "yes";
  if (!slug) return { ok: false, message: "Which destination?" };
  try {
    await setVacationDestinationVisible(slug, visible);
    refresh(slug);
    return { ok: true, message: visible ? "Back on the site." : "Taken off the site." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

/**
 * Undo every edit to a built-in destination, or delete one you added.
 *
 * The same button does both because it is the same row. What it means depends
 * on whether the site shipped with the destination, and the screen says which
 * before asking.
 */
export async function discardEditsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const slug = str(formData, "slug");
  if (!slug) return { ok: false, message: "Which destination?" };
  const builtIn = vacationDestinations.some((destination) => destination.slug === slug);
  try {
    await deleteVacationDestinationRow(slug);
    refresh(slug);
    return {
      ok: true,
      message: builtIn ? "Your changes are gone and the original text is back." : "Deleted.",
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}
