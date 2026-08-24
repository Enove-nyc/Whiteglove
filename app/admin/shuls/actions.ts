"use server";

import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { shulFromInput, shulProblem, type ShulInput } from "@/lib/shuls";
import { addStoredShul, removeStoredShul, shulsStoreAvailable } from "@/lib/shuls-store";

export type ActionResult = { ok: boolean; message: string };

// A server action is its own door — checked here as well as by the layout's
// AreaGate, because anything that knows its name can call it.
async function gate(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "directory")) return { ok: false, message: "Your sign-in does not cover the directory." };
  if (!shulsStoreAvailable()) return { ok: false, message: "This needs the private store connected before a shul can be saved." };
  return null;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function addShulAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return denied;

  const input: ShulInput = {
    name: str(formData, "name"),
    city: str(formData, "city"),
    country: str(formData, "country"),
    address: str(formData, "address") || null,
    phone: str(formData, "phone") || null,
    website: str(formData, "website") || null,
    notes: str(formData, "notes") || null,
    coordinates: str(formData, "coordinates") || null,
    sourceUrl: str(formData, "sourceUrl"),
  };
  const problem = shulProblem(input);
  if (problem) return { ok: false, message: problem };

  // Editing keeps the entry's own id, so a change is an update in place.
  const id = str(formData, "id");
  const listing = shulFromInput(input);
  if (id) listing.id = id;
  if (!(await addStoredShul(listing))) return { ok: false, message: "That could not be saved." };
  return {
    ok: true,
    message: id
      ? `Saved ${input.name}.`
      : `Added ${input.name}. It is on the shuls page now${input.coordinates ? ", and on the map" : ""}.`,
  };
}

export async function removeShulAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return denied;

  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Nothing to remove." };
  if (!(await removeStoredShul(id))) return { ok: false, message: "That could not be removed." };
  return { ok: true, message: "Removed." };
}
