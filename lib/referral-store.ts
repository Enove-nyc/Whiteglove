/**
 * Referral settings and codes in Redis. Programme stays OFF until enabled.
 */

import { randomBytes } from "crypto";
import {
  type ReferralAttribution,
  type ReferralCode,
  type ReferralSettings,
  DEFAULT_REFERRAL_SETTINGS,
  attributionProblem,
  normalizeReferralCode,
} from "@/lib/referral";

const SETTINGS = "white-glove:referral-settings";
const CODE_BY_OWNER = (email: string) => `white-glove:referral-code-owner:${email.trim().toLowerCase()}`;
const OWNER_BY_CODE = (code: string) => `white-glove:referral-code:${code}`;
const ATTR = "white-glove:referral-attributions";

export function referralStoreAvailable() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

export async function readReferralSettings(): Promise<ReferralSettings> {
  if (!referralStoreAvailable()) return { ...DEFAULT_REFERRAL_SETTINGS };
  const raw = await redis<string>(`get/${SETTINGS}`);
  if (!raw) return { ...DEFAULT_REFERRAL_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as ReferralSettings;
    return {
      enabled: Boolean(parsed.enabled),
      rulesText: typeof parsed.rulesText === "string" ? parsed.rulesText.slice(0, 2000) : "",
      updatedAt: parsed.updatedAt,
      updatedBy: parsed.updatedBy,
    };
  } catch {
    return { ...DEFAULT_REFERRAL_SETTINGS };
  }
}

export async function saveReferralSettings(
  next: ReferralSettings,
  by: string,
): Promise<{ ok: boolean; message: string }> {
  if (!referralStoreAvailable()) {
    return { ok: false, message: "The private store is not connected." };
  }
  const settings: ReferralSettings = {
    enabled: Boolean(next.enabled),
    rulesText: (next.rulesText || "").trim().slice(0, 2000),
    updatedAt: new Date().toISOString(),
    updatedBy: by.trim().toLowerCase() || "admin",
  };
  if ((await redis(`set/${SETTINGS}`, JSON.stringify(settings))) === null) {
    return { ok: false, message: "Could not save. Try again." };
  }
  return {
    ok: true,
    message: settings.enabled
      ? "Saved. The referral programme is ON — only enable this when reward rules are final."
      : "Saved. The referral programme stays OFF for visitors.",
  };
}

function mintCode(): string {
  return randomBytes(4).toString("hex").toUpperCase().slice(0, 8);
}

export async function getOrCreateReferralCode(ownerEmail: string): Promise<ReferralCode | null> {
  if (!referralStoreAvailable()) return null;
  const owner = ownerEmail.trim().toLowerCase();
  const existing = await redis<string>(`get/${encodeURIComponent(CODE_BY_OWNER(owner))}`);
  if (existing) {
    return { code: existing, ownerEmail: owner, createdAt: "" };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = mintCode();
    const taken = await redis<string>(`get/${encodeURIComponent(OWNER_BY_CODE(code))}`);
    if (taken) continue;
    const record: ReferralCode = { code, ownerEmail: owner, createdAt: new Date().toISOString() };
    await redis(`set/${encodeURIComponent(CODE_BY_OWNER(owner))}`, code);
    await redis(`set/${encodeURIComponent(OWNER_BY_CODE(code))}`, JSON.stringify(record));
    return record;
  }
  return null;
}

export async function ownerForCode(code: string): Promise<ReferralCode | null> {
  const normalized = normalizeReferralCode(code);
  if (!normalized || !referralStoreAvailable()) return null;
  const raw = await redis<string>(`get/${encodeURIComponent(OWNER_BY_CODE(normalized))}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReferralCode;
  } catch {
    return null;
  }
}

export async function recordAttribution(input: {
  code: string;
  referred: string;
}): Promise<{ ok: boolean; error?: string; attribution?: ReferralAttribution }> {
  const settings = await readReferralSettings();
  if (!settings.enabled) return { ok: false, error: "The referral programme is not open." };
  const owner = await ownerForCode(input.code);
  if (!owner) return { ok: false, error: "That referral code is not recognised." };
  const block = attributionProblem({ codeOwner: owner.ownerEmail, referred: input.referred });
  const attribution: ReferralAttribution = {
    code: owner.code,
    referred: input.referred.trim().toLowerCase(),
    at: new Date().toISOString(),
    status: block ? "blocked" : "pending",
    blockReason: block || undefined,
  };
  await redis(`lpush/${ATTR}`, JSON.stringify([JSON.stringify(attribution)]));
  await redis(`ltrim/${ATTR}/0/1999`);
  if (block) return { ok: false, error: block, attribution };
  return { ok: true, attribution };
}

export async function listAttributions(limit = 100): Promise<ReferralAttribution[]> {
  if (!referralStoreAvailable()) return [];
  const rows = await redis<string[]>(`lrange/${ATTR}/0/${Math.max(0, limit - 1)}`);
  if (!Array.isArray(rows)) return [];
  const out: ReferralAttribution[] = [];
  for (const row of rows) {
    try {
      out.push(JSON.parse(row) as ReferralAttribution);
    } catch {
      /* skip */
    }
  }
  return out;
}
