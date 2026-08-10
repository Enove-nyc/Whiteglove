/**
 * Where alert signups live — Redis, one record per email.
 *
 * Emails are stored so they can be delivered; they are not joined to browsing
 * analytics. Counts for the admin dashboard are incremented separately without
 * repeating the address.
 */

import { createHmac, randomBytes } from "crypto";
import {
  type AlertSignup,
  type AlertSignupInput,
  type AlertTopic,
  readTopics,
  signupProblem,
} from "@/lib/email-alerts";
import { trackAlertSignup } from "@/lib/site-analytics";

const RECORD = (email: string) => `white-glove:alert:${email.trim().toLowerCase()}`;
const INDEX = "white-glove:alert-index";
const TOKEN = (token: string) => `white-glove:alert-token:${token}`;

export function alertsStoreAvailable() {
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

function unsubSecret() {
  // Same signing secret as account sessions — already documented in connections.
  return process.env.WHITE_GLOVE_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || "white-glove-alerts";
}

export function makeUnsubToken(email: string): string {
  const salt = randomBytes(8).toString("base64url");
  const sig = createHmac("sha256", unsubSecret()).update(`${email}:${salt}`).digest("base64url").slice(0, 16);
  return `${salt}.${sig}`;
}

async function readRecord(email: string): Promise<AlertSignup | null> {
  const raw = await redis<string>(`get/${encodeURIComponent(RECORD(email))}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AlertSignup;
    if (!parsed?.email || !Array.isArray(parsed.topics)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeRecord(signup: AlertSignup): Promise<boolean> {
  const ok = (await redis(`set/${encodeURIComponent(RECORD(signup.email))}`, JSON.stringify(signup))) !== null;
  if (!ok) return false;
  await redis(`sadd/${INDEX}`, JSON.stringify([signup.email]));
  await redis(`set/${encodeURIComponent(TOKEN(signup.unsubToken))}`, signup.email);
  return true;
}

export type SubscribeResult =
  | { ok: true; status: "created" | "updated" | "duplicate"; signup: AlertSignup }
  | { ok: false; error: string; status?: number };

/**
 * Save a signup. Merges topics when the same address comes back.
 *
 * "Duplicate" means they already had every topic they asked for and are still
 * subscribed — the UI can say so without pretending something new happened.
 */
export async function subscribeAlert(input: AlertSignupInput): Promise<SubscribeResult> {
  const problem = signupProblem(input);
  if (problem) return { ok: false, error: problem, status: 400 };
  if (!alertsStoreAvailable()) {
    return {
      ok: false,
      error: "Alerts are not connected yet. Please try again later, or email us from the contact page.",
      status: 503,
    };
  }

  const email = input.email.trim().toLowerCase();
  const topics = readTopics(input.topics);
  const sourcePage = (input.sourcePage?.trim() || "/").slice(0, 120);
  const destinationSlug = input.destinationSlug?.trim().slice(0, 80) || undefined;
  const destinationQuery = input.destinationQuery?.trim().slice(0, 120) || undefined;
  const existing = await readRecord(email);
  const now = new Date().toISOString();

  if (existing && !existing.unsubscribedAt) {
    const merged = [...new Set([...existing.topics, ...topics])] as AlertTopic[];
    const sameTopics = merged.length === existing.topics.length && merged.every((t) => existing.topics.includes(t));
    const samePlace =
      (existing.destinationSlug || "") === (destinationSlug || "") &&
      (existing.destinationQuery || "") === (destinationQuery || "");
    if (sameTopics && samePlace) {
      return { ok: true, status: "duplicate", signup: existing };
    }
    const next: AlertSignup = {
      ...existing,
      topics: merged,
      destinationSlug: destinationSlug || existing.destinationSlug,
      destinationQuery: destinationQuery || existing.destinationQuery,
      sourcePage,
      consentedAt: now,
    };
    if (!(await writeRecord(next))) return { ok: false, error: "Could not save that just now.", status: 503 };
    await trackAlertSignup(topics[0], destinationSlug);
    return { ok: true, status: "updated", signup: next };
  }

  const signup: AlertSignup = {
    email,
    topics,
    destinationSlug,
    destinationQuery,
    sourcePage,
    consentedAt: now,
    createdAt: existing?.createdAt || now,
    unsubToken: existing?.unsubToken || makeUnsubToken(email),
    // Clear a prior unsubscribe by writing a fresh active record.
  };
  if (!(await writeRecord(signup))) return { ok: false, error: "Could not save that just now.", status: 503 };
  await trackAlertSignup(topics[0], destinationSlug);
  return { ok: true, status: existing ? "updated" : "created", signup };
}

async function markUnsubscribed(record: AlertSignup): Promise<{ ok: boolean; error?: string }> {
  if (record.unsubscribedAt) return { ok: true };
  record.unsubscribedAt = new Date().toISOString();
  if (!(await writeRecord(record))) return { ok: false, error: "Could not update that just now." };
  return { ok: true };
}

export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; error?: string }> {
  const clean = token.trim();
  if (!clean) return { ok: false, error: "That unsubscribe link is not valid." };
  if (!alertsStoreAvailable()) return { ok: false, error: "Alerts are not connected yet." };
  const email = await redis<string>(`get/${encodeURIComponent(TOKEN(clean))}`);
  if (!email) return { ok: false, error: "That unsubscribe link is not valid." };
  const record = await readRecord(email);
  if (!record) return { ok: false, error: "That address is not on the list." };
  return markUnsubscribed(record);
}

/** Admin unsubscribe — by email, not by public token. */
export async function unsubscribeByEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!alertsStoreAvailable()) return { ok: false, error: "Alerts are not connected yet." };
  const record = await readRecord(email.trim().toLowerCase());
  if (!record) return { ok: false, error: "That address is not on the list." };
  return markUnsubscribed(record);
}

/** Active subscribers only — for admin review, newest first, capped. */
export async function listAlertSignups(limit = 200): Promise<AlertSignup[]> {
  if (!alertsStoreAvailable()) return [];
  const emails = await redis<string[]>(`smembers/${INDEX}`);
  if (!Array.isArray(emails)) return [];
  const rows: AlertSignup[] = [];
  for (const email of emails.slice(0, Math.max(limit * 2, limit))) {
    const row = await readRecord(email);
    if (row && !row.unsubscribedAt) rows.push(row);
  }
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function countActiveAlerts(): Promise<number> {
  const rows = await listAlertSignups(5000);
  return rows.length;
}
