/**
 * Redis stores for collaboration flags, destination placements and Plus stub.
 */

import { updateTag } from "next/cache";
import type { TravelProduct } from "@/lib/affiliate/partners";
import { TRAVEL_PRODUCTS } from "@/lib/affiliate/partners";
import {
  type CollaborationSettings,
  type DestinationPlacementSettings,
  type MembershipFoundationSettings,
  DEFAULT_COLLABORATION_SETTINGS,
  DEFAULT_DESTINATION_PLACEMENTS,
  DEFAULT_MEMBERSHIP_SETTINGS,
} from "@/lib/growth-settings";

const COLLAB_KEY = "white-glove:collaboration-settings";
const PLACEMENTS_KEY = "white-glove:destination-placements";
const MEMBERSHIP_KEY = "white-glove:membership-foundation";

export const COLLAB_TAG = "collaboration-settings";
export const PLACEMENTS_TAG = "destination-placements";
export const MEMBERSHIP_TAG = "membership-foundation";

export function growthSettingsStoreAvailable() {
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

async function readJson<T>(key: string, fallback: T): Promise<T> {
  if (!growthSettingsStoreAvailable()) return fallback;
  const raw = await redis<string>(`get/${key}`);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown, tag: string): Promise<boolean> {
  if (!growthSettingsStoreAvailable()) return false;
  if ((await redis(`set/${key}`, JSON.stringify(value))) === null) return false;
  try {
    updateTag(tag);
  } catch {
    /* no request context */
  }
  return true;
}

export async function readCollaborationSettings(): Promise<CollaborationSettings> {
  const raw = await readJson(COLLAB_KEY, DEFAULT_COLLABORATION_SETTINGS);
  return {
    votingEnabled: raw.votingEnabled !== false,
    sharedFavoritesEnabled: raw.sharedFavoritesEnabled !== false,
    roomGroupsEnabled: raw.roomGroupsEnabled !== false,
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
  };
}

export async function saveCollaborationSettings(
  next: CollaborationSettings,
  by: string,
): Promise<{ ok: boolean; message: string }> {
  const settings: CollaborationSettings = {
    votingEnabled: Boolean(next.votingEnabled),
    sharedFavoritesEnabled: Boolean(next.sharedFavoritesEnabled),
    roomGroupsEnabled: Boolean(next.roomGroupsEnabled),
    updatedAt: new Date().toISOString(),
    updatedBy: by.trim().toLowerCase() || "admin",
  };
  if (!(await writeJson(COLLAB_KEY, settings, COLLAB_TAG))) {
    return { ok: false, message: "Could not save. Check the private store is connected." };
  }
  return { ok: true, message: "Saved group planning switches." };
}

const ALLOWED = new Set(TRAVEL_PRODUCTS.map((p) => p.value));

export async function readDestinationPlacements(): Promise<DestinationPlacementSettings> {
  const raw = await readJson(PLACEMENTS_KEY, DEFAULT_DESTINATION_PLACEMENTS);
  const products = Array.isArray(raw.enabledProducts)
    ? raw.enabledProducts.filter((p): p is TravelProduct => typeof p === "string" && ALLOWED.has(p as TravelProduct))
    : DEFAULT_DESTINATION_PLACEMENTS.enabledProducts;
  return {
    sectionEnabled: raw.sectionEnabled !== false,
    enabledProducts: products.length ? products : [...DEFAULT_DESTINATION_PLACEMENTS.enabledProducts],
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
  };
}

export async function saveDestinationPlacements(
  next: DestinationPlacementSettings,
  by: string,
): Promise<{ ok: boolean; message: string }> {
  const products = (next.enabledProducts || []).filter((p) => ALLOWED.has(p));
  const settings: DestinationPlacementSettings = {
    sectionEnabled: Boolean(next.sectionEnabled),
    enabledProducts: products,
    updatedAt: new Date().toISOString(),
    updatedBy: by.trim().toLowerCase() || "admin",
  };
  if (!(await writeJson(PLACEMENTS_KEY, settings, PLACEMENTS_TAG))) {
    return { ok: false, message: "Could not save. Check the private store is connected." };
  }
  return { ok: true, message: "Saved which booking options appear on destination pages." };
}

export async function readMembershipSettings(): Promise<MembershipFoundationSettings> {
  const raw = await readJson(MEMBERSHIP_KEY, DEFAULT_MEMBERSHIP_SETTINGS);
  return {
    status: raw.status === "disabled" ? "disabled" : "planned",
    internalNotes: typeof raw.internalNotes === "string" ? raw.internalNotes.slice(0, 2000) : "",
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy,
  };
}

export async function saveMembershipSettings(
  next: MembershipFoundationSettings,
  by: string,
): Promise<{ ok: boolean; message: string }> {
  const settings: MembershipFoundationSettings = {
    status: next.status === "disabled" ? "disabled" : "planned",
    internalNotes: (next.internalNotes || "").trim().slice(0, 2000),
    updatedAt: new Date().toISOString(),
    updatedBy: by.trim().toLowerCase() || "admin",
  };
  if (!(await writeJson(MEMBERSHIP_KEY, settings, MEMBERSHIP_TAG))) {
    return { ok: false, message: "Could not save. Check the private store is connected." };
  }
  return {
    ok: true,
    message:
      settings.status === "disabled"
        ? "Saved. White Glove Plus stays marked as not offered."
        : "Saved. White Glove Plus stays planned only — nothing is sold publicly.",
  };
}
