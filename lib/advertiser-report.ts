/**
 * What an advertiser is owed to see, from the numbers we actually have.
 *
 * Totals, not a rate over time we do not store, and not a percentage the
 * counts cannot support — lib/ad-performance.ts already refuses to print one
 * below a hundred views. This file only decides whose ads they are.
 */

import { performance, type AdLike } from "@/lib/ad-performance";
import type { Advertiser } from "@/lib/advertisers";
import type { Campaign } from "@/lib/campaigns";

export type ReportableAd = AdLike & {
  advertiserId?: string;
  advertiserEmail?: string;
  advertiserName?: string;
  campaignId?: string;
};

export type AdvertiserReport = {
  advertiser: Pick<Advertiser, "id" | "name">;
  campaigns: Array<{
    campaign: Pick<Campaign, "id" | "name" | "status" | "startDate" | "endDate">;
    ads: Array<{
      id: string;
      title: string;
      impressions: number;
      clicks: number;
      says: string;
    }>;
  }>;
  /** Ads that never got a campaign id — still theirs, still shown. */
  ungrouped: Array<{
    id: string;
    title: string;
    impressions: number;
    clicks: number;
    says: string;
  }>;
};

function belongsTo(ad: ReportableAd, advertiser: Pick<Advertiser, "id" | "email" | "name">): boolean {
  if (advertiser.id && ad.advertiserId === advertiser.id) return true;
  const email = advertiser.email.trim().toLowerCase();
  if (email && (ad.advertiserEmail ?? "").trim().toLowerCase() === email) return true;
  return false;
}

function line(ad: ReportableAd) {
  return {
    id: ad.id,
    title: ad.title || "Untitled",
    impressions: ad.impressions,
    clicks: ad.clicks,
    says: performance(ad).says,
  };
}

/**
 * One advertiser's creatives, grouped by campaign.
 *
 * Ads that are not theirs never enter the result. An empty report is a
 * successful lookup of an advertiser who has nothing running — not a missing
 * token. The page decides which of those two it is before calling this.
 */
export function reportForAdvertiser(
  advertiser: Advertiser,
  ads: ReportableAd[],
  campaigns: Campaign[],
): AdvertiserReport {
  const mine = ads.filter((ad) => belongsTo(ad, advertiser));
  const theirs = campaigns.filter((campaign) => campaign.advertiserId === advertiser.id);
  const used = new Set<string>();
  const grouped = theirs.map((campaign) => {
    const rows = mine.filter((ad) => ad.campaignId === campaign.id);
    for (const row of rows) used.add(row.id);
    return { campaign, ads: rows.map(line) };
  });
  return {
    advertiser: { id: advertiser.id, name: advertiser.name },
    campaigns: grouped,
    ungrouped: mine.filter((ad) => !used.has(ad.id)).map(line),
  };
}

export function reportIsEmpty(report: AdvertiserReport): boolean {
  return report.campaigns.every((group) => group.ads.length === 0) && report.ungrouped.length === 0;
}
