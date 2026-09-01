"use server";

import { isSpotlightKey, type SeasonalWindow } from "@/data/seasonal-spotlight";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { resetSeasonalWindow, saveSeasonalWindow, seasonalStoreAvailable } from "@/lib/seasonal-windows-store";
import { isChipIcon } from "@/data/planning-now";
import { deletePlanningChip, planningNowStoreAvailable, savePlanningChip } from "@/lib/planning-now-store";

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

/**
 * The "Planning now" chips — the same screen, because both answer "what does
 * the front page say about the time of year". Its own gate check, because the
 * one above also requires the seasonal store, and these are separate keys: the
 * chips must stay editable if only one of the two is unavailable.
 */
async function allowedForChips(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "content")) return { ok: false, message: "Your sign-in does not cover content." };
  if (!planningNowStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

export async function savePlanningChipAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowedForChips();
  if (refused) return refused;

  const icon = String(form.get("icon") ?? "");
  const priority = Number(String(form.get("priority") ?? "0"));

  return savePlanningChip({
    id: String(form.get("id") ?? "").trim() || undefined,
    label: String(form.get("label") ?? ""),
    href: String(form.get("href") ?? ""),
    startsOn: String(form.get("startsOn") ?? "").trim(),
    endsOn: String(form.get("endsOn") ?? "").trim(),
    priority: Number.isFinite(priority) ? priority : 0,
    enabled: form.get("enabled") === "on",
    ...(isChipIcon(icon) ? { icon } : {}),
  });
}

export async function deletePlanningChipAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowedForChips();
  if (refused) return refused;
  const id = String(form.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "That one was not recognised." };
  return deletePlanningChip(id);
}
