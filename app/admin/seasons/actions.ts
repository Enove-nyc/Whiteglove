"use server";

import { isSpotlightKey, type SeasonalWindow } from "@/data/seasonal-spotlight";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { resetSeasonalWindow, saveSeasonalWindow, seasonalStoreAvailable } from "@/lib/seasonal-windows-store";

export type ActionResult = { ok: boolean; message: string };

/** The same gate the other editorial screens use — this is content, not access. */
async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "content")) return { ok: false, message: "Your sign-in does not cover content." };
  if (!seasonalStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

export async function saveSeasonAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const key = String(form.get("key") ?? "");
  if (!isSpotlightKey(key)) return { ok: false, message: "That season was not recognised." };

  const next: SeasonalWindow = {
    key,
    startsOn: String(form.get("startsOn") ?? "").trim(),
    endsOn: String(form.get("endsOn") ?? "").trim(),
    active: form.get("active") === "on",
    featured: form.get("featured") === "on",
    note: String(form.get("note") ?? "").trim(),
  };

  return saveSeasonalWindow(next);
}

export async function resetSeasonAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;
  const key = String(form.get("key") ?? "");
  if (!isSpotlightKey(key)) return { ok: false, message: "That season was not recognised." };
  return resetSeasonalWindow(key);
}
