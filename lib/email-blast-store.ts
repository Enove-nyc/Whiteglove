/**
 * Where a blast lives, and — the important part — who has already had it.
 *
 * THE "ALREADY SENT" SET IS THE WHOLE POINT OF THIS FILE. Sending happens in
 * batches across several presses of a button, on serverless functions that
 * share nothing, and the one thing that must never happen is the same person
 * getting the same message twice. So every address is written into a Redis set
 * the moment Resend accepts it, and the next batch is the audience minus that
 * set. If a function is killed halfway, the addresses it managed are already
 * recorded and the rest are simply still waiting.
 *
 * A refusal is recorded too, in its own set. An address Resend will not accept
 * — a typo'd domain, a hard bounce — would otherwise be retried on every press
 * forever, and the batch would never get past it.
 */

import { type BlastSettings, DEFAULT_BLAST_SETTINGS, type EmailBlast } from "@/lib/email-blast";

const SETTINGS_KEY = "white-glove:blast-settings";
const BLAST_PREFIX = "white-glove:blast:";
const BLAST_INDEX = "white-glove:blast-index";
const SENT_PREFIX = "white-glove:blast-sent:";
const FAILED_PREFIX = "white-glove:blast-failed:";

/** Blasts kept on the index. Old ones are history, not a growing bill. */
const KEEP = 40;

export function blastStoreAvailable() {
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

/* ---- the switch --------------------------------------------------------- */

export async function readBlastSettings(): Promise<BlastSettings> {
  if (!blastStoreAvailable()) return { ...DEFAULT_BLAST_SETTINGS };
  const raw = await redis<string>(`get/${SETTINGS_KEY}`);
  if (!raw) return { ...DEFAULT_BLAST_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<BlastSettings>;
    return {
      // Anything but an explicit true is off. A store returning something
      // unreadable must not be the reason mail goes out.
      open: parsed?.open === true,
      fromEmail: typeof parsed?.fromEmail === "string" ? parsed.fromEmail.trim().slice(0, 120) : "",
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : undefined,
      updatedBy: typeof parsed?.updatedBy === "string" ? parsed.updatedBy : undefined,
    };
  } catch {
    return { ...DEFAULT_BLAST_SETTINGS };
  }
}

export async function writeBlastSettings(next: Pick<BlastSettings, "open" | "fromEmail">, by: string): Promise<boolean> {
  if (!blastStoreAvailable()) return false;
  const record: BlastSettings = {
    open: next.open,
    fromEmail: next.fromEmail.trim().slice(0, 120),
    updatedAt: new Date().toISOString(),
    updatedBy: by,
  };
  return (await redis(`set/${SETTINGS_KEY}`, JSON.stringify(record))) !== null;
}

/* ---- the blasts --------------------------------------------------------- */

const blastKey = (id: string) => `${BLAST_PREFIX}${id}`;

export async function readBlast(id: string): Promise<EmailBlast | null> {
  if (!id || !blastStoreAvailable()) return null;
  const raw = await redis<string>(`get/${encodeURIComponent(blastKey(id))}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EmailBlast;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeBlast(blast: EmailBlast): Promise<boolean> {
  if (!blastStoreAvailable()) return false;
  if ((await redis(`set/${encodeURIComponent(blastKey(blast.id))}`, JSON.stringify(blast))) === null) return false;
  await redis(`lrem/${BLAST_INDEX}/0/${encodeURIComponent(blast.id)}`);
  await redis(`lpush/${BLAST_INDEX}/${encodeURIComponent(blast.id)}`);
  await redis(`ltrim/${BLAST_INDEX}/0/${KEEP - 1}`);
  return true;
}

/** Newest first. */
export async function listBlasts(limit = KEEP): Promise<EmailBlast[]> {
  if (!blastStoreAvailable()) return [];
  const ids = await redis<string[]>(`lrange/${BLAST_INDEX}/0/${Math.max(0, limit - 1)}`);
  if (!Array.isArray(ids)) return [];
  const rows: EmailBlast[] = [];
  for (const id of ids) {
    const blast = await readBlast(id);
    if (blast) rows.push(blast);
  }
  return rows;
}

export async function deleteBlast(id: string): Promise<boolean> {
  if (!blastStoreAvailable()) return false;
  await redis(`del/${encodeURIComponent(blastKey(id))}`);
  await redis(`del/${encodeURIComponent(`${SENT_PREFIX}${id}`)}`);
  await redis(`del/${encodeURIComponent(`${FAILED_PREFIX}${id}`)}`);
  await redis(`lrem/${BLAST_INDEX}/0/${encodeURIComponent(id)}`);
  return true;
}

/* ---- who has had it ----------------------------------------------------- */

/**
 * Addresses this blast has already reached, and ones it has given up on.
 *
 * Read as one set of "do not send to again" — the caller does not care which
 * bucket an address is in, only that it is not attempted twice.
 */
export async function alreadyHandled(id: string): Promise<Set<string>> {
  if (!blastStoreAvailable()) return new Set();
  const [sent, failed] = await Promise.all([
    redis<string[]>(`smembers/${encodeURIComponent(`${SENT_PREFIX}${id}`)}`),
    redis<string[]>(`smembers/${encodeURIComponent(`${FAILED_PREFIX}${id}`)}`),
  ]);
  const out = new Set<string>();
  for (const email of Array.isArray(sent) ? sent : []) out.add(email.toLowerCase());
  for (const email of Array.isArray(failed) ? failed : []) out.add(email.toLowerCase());
  return out;
}

/**
 * Written IMMEDIATELY after Resend accepts a message, one at a time.
 *
 * Not batched at the end of the loop: a function killed on its timeout would
 * then have sent fifteen messages and recorded none of them, and the next press
 * would send all fifteen again.
 */
export async function markSent(id: string, email: string): Promise<void> {
  if (!blastStoreAvailable()) return;
  await redis(`sadd/${encodeURIComponent(`${SENT_PREFIX}${id}`)}`, JSON.stringify([email.toLowerCase()]));
}

export async function markFailed(id: string, email: string): Promise<void> {
  if (!blastStoreAvailable()) return;
  await redis(`sadd/${encodeURIComponent(`${FAILED_PREFIX}${id}`)}`, JSON.stringify([email.toLowerCase()]));
}
