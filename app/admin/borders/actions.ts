"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { type CrossingState, crossingIdFrom, crossingProblem } from "@/lib/border-crossings";
import { clearCrossing, saveCrossing } from "@/lib/border-store";
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

function isState(value: string): value is CrossingState {
  return value === "open" || value === "slow" || value === "closed";
}

export async function saveCrossingAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };

  const added = formData.get("added") === "1";
  const name = str(formData, "name");
  const id = added ? crossingIdFrom(name) : str(formData, "id");
  if (!id) return { ok: false, message: "That needs a name." };

  const rawState = str(formData, "state");
  const state = isState(rawState) ? rawState : undefined;
  const checkedAt = str(formData, "checkedAt");
  const countries: [string, string] = [str(formData, "countryA"), str(formData, "countryB")];
  const towns: [string, string] = [str(formData, "townA"), str(formData, "townB")];

  const problem = crossingProblem({ name, countries, towns, state, checkedAt, added });
  if (problem) return { ok: false, message: problem };

  // A note left exactly as it was found is not an edit. Storing it anyway
  // would turn the wording that ships with the site into the owner's own
  // frozen copy of it, every time somebody wrote down a queue length.
  const note = str(formData, "note");
  const noteChanged = added || note !== str(formData, "noteWas");

  const result = await saveCrossing({
    id,
    ...(added ? { name, countries, towns } : {}),
    ...(added ? { road: str(formData, "road") || undefined } : {}),
    ...(added ? { coaches: formData.get("coaches") === "on" } : {}),
    ...(added ? { pedestrians: formData.get("pedestrians") === "on" } : {}),
    ...(noteChanged ? { note } : {}),
    state,
    // A wait with no state is a leftover from a previous check, and quoting it
    // on its own would be the stale number this whole feature avoids.
    wait: state ? str(formData, "wait") || undefined : undefined,
    checkedAt: state ? checkedAt : undefined,
    hidden: formData.get("hidden") === "on" ? true : undefined,
  });

  if (!result.ok) return result;
  revalidatePath("/admin/borders");
  revalidatePath("/my-route");
  // Named from what was submitted rather than from what is stored: a built-in
  // crossing keeps its own name, so storing one just to say it back would
  // leave an override behind that outlives the sentence.
  return { ok: true, message: `Saved${name ? ` ${name}` : ""}.` };
}

export async function clearCrossingAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Please sign in as an administrator." };
  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Nothing to clear." };
  const ok = await clearCrossing(id);
  if (ok) {
    revalidatePath("/admin/borders");
    revalidatePath("/my-route");
  }
  return ok
    ? { ok: true, message: "Cleared. It reads as unchecked again." }
    : { ok: false, message: "Could not clear it. Is the private store connected?" };
}
