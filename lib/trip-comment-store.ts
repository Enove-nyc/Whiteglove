/**
 * Where the notes on a trip are kept.
 *
 * Keyed by the OWNER, not by the share link. A share link can be turned off
 * and made again — that is what "stop sharing" does — and notes tied to a link
 * would disappear the moment somebody did. They belong to the trip.
 *
 * Their own key rather than a field on the trip, for the same reason the
 * recycle bin is: a note is written by somebody who is not the owner, and
 * writing it should never read-modify-write the record that holds his
 * itinerary. Two people commenting at once would otherwise be two people
 * saving the whole trip on top of each other.
 */

import { randomBytes } from "crypto";
import { MAX_PER_TRIP, type TripComment } from "@/lib/trip-comments";

const key = (owner: string) => `white-glove:trip-comments:${owner.trim().toLowerCase()}`;

export function commentStoreAvailable() {
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

export async function readComments(owner: string): Promise<TripComment[]> {
  const raw = await redis<string>(`get/${encodeURIComponent(key(owner))}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TripComment[];
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.id === "string" && typeof c.body === "string") : [];
  } catch {
    return [];
  }
}

async function write(owner: string, comments: TripComment[]): Promise<boolean> {
  return (await redis(`set/${encodeURIComponent(key(owner))}`, JSON.stringify(comments))) !== null;
}

/**
 * Add a note.
 *
 * The oldest are dropped once there are too many, not the newest — a thread
 * that refuses new notes because it is full is a thread nobody can use, and
 * three hundred is far past the point where anybody is reading the top of it.
 */
export async function addComment(
  owner: string,
  input: { author: string; authorName?: string; body: string; about?: string },
): Promise<TripComment | null> {
  if (!commentStoreAvailable()) return null;
  const comment: TripComment = {
    id: randomBytes(8).toString("base64url"),
    author: input.author.trim().toLowerCase(),
    authorName: input.authorName?.trim() || undefined,
    body: input.body.trim(),
    about: input.about?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const kept = [...(await readComments(owner)), comment].slice(-MAX_PER_TRIP);
  return (await write(owner, kept)) ? comment : null;
}

/** Mark one dealt with, or put it back. Returns the list as it now stands. */
export async function setCommentDone(
  owner: string,
  id: string,
  done: boolean,
  by: string,
): Promise<TripComment[] | null> {
  const comments = await readComments(owner);
  const found = comments.find((c) => c.id === id);
  if (!found) return null;
  if (done) {
    found.doneAt = new Date().toISOString();
    found.doneBy = by.trim().toLowerCase();
  } else {
    delete found.doneAt;
    delete found.doneBy;
  }
  return (await write(owner, comments)) ? comments : null;
}

export async function deleteComment(owner: string, id: string): Promise<TripComment[] | null> {
  const comments = await readComments(owner);
  const kept = comments.filter((c) => c.id !== id);
  if (kept.length === comments.length) return null;
  return (await write(owner, kept)) ? kept : null;
}

/** One comment by id, for checking who may act on it before acting. */
export async function findComment(owner: string, id: string): Promise<TripComment | null> {
  return (await readComments(owner)).find((c) => c.id === id) ?? null;
}
