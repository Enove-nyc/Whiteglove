/**
 * Advertisers and campaigns, in the same Redis the promotions already use.
 *
 * A VALUE GOES IN THE REQUEST BODY, never in the address — the same shape
 * lib/admin-content.ts was fixed to. These records are small today and will
 * not stay small once a few dozen advertisers each have a campaign history.
 *
 * Failures to write are returned, not thrown: a promotion can still save with
 * the loose name/email fields if this store blips, and the visitor-facing
 * creative must not wait on a bookkeeping record.
 */

import { randomBytes } from "crypto";
import {
  advertiserIsHoldable,
  blankAdvertiser,
  normalizeAdvertiser,
  type Advertiser,
} from "@/lib/advertisers";
import {
  campaignStatusFromCreative,
  normalizeCampaign,
  type Campaign,
} from "@/lib/campaigns";

/** The fields on a creative that join it to an advertiser and a campaign. */
export type LinkableCreative = {
  title: string;
  advertiserName?: string;
  advertiserPhone?: string;
  advertiserEmail?: string;
  advertiserId?: string;
  campaignId?: string;
  campaignName?: string;
  enabled: boolean;
  previewToken?: string;
  startDate: string;
  endDate: string;
};

const ADVERTISERS_KEY = "white-glove:advertisers";
const CAMPAIGNS_KEY = "white-glove:campaigns";

type Bundle = { advertisers: Advertiser[]; campaigns: Campaign[] };

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function advertisingStoreAvailable() {
  return Boolean(redisConfig());
}

async function redis<T>(command: string, body?: string): Promise<{ result?: T } | undefined> {
  const config = redisConfig();
  if (!config) return undefined;
  try {
    const response = await fetch(`${config.url}/${command}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${config.token}` },
      body,
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    return (await response.json()) as { result?: T };
  } catch {
    return undefined;
  }
}

function parseList<T>(raw: string | undefined, normalize: (row: Partial<T>) => T): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => normalize(row as Partial<T>));
  } catch {
    return [];
  }
}

async function readBundle(): Promise<Bundle> {
  const [advertisersRes, campaignsRes] = await Promise.all([
    redis<string>(`get/${encodeURIComponent(ADVERTISERS_KEY)}`),
    redis<string>(`get/${encodeURIComponent(CAMPAIGNS_KEY)}`),
  ]);
  return {
    advertisers: parseList(advertisersRes?.result, (row) => normalizeAdvertiser(row)),
    campaigns: parseList(campaignsRes?.result, (row) => normalizeCampaign(row)),
  };
}

async function writeAdvertisers(rows: Advertiser[]): Promise<boolean> {
  const response = await redis(`set/${encodeURIComponent(ADVERTISERS_KEY)}`, JSON.stringify(rows));
  return Boolean(response);
}

async function writeCampaigns(rows: Campaign[]): Promise<boolean> {
  const response = await redis(`set/${encodeURIComponent(CAMPAIGNS_KEY)}`, JSON.stringify(rows));
  return Boolean(response);
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function newReportToken() {
  return randomBytes(24).toString("hex");
}

export async function listAdvertisers(): Promise<Advertiser[]> {
  const { advertisers } = await readBundle();
  return advertisers.sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));
}

export async function listCampaigns(): Promise<Campaign[]> {
  const { campaigns } = await readBundle();
  return campaigns.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function advertiserByReportToken(token: string): Promise<Advertiser | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const { advertisers } = await readBundle();
  return advertisers.find((row) => row.reportToken === trimmed) ?? null;
}

export async function upsertAdvertiser(input: Partial<Advertiser>): Promise<Advertiser | null> {
  if (!advertisingStoreAvailable()) return null;
  const { advertisers } = await readBundle();
  const now = new Date().toISOString();
  const incoming = normalizeAdvertiser(input, now);
  if (!advertiserIsHoldable(incoming)) return null;

  const existing =
    (incoming.id && advertisers.find((row) => row.id === incoming.id)) ||
    (incoming.email && advertisers.find((row) => row.email && row.email === incoming.email)) ||
    undefined;

  const saved: Advertiser = existing
    ? normalizeAdvertiser(
        {
          ...existing,
          ...incoming,
          id: existing.id,
          reportToken: existing.reportToken || incoming.reportToken || newReportToken(),
          createdAt: existing.createdAt,
        },
        now,
      )
    : normalizeAdvertiser(
        {
          ...blankAdvertiser(now),
          ...incoming,
          id: incoming.id || newId("adv"),
          reportToken: incoming.reportToken || newReportToken(),
        },
        now,
      );

  const next = advertisers.filter((row) => row.id !== saved.id).concat(saved);
  const ok = await writeAdvertisers(next);
  return ok ? saved : null;
}

export async function upsertCampaign(input: Partial<Campaign>): Promise<Campaign | null> {
  if (!advertisingStoreAvailable()) return null;
  const { campaigns } = await readBundle();
  const now = new Date().toISOString();
  const incoming = normalizeCampaign(input, now);
  if (!incoming.advertiserId || !incoming.name) return null;

  const existing =
    (incoming.id && campaigns.find((row) => row.id === incoming.id)) ||
    campaigns.find(
      (row) => row.advertiserId === incoming.advertiserId && row.name.toLowerCase() === incoming.name.toLowerCase(),
    ) ||
    undefined;

  const saved = existing
    ? normalizeCampaign(
        {
          ...existing,
          ...incoming,
          id: existing.id,
          createdAt: existing.createdAt,
        },
        now,
      )
    : normalizeCampaign(
        {
          ...incoming,
          id: incoming.id || newId("cmp"),
        },
        now,
      );

  const next = campaigns.filter((row) => row.id !== saved.id).concat(saved);
  const ok = await writeCampaigns(next);
  return ok ? saved : null;
}

/**
 * Attach an advertiser and a campaign to a creative, creating them if needed.
 *
 * Returns the promotion with ids filled in. If there is no name and no email,
 * the creative is returned unchanged — a banner with nobody behind it is still
 * a valid draft.
 */
export async function linkPromotion<T extends LinkableCreative>(promotion: T): Promise<T> {
  const name = (promotion.advertiserName ?? "").trim();
  const email = (promotion.advertiserEmail ?? "").trim();
  const phone = (promotion.advertiserPhone ?? "").trim();
  if (!name && !email && !promotion.advertiserId) return promotion;

  const advertiser = await upsertAdvertiser({
    id: promotion.advertiserId,
    name: name || email,
    email,
    phone,
  });
  if (!advertiser) return promotion;

  const campaignName = (promotion.campaignName ?? "").trim() || promotion.title.trim() || "Untitled campaign";
  const campaign = await upsertCampaign({
    id: promotion.campaignId,
    advertiserId: advertiser.id,
    name: campaignName,
    status: campaignStatusFromCreative(promotion),
    startDate: promotion.startDate,
    endDate: promotion.endDate,
  });

  return {
    ...promotion,
    advertiserId: advertiser.id,
    campaignId: campaign?.id ?? promotion.campaignId,
    campaignName,
  };
}
