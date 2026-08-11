/**
 * Where a message written on the website waits until somebody answers it.
 *
 * One key in the private store holding the whole queue, newest first, the same
 * shape as the plan requests next door. A message is small and there are never
 * many at once; a list per message would buy nothing and cost a round trip per
 * row every time the admin screen draws.
 *
 * FAILING HERE IS NOT AN ERROR THE VISITOR SEES. Every function returns null
 * or false when the store is away, and the route treats that as "this one is
 * not saved" rather than as a failure — because the email may still carry it,
 * and telling somebody their message could not be sent when it is on its way
 * to an inbox would have them write it again.
 */

import {
  type ContactMessage,
  type MessageState,
  countWaiting,
  newMessage,
  withMessage,
} from "@/lib/contact-messages";

const KEY = "white-glove:contact-messages";

export function contactStoreAvailable() {
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

async function read(): Promise<ContactMessage[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ContactMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function write(rows: ContactMessage[]): Promise<boolean> {
  return (await redis(`set/${KEY}`, JSON.stringify(rows))) !== null;
}

/**
 * Keep a message. True when it is somewhere it can be found again.
 *
 * The caller has already checked the fields — this stores what it is given.
 */
export async function saveContactMessage(
  fields: Omit<ContactMessage, "id" | "at" | "state">,
): Promise<boolean> {
  if (!contactStoreAvailable()) return false;
  const rows = await read();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return write(withMessage(rows, newMessage(fields, id, new Date().toISOString())));
}

/** Everything written in, newest first. */
export async function listContactMessages(): Promise<ContactMessage[]> {
  return read();
}

/**
 * How many are still waiting on a person.
 *
 * Its own function because the dashboard wants the number and nothing else,
 * and because it has to answer 0 rather than throw when the store is away —
 * an admin dashboard that fails to render because Upstash blinked is a worse
 * outage than a count that is briefly missing.
 */
export async function countWaitingMessages(): Promise<number> {
  if (!contactStoreAvailable()) return 0;
  return countWaiting(await read());
}

/**
 * Mark one answered, or put it back in the queue.
 *
 * Answering is a note that the owner has dealt with it, not a reply — the
 * reply happens in his email, where it always did. This screen has never
 * claimed to send anything and must not look as though it does.
 */
export async function markMessage(
  id: string,
  state: MessageState,
  by: string,
): Promise<{ ok: boolean; message: string }> {
  if (!contactStoreAvailable()) return { ok: false, message: "This needs the private store connected." };
  const rows = await read();
  const found = rows.find((row) => row.id === id);
  if (!found) return { ok: false, message: "That message is not in the list any more." };
  found.state = state;
  if (state === "answered") {
    found.answeredAt = new Date().toISOString();
    found.answeredBy = by;
  } else {
    delete found.answeredAt;
    delete found.answeredBy;
  }
  if (!(await write(rows))) return { ok: false, message: "That could not be saved." };
  return { ok: true, message: state === "answered" ? "Marked as answered." : "Put back in the queue." };
}
