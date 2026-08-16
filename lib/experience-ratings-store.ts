/**
 * Where experience ratings wait for the owner.
 *
 * REDIS FIRST, like contact messages: trips live in Redis already, and a rating
 * of a finished trip must not depend on DATABASE_URL. When Postgres is up we
 * also write a Prisma row, so the same inbox survives a Redis wipe and can be
 * queried with the rest of the content tables.
 *
 * FAILING OPEN TO THE OTHER STORE. If Redis is away and the database takes it,
 * the rating is saved. If both are away, the route emails it as the only copy.
 */

import {
  type ExperienceRating,
  type ExperienceRatingInput,
  type RatingKind,
  type RatingScore,
  isRatingKind,
  isRatingScore,
} from "@/lib/experience-ratings";

const KEY = "white-glove:experience-ratings";

export function ratingsStoreAvailable() {
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

async function readRedis(): Promise<ExperienceRating[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ExperienceRating[];
    return Array.isArray(parsed) ? parsed.filter(isStoredRating) : [];
  } catch {
    return [];
  }
}

function isStoredRating(row: unknown): row is ExperienceRating {
  if (!row || typeof row !== "object") return false;
  const r = row as ExperienceRating;
  return (
    typeof r.id === "string" &&
    isRatingKind(r.kind) &&
    typeof r.ref === "string" &&
    typeof r.label === "string" &&
    isRatingScore(r.score) &&
    typeof r.name === "string" &&
    typeof r.email === "string" &&
    typeof r.at === "string"
  );
}

async function writeRedis(rows: ExperienceRating[]): Promise<boolean> {
  return (await redis(`set/${KEY}`, JSON.stringify(rows))) !== null;
}

async function writePrisma(rating: ExperienceRating): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.experienceRating.create({
      data: {
        id: rating.id,
        kind: rating.kind,
        ref: rating.ref,
        label: rating.label,
        score: rating.score,
        name: rating.name,
        email: rating.email,
        note: rating.note || "",
        createdAt: new Date(rating.at),
      },
    });
    return true;
  } catch (error) {
    console.error("[ratings] could not write to the database", error);
    return false;
  }
}

/**
 * Keep a rating. True when it is somewhere it can be found again.
 *
 * Tries Redis, then Prisma. Either success is enough.
 */
export async function saveExperienceRating(
  fields: Omit<ExperienceRatingInput, "kind" | "score"> & { kind: RatingKind; score: RatingScore },
): Promise<boolean> {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const rating: ExperienceRating = {
    id,
    kind: fields.kind,
    ref: fields.ref.trim(),
    label: fields.label.trim(),
    score: fields.score,
    name: fields.name.trim(),
    email: fields.email.trim(),
    note: fields.note?.trim() ?? "",
    at: new Date().toISOString(),
  };

  let saved = false;
  if (ratingsStoreAvailable()) {
    const rows = await readRedis();
    const already = rows.find(
      (row) => row.email.toLocaleLowerCase("en") === rating.email.toLocaleLowerCase("en") && row.kind === rating.kind && row.ref === rating.ref,
    );
    if (already) {
      already.score = rating.score;
      already.note = rating.note;
      already.name = rating.name;
      already.at = rating.at;
      return writeRedis(rows);
    }
    rows.unshift(rating);
    // Cap the Redis list so it cannot grow without bound on a busy day.
    saved = await writeRedis(rows.slice(0, 500));
  }
  const db = await writePrisma(rating);
  return saved || db;
}

/** Everything received, newest first. Redis first; Prisma fills gaps when Redis is empty. */
export async function listExperienceRatings(): Promise<ExperienceRating[]> {
  if (ratingsStoreAvailable()) {
    const rows = await readRedis();
    if (rows.length) return rows;
  }
  if (!process.env.DATABASE_URL) return [];
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.experienceRating.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind as RatingKind,
      ref: row.ref,
      label: row.label,
      score: row.score as RatingScore,
      name: row.name,
      email: row.email,
      note: row.note,
      at: row.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function countExperienceRatings(): Promise<number> {
  const rows = await listExperienceRatings();
  return rows.length;
}
