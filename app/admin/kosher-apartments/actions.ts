"use server";

import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { apartmentFromInput, apartmentProblem, type ApartmentInput } from "@/lib/kosher-apartments";
import { addStoredApartment, apartmentsStoreAvailable, removeStoredApartment } from "@/lib/kosher-apartments-store";

export type ActionResult = { ok: boolean; message: string };

// A server action is its own door — checked here as well as by the layout's
// AreaGate, because anything that knows its name can call it.
async function gate(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "directory")) return { ok: false, message: "Your sign-in does not cover the directory." };
  if (!apartmentsStoreAvailable()) return { ok: false, message: "This needs the private store connected before a provider can be saved." };
  return null;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function addApartmentAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return denied;

  const input: ApartmentInput = {
    name: str(formData, "name"),
    area: str(formData, "area"),
    note: str(formData, "note") || null,
    url: str(formData, "url") || null,
    phone: str(formData, "phone") || null,
    whatsapp: str(formData, "whatsapp") || null,
  };
  const problem = apartmentProblem(input);
  if (problem) return { ok: false, message: problem };

  if (!(await addStoredApartment(apartmentFromInput(input)))) return { ok: false, message: "That could not be saved." };
  return { ok: true, message: `Added ${input.name}. It is on the Where to stay page now.` };
}

export async function removeApartmentAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return denied;

  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Nothing to remove." };
  if (!(await removeStoredApartment(id))) return { ok: false, message: "That could not be removed." };
  return { ok: true, message: "Removed." };
}
