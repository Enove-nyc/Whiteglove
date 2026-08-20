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

/**
 * What a message carries. A plain message is "text"; the concierge and the
 * traveller can also send a picture or their current place, so the advisor can
 * see what they are looking at rather than only read about it.
 */
export type CompanionChatKind = "text" | "image" | "location";

export type CompanionChatMessage = {
  from: CompanionChatSide;
  /**
   * What this message is. ABSENT ON OLDER ROWS, and that is deliberate — every
   * message written before pictures existed is a text message, so a missing
   * kind reads as "text" and nothing already in a thread changes.
   */
  kind?: CompanionChatKind;
  /** The words: the message itself, a picture's caption, or a place's label. May be "". */
  text: string;
  /** kind "image": the media-store id, served back through /api/media. */
  mediaId?: string;
  /** kind "location": a point the other side can open in a map. */
  lat?: number;
  lng?: number;
  /** ISO timestamp. */
  at: string;
};

/** The most a text message may carry, and the most a thread keeps. */
export const MAX_CHAT_TEXT = 2000;
/** A caption on a picture, or a label on a place — short, not a message. */
export const MAX_CHAT_LABEL = 140;
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

/** A stored kind we recognise, or "text" — an old or unknown row is text. */
function kindOf(raw: unknown): CompanionChatKind {
  return raw === "image" || raw === "location" ? raw : "text";
}

/**
 * Turn stored rows into messages, dropping anything malformed.
 *
 * Exported so the back-compatibility that matters most — a thread written
 * before pictures existed must still read, every row as text — can be pinned
 * by a test without a live store.
 */
export function parseChatMessages(rows: string[] | null): CompanionChatMessage[] {
  if (!rows) return [];
  const out: CompanionChatMessage[] = [];
  for (const row of rows) {
    try {
      const m = JSON.parse(row) as CompanionChatMessage;
      if (!m || (m.from !== "client" && m.from !== "advisor") || typeof m.text !== "string") continue;
      const kind = kindOf(m.kind);
      // A picture with no file, or a place with no coordinate, is a broken row,
      // not a message — skip it rather than render an empty bubble.
      if (kind === "image" && typeof m.mediaId !== "string") continue;
      if (kind === "location" && !(Number.isFinite(m.lat) && Number.isFinite(m.lng))) continue;
      out.push({ ...m, kind });
    } catch {
      /* skip a corrupt row rather than drop the thread */
    }
  }
  return out;
}

/** The whole thread for a trip, oldest first. */
export async function readChat(shareId: string): Promise<CompanionChatMessage[]> {
  return parseChatMessages(await command<string[]>(["LRANGE", keyFor(shareId), 0, -1]));
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

/* ---- reporting ----------------------------------------------------------- */

/**
 * A message somebody flagged.
 *
 * WHY THIS EXISTS. Once a picture can be sent from one person to another, the
 * app has to give the other person a way to say "this should not have been
 * sent" — it is a condition of carrying that kind of content at all. A report
 * is recorded here, against the trip's thread, for the operator to act on; the
 * reporter is told it was received, and nothing about the thread is destroyed
 * on the strength of one tap.
 */
export type CompanionChatReport = {
  /** Which side raised it. */
  by: CompanionChatSide;
  /** The `at` of the message being reported, so the operator can find it. */
  messageAt: string;
  /** When it was raised. ISO. */
  at: string;
};

const reportKeyFor = (shareId: string) => `white-glove:companion-report:${shareId}`;
const MAX_REPORTS = 200;

/** Record a report against a trip's thread. */
export async function appendReport(shareId: string, report: CompanionChatReport): Promise<boolean> {
  if (!chatStoreAvailable()) return false;
  const key = reportKeyFor(shareId);
  await command(["RPUSH", key, JSON.stringify(report)]);
  await command(["LTRIM", key, -MAX_REPORTS, -1]);
  return true;
}

/** Every report on a trip's thread, oldest first — for the operator to review. */
export async function readReports(shareId: string): Promise<CompanionChatReport[]> {
  const rows = await command<string[]>(["LRANGE", reportKeyFor(shareId), 0, -1]);
  if (!rows) return [];
  const out: CompanionChatReport[] = [];
  for (const row of rows) {
    try {
      const r = JSON.parse(row) as CompanionChatReport;
      if (r && (r.by === "client" || r.by === "advisor") && typeof r.messageAt === "string") out.push(r);
    } catch {
      /* skip a corrupt row */
    }
  }
  return out;
}
