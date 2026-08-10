"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/lib/admin-current";
import type { TravelProduct } from "@/lib/affiliate/partners";
import { mayUse } from "@/lib/admin-permissions";
import { saveDestinationPlacements } from "@/lib/growth-settings-store";

export type PlacementsActionResult = { ok: boolean; message: string };

export async function savePlacementsAction(
  _prev: PlacementsActionResult | null,
  formData: FormData,
): Promise<PlacementsActionResult> {
  const { identity, areas } = await currentAdmin();
  if (!mayUse(areas, "access")) return { ok: false, message: "Not allowed." };
  const by = identity?.how === "account" ? identity.email : "admin";
  const enabledProducts = formData.getAll("product").filter((v): v is TravelProduct => typeof v === "string");
  const result = await saveDestinationPlacements(
    {
      sectionEnabled: formData.get("sectionEnabled") === "on",
      enabledProducts,
    },
    by,
  );
  revalidatePath("/admin/settings/earnings");
  return result;
}
