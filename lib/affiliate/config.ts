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
import type { AffiliateConfig } from "@/lib/affiliate/partners";

export const AFFILIATE_CONFIG_TAG = "affiliate-config";

const cached = unstable_cache(
  async (): Promise<AffiliateConfig> => {
    const travelpayouts = await readTravelpayouts();
    return {
      travelpayouts: travelpayouts.links,
      partners: travelpayouts.partners,
      stay22: await readStay22(),
      kayakParams: process.env.KAYAK_AFFILIATE_PARAMS?.trim() || "",
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
