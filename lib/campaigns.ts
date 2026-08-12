/**
 * A run of advertising: one advertiser, a window, a status.
 *
 * Draft → Preview → Publish is the only path onto the site. An advertisement
 * that is saved is not live; a preview is visible only with its token; publish
 * is a separate act. That sequence lived as `enabled: false` on a creative.
 * A campaign is what lets several creatives share one decision.
 */

export const CAMPAIGN_STATUSES = ["draft", "preview", "published"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type Campaign = {
  id: string;
  advertiserId: string;
  name: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export function blankCampaign(now = new Date().toISOString()): Campaign {
  return {
    id: "",
    advertiserId: "",
    name: "",
    status: "draft",
    startDate: "",
    endDate: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function isCampaignStatus(value: string): value is CampaignStatus {
  return (CAMPAIGN_STATUSES as readonly string[]).includes(value);
}

export function normalizeCampaign(row: Partial<Campaign>, now = new Date().toISOString()): Campaign {
  const raw = row.status ?? "";
  const status: CampaignStatus = isCampaignStatus(raw) ? raw : "draft";
  return {
    id: (row.id ?? "").trim(),
    advertiserId: (row.advertiserId ?? "").trim(),
    name: (row.name ?? "").trim(),
    status,
    startDate: (row.startDate ?? "").trim(),
    endDate: (row.endDate ?? "").trim(),
    notes: (row.notes ?? "").trim(),
    createdAt: row.createdAt || now,
    updatedAt: now,
  };
}

/**
 * The campaign status implied by a creative.
 *
 * Published beats preview: a live advert is not a preview that happens to be
 * on. Draft is everything else — including a paused one that used to be live.
 */
export function campaignStatusFromCreative(input: { enabled: boolean; previewToken?: string }): CampaignStatus {
  if (input.enabled) return "published";
  if (input.previewToken?.trim()) return "preview";
  return "draft";
}
