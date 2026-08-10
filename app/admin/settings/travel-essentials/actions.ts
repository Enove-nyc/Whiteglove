"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { mergeTravelEssentials, type TravelEssentialsSettings } from "@/lib/travel-essentials";
import { saveTravelEssentials, travelEssentialsStoreAvailable } from "@/lib/travel-essentials-store";

export type ActionResult = { ok: boolean; message: string };

async function allowed(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "access")) return { ok: false, message: "Your sign-in does not cover settings." };
  if (!travelEssentialsStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected." };
  }
  return null;
}

export async function saveTravelEssentialsAction(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const refused = await allowed();
  if (refused) return refused;

  let parsed: TravelEssentialsSettings;
  try {
    parsed = mergeTravelEssentials(JSON.parse(String(form.get("settings") ?? "{}")));
  } catch {
    return { ok: false, message: "The settings did not arrive in one piece. Reload the page and try again." };
  }

  const { identity } = await currentAdmin();
  const saved = await saveTravelEssentials({
    ...parsed,
    updatedBy: identity?.how === "account" ? identity.email : identity?.how === "code" ? "code" : undefined,
  });
  if (saved.ok) {
    revalidatePath("/admin/settings/travel-essentials");
    revalidatePath("/book");
    revalidatePath("/itinerary");
    revalidatePath("/destinations");
  }
  return saved;
}
