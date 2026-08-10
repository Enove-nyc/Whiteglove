"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { DEFAULT_PROVIDER, isProvider, type Stay22Settings } from "@/lib/stay22";
import { saveStay22 } from "@/lib/stay22-store";
import { listProblem, type TravelExtra } from "@/lib/travel-extras";
import { saveExtras } from "@/lib/travel-extras-store";
import { SLOTS, type TravelpayoutsLinks } from "@/lib/travelpayouts";
import { saveTravelpayouts, travelpayoutsStoreAvailable } from "@/lib/travelpayouts-store";
import { isPartnerKey, type PartnerChoices } from "@/lib/travel-partners";

export type ActionResult = { ok: boolean; message: string };

/**
 * Checked here as well as by the settings layout's gate: a server action is its
 * own door. This one decides where the site's commission goes, so it is not a
 * small door.
 */
async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };
  if (!travelpayoutsStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  return null;
}

export async function saveLinksAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const links: TravelpayoutsLinks = {};
  const partners: PartnerChoices = {};
  for (const { slot } of SLOTS) {
    const value = String(form.get(slot) ?? "").trim();
    if (value) links[slot] = value;
    const partner = String(form.get(`partner-${slot}`) ?? "");
    // An unrecognised key is dropped rather than stored: partnerFor falls back
    // to the default, which is a working search, where a bad key persisted
    // would be a setting nobody can see or correct.
    if (isPartnerKey(partner)) partners[slot] = partner;
  }

  // saveTravelpayouts checks each link against the partner being saved
  // alongside it, and refuses the save rather than storing one that cannot
  // earn.
  const saved = await saveTravelpayouts({ links, partners });
  if (saved.ok) {
    revalidatePath("/admin/settings/earnings");
    revalidatePath("/book");
  }
  return saved;
}

/**
 * The whole list arrives as one JSON field, because rows are added and removed
 * in the browser — posting them individually would need a name per row and some
 * way of saying which had been deleted.
 */
export async function saveExtrasAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  let rows: TravelExtra[];
  try {
    const parsed = JSON.parse(String(form.get("extras") ?? "[]")) as TravelExtra[];
    if (!Array.isArray(parsed)) throw new Error("not a list");
    // Trimmed here rather than in the browser, so what is stored is what was
    // checked. Only the four fields, so nothing else can be smuggled in.
    rows = parsed.map((r) => ({
      id: String(r?.id ?? "").slice(0, 40) || `x${Math.random().toString(36).slice(2)}`,
      name: String(r?.name ?? "").trim(),
      blurb: String(r?.blurb ?? "").trim(),
      url: String(r?.url ?? "").trim(),
      cta: String(r?.cta ?? "").trim(),
    }));
  } catch {
    return { ok: false, message: "The offers did not arrive in one piece. Reload the page and try again." };
  }

  const problem = listProblem(rows);
  if (problem) return { ok: false, message: problem };

  const saved = await saveExtras(rows);
  if (saved.ok) {
    revalidatePath("/admin/settings/earnings");
    revalidatePath("/book");
  }
  return saved;
}

/** Turning the hotel search over to Stay22, or handing it back. */
export async function saveStay22Action(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  const provider = String(form.get("provider") ?? "");
  const next: Stay22Settings = {
    aid: String(form.get("aid") ?? "").trim(),
    provider: isProvider(provider) ? provider : DEFAULT_PROVIDER,
  };

  const saved = await saveStay22(next);
  if (saved.ok) {
    revalidatePath("/admin/settings/earnings");
    revalidatePath("/book");
  }
  return saved;
}
