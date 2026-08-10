/**
 * Shared favorites on a trip — places the group wants to keep in view.
 */

import { randomBytes } from "crypto";
import { favoriteProblem, type SharedFavorite } from "@/lib/trip-collaboration";

const key = (owner: string) => `white-glove:trip-favorites:${owner.trim().toLowerCase()}`;
const MAX = 80;

export function favoritesStoreAvailable() {
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

export async function readSharedFavorites(owner: string): Promise<SharedFavorite[]> {
  const raw = await redis<string>(`get/${encodeURIComponent(key(owner))}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SharedFavorite[];
    return Array.isArray(parsed) ? parsed.filter((f) => f && typeof f.id === "string") : [];
  } catch {
    return [];
  }
}

async function write(owner: string, favorites: SharedFavorite[]): Promise<boolean> {
  return (await redis(`set/${encodeURIComponent(key(owner))}`, JSON.stringify(favorites.slice(-MAX)))) !== null;
}

export async function addSharedFavorite(
  owner: string,
  input: {
    label: string;
    href?: string;
    kind: SharedFavorite["kind"];
    addedBy: string;
    addedByName?: string;
  },
): Promise<SharedFavorite | null> {
  if (!favoritesStoreAvailable()) return null;
  if (favoriteProblem(input)) return null;
  const favorite: SharedFavorite = {
    id: randomBytes(8).toString("base64url"),
    label: input.label.trim().slice(0, 120),
    href: input.href?.trim().slice(0, 400) || undefined,
    kind: input.kind,
    addedBy: input.addedBy.trim().toLowerCase(),
    addedByName: input.addedByName?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const list = [...(await readSharedFavorites(owner)), favorite];
  return (await write(owner, list)) ? favorite : null;
}

export async function removeSharedFavorite(owner: string, id: string): Promise<SharedFavorite[] | null> {
  if (!favoritesStoreAvailable()) return null;
  const next = (await readSharedFavorites(owner)).filter((f) => f.id !== id);
  return (await write(owner, next)) ? next : null;
}
