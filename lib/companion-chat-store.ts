/**
 * The chat thread on a trip — between the client holding the app link and the
 * advisor who planned it.
 *
 * KEYED BY THE TRIP'S SHARE TOKEN, not by an account. The token is the trip's
 * public address (lib/account-store.ts), the same one the client's app link
 * carries, so the client — who has no account — and the advisor are talking in
 * the same place: the one trip that token belongs to. Sharing a trip is what
 * opens the channel; there is no thread until there is a link.
 *
 * Stored as a Redis list, appended to and trimmed, so two messages arriving
 * together do not overwrite each other the way a read-modify-write of one JSON
 * blob would. Without the private store connected there is no thread, and the
 * app says so rather than pretending a message was delivered.
 */

export type CompanionChatSide = "client" | "advisor";

export type CompanionChatMessage = {
  from: CompanionChatSide;
  text: string;
  /** ISO timestamp. */
  at: string;
};

/** The most a single message may carry, and the most a thread keeps. */
export const MAX_CHAT_TEXT = 2000;
const MAX_THREAD = 200;

export function chatStoreAvailable(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

const keyFor = (shareId: string) => `white-glove:companion-chat:${shareId}`;

async function command<T>(args: (string | number)[]): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(url.replace(/\/$/, ""), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

function parse(rows: string[] | null): CompanionChatMessage[] {
  if (!rows) return [];
  const out: CompanionChatMessage[] = [];
  for (const row of rows) {
    try {
      const m = JSON.parse(row) as CompanionChatMessage;
      if (m && (m.from === "client" || m.from === "advisor") && typeof m.text === "string") out.push(m);
    } catch {
      /* skip a corrupt row rather than drop the thread */
    }
  }
  return out;
}

/** The whole thread for a trip, oldest first. */
export async function readChat(shareId: string): Promise<CompanionChatMessage[]> {
  return parse(await command<string[]>(["LRANGE", keyFor(shareId), 0, -1]));
}

/**
 * Add one message and return the thread as it now stands.
 *
 * `at` is stamped by the caller (the route) rather than here — this module has
 * no business reading the clock, and the route already has `now`.
 */
export async function appendChat(
  shareId: string,
  message: CompanionChatMessage,
): Promise<CompanionChatMessage[]> {
  if (!chatStoreAvailable()) return [];
  const key = keyFor(shareId);
  await command(["RPUSH", key, JSON.stringify(message)]);
  await command(["LTRIM", key, -MAX_THREAD, -1]);
  return readChat(shareId);
}
