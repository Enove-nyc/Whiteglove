"use server";

import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { eruvFromInput, eruvProblem, type EruvInput } from "@/lib/eruvin";
import { addStoredEruv, eruvinStoreAvailable, removeStoredEruv } from "@/lib/eruvin-store";

export type ActionResult = { ok: boolean; message: string };

// A server action is its own door — checked here as well as by the layout's
// AreaGate, because anything that knows its name can call it.
async function gate(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "directory")) return { ok: false, message: "Your sign-in does not cover the directory." };
  if (!eruvinStoreAvailable()) return { ok: false, message: "This needs the private store connected before an eruv can be saved." };
  return null;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function addEruvAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return denied;

  const input: EruvInput = {
    name: str(formData, "name"),
    city: str(formData, "city"),
    country: str(formData, "country"),
    covers: str(formData, "covers") || null,
    sourceUrl: str(formData, "sourceUrl"),
    mapUrl: str(formData, "mapUrl") || null,
  };
  const problem = eruvProblem(input);
  if (problem) return { ok: false, message: problem };

  // Editing keeps the entry's own id, so a change is an update in place rather
  // than a second copy; adding lets eruvFromInput derive a fresh one.
  const id = str(formData, "id");
  const listing = eruvFromInput(input);
  if (id) listing.id = id;
  if (!(await addStoredEruv(listing))) return { ok: false, message: "That could not be saved." };
  return { ok: true, message: id ? `Saved the ${input.name}.` : `Added the ${input.name}. It is on the eruvin page now.` };
}

export async function removeEruvAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return denied;

  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Nothing to remove." };
  if (!(await removeStoredEruv(id))) return { ok: false, message: "That could not be removed." };
  return { ok: true, message: "Removed." };
}
