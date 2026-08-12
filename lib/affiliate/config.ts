/**
 * The affiliate settings, read once and cached.
 *
 * The redirect handler needs these on every commercial click, and they change
 * about as often as a partner is joined. Same pattern as the site words and
 * the booking-access lock: cached with a tag, cleared the moment the owner
 * saves on /admin/settings/earnings, with an hourly backstop.
 */

import { unstable_cache } from "next/cache";
import { readStay22 } from "@/lib/stay22-store";
import { readTravelpayouts } from "@/lib/travelpayouts-store";
import { NO_STAY22 } from "@/lib/stay22";
import type { AffiliateConfig, EssentialsLandings } from "@/lib/affiliate/partners";
import { readTravelEssentials } from "@/lib/travel-essentials-store";
import type { EssentialServiceId } from "@/lib/travel-essentials";
import { landingUrlProblem } from "@/lib/travel-essentials";

export const AFFILIATE_CONFIG_TAG = "affiliate-config";

const LANDING_IDS = ["transfer", "activity", "insurance", "esim"] as const satisfies readonly EssentialServiceId[];

async function loadEssentialsLandings(): Promise<EssentialsLandings> {
  const essentials = await readTravelEssentials();
  if (!essentials.sectionEnabled) return {};
  const out: EssentialsLandings = {};
  for (const id of LANDING_IDS) {
    const row = essentials.services[id];
    if (!row) continue;
    // Every provider in the category, first one first, so /go can resolve the
    // one a card asked for. Built from the same rule the cards render by.
    const offers: Array<{ url: string; label?: string }> = [];
    if (row.enabled && !landingUrlProblem(row.url.trim())) {
      offers.push({ url: row.url.trim(), label: row.label?.trim() || "Partner" });
    } else {
      // A hole rather than a shift: offer 1 must stay offer 1 even when the
      // first provider is turned off, or every link already rendered on a
      // cached page would start pointing at the wrong company.
      offers.push({ url: "", label: "" });
    }
    for (const extra of row.extra ?? []) {
      const url = extra.url.trim();
      offers.push(extra.enabled && !landingUrlProblem(url) ? { url, label: extra.label.trim() || "Partner" } : { url: "", label: "" });
    }
    if (offers.some((entry) => entry.url)) out[id] = offers;
  }
  return out;
}

const cached = unstable_cache(
  async (): Promise<AffiliateConfig> => {
    const travelpayouts = await readTravelpayouts();
    return {
      travelpayouts: travelpayouts.links,
      partners: travelpayouts.partners,
      stay22: await readStay22(),
      kayakParams: process.env.KAYAK_AFFILIATE_PARAMS?.trim() || "",
      essentialsLandings: await loadEssentialsLandings(),
    };
  },
  ["affiliate-config"],
  { tags: [AFFILIATE_CONFIG_TAG], revalidate: 3600 },
);

export async function readAffiliateConfig(): Promise<AffiliateConfig> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { travelpayouts: {}, stay22: NO_STAY22, kayakParams: process.env.KAYAK_AFFILIATE_PARAMS?.trim() || "" };
  }
  return cached();
}
