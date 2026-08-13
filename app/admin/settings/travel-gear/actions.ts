"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { gearListProblem, type TravelGearItem } from "@/lib/travel-gear";
import { gearStoreAvailable, saveGear } from "@/lib/travel-gear-store";

export type ActionResult = { ok: boolean; message: string };

async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };
  if (!gearStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

/**
 * The whole list arrives as one JSON field, same reason as
 * saveExtrasAction: rows are added and removed in the browser.
 */
export async function saveGearAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  let rows: TravelGearItem[];
  try {
    const parsed = JSON.parse(String(form.get("items") ?? "[]")) as TravelGearItem[];
    if (!Array.isArray(parsed)) throw new Error("not a list");
    // Trimmed here rather than in the browser, so what is stored is what was
    // checked. Only these fields, so nothing else can be smuggled in.
    rows = parsed.map((r) => ({
      id: String(r?.id ?? "").slice(0, 40) || `g${Math.random().toString(36).slice(2)}`,
      name: String(r?.name ?? "").trim(),
      description: String(r?.description ?? "").trim(),
      imageUrl: String(r?.imageUrl ?? "").trim(),
      price: String(r?.price ?? "").trim(),
      priceCheckedAt: String(r?.priceCheckedAt ?? "").trim(),
      url: String(r?.url ?? "").trim(),
      cta: String(r?.cta ?? "").trim(),
    }));
  } catch {
    return { ok: false, message: "The shelf did not arrive in one piece. Reload the page and try again." };
  }

  const problem = gearListProblem(rows);
  if (problem) return { ok: false, message: problem };

  const saved = await saveGear(rows);
  if (saved.ok) {
    revalidatePath("/admin/settings/travel-gear");
    revalidatePath("/travel-gear");
  }
  return saved;
}
