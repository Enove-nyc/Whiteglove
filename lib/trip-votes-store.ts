/**
 * Votes on a shared trip — own Redis key, same pattern as comments.
 */

import { randomBytes } from "crypto";
import { applyVote, type TripVote, voteProblem } from "@/lib/trip-collaboration";

const key = (owner: string) => `white-glove:trip-votes:${owner.trim().toLowerCase()}`;
const MAX = 500;

export function voteStoreAvailable() {
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

export async function readVotes(owner: string): Promise<TripVote[]> {
  const raw = await redis<string>(`get/${encodeURIComponent(key(owner))}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TripVote[];
    return Array.isArray(parsed) ? parsed.filter((v) => v && typeof v.id === "string") : [];
  } catch {
    return [];
  }
}

async function write(owner: string, votes: TripVote[]): Promise<boolean> {
  return (await redis(`set/${encodeURIComponent(key(owner))}`, JSON.stringify(votes.slice(-MAX)))) !== null;
}

export async function castVote(
  owner: string,
  input: { voter: string; voterName?: string; targetId: string; label: string; kind: TripVote["kind"]; value: 1 | -1 },
): Promise<TripVote[] | null> {
  if (!voteStoreAvailable()) return null;
  const problem = voteProblem(input);
  if (problem) return null;
  const vote: TripVote = {
    id: randomBytes(8).toString("base64url"),
    targetId: input.targetId.trim(),
    kind: input.kind,
    label: input.label.trim().slice(0, 120),
    voter: input.voter.trim().toLowerCase(),
    voterName: input.voterName?.trim() || undefined,
    value: input.value,
    createdAt: new Date().toISOString(),
  };
  const next = applyVote(await readVotes(owner), vote);
  return (await write(owner, next)) ? next : null;
}

export async function clearVote(owner: string, voter: string, targetId: string): Promise<TripVote[] | null> {
  if (!voteStoreAvailable()) return null;
  const next = (await readVotes(owner)).filter(
    (v) => !(v.voter === voter.trim().toLowerCase() && v.targetId === targetId.trim()),
  );
  return (await write(owner, next)) ? next : null;
}
