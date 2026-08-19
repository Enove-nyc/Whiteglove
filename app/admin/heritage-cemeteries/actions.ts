"use server";

import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { heritageFromInput, heritageProblem, type HeritageInput } from "@/lib/heritage-cemeteries";
import { addStoredHeritageCemetery, heritageStoreAvailable, removeStoredHeritageCemetery } from "@/lib/heritage-cemeteries-store";

export type ActionResult = { ok: boolean; message: string };

// A server action is its own door — checked here as well as by the layout's
// AreaGate, because anything that knows its name can call it.
async function gate(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "directory")) return { ok: false, message: "Your sign-in does not cover the directory." };
  if (!heritageStoreAvailable()) return { ok: false, message: "This needs the private store connected before an entry can be saved." };
  return null;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function addHeritageAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return denied;

  const input: HeritageInput = {
    name: str(formData, "name"),
    city: str(formData, "city"),
    country: str(formData, "country"),
    address: str(formData, "address") || null,
    coordinates: str(formData, "coordinates"),
    sourceUrl: str(formData, "sourceUrl"),
  };
  const problem = heritageProblem(input);
  if (problem) return { ok: false, message: problem };

  if (!(await addStoredHeritageCemetery(heritageFromInput(input)))) return { ok: false, message: "That could not be saved." };
  return { ok: true, message: `Added ${input.name}. It is on the map and in the locator now.` };
}

export async function removeHeritageAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return denied;

  const slug = str(formData, "slug");
  if (!slug) return { ok: false, message: "Nothing to remove." };
  if (!(await removeStoredHeritageCemetery(slug))) return { ok: false, message: "That could not be removed." };
  return { ok: true, message: "Removed." };
}
