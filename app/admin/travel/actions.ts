"use server";

import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { weWouldBeTheSeller } from "@/lib/travel/engine";
import { KNOWN_PAIRS, type ProviderStage } from "@/lib/travel/registry";
import { readProviderStages, writeProviderStages } from "@/lib/travel/registry-store";
import type { ProviderId, TravelCategory } from "@/lib/travel/types";

const STAGES: ProviderStage[] = ["off", "testing", "public"];

/**
 * Turn one provider up or down, in one category.
 *
 * Whitelisted against KNOWN_PAIRS rather than trusting the form: a posted
 * field is untrusted input even on an admin screen, and this one decides who
 * a company is shown to.
 */
export async function setProviderStage(formData: FormData): Promise<void> {
  const { identity, areas } = await currentAdmin();
  if (!identity || !mayUse(areas, "money")) return;

  const provider = String(formData.get("provider") ?? "") as ProviderId;
  const category = String(formData.get("category") ?? "") as TravelCategory;
  const stage = String(formData.get("stage") ?? "") as ProviderStage;

  const known = KNOWN_PAIRS.some((pair) => pair.provider === provider && pair.category === category);
  if (!known || !STAGES.includes(stage)) return;
  // The screen does not offer "public" for a provider that would make White
  // Glove the seller, and this refuses it anyway. A form field is untrusted
  // input, and the search itself refuses it a third time — see engine.ts.
  if (stage === "public" && weWouldBeTheSeller(provider, category)) return;

  const stages = await readProviderStages();
  await writeProviderStages({ ...stages, [`${provider}:${category}`]: stage });
}
