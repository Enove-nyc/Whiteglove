/**
 * Where the Trello settings live, and the one function that sends a card.
 *
 * THE SEND IS FIRE-AND-FORGET, ALWAYS. A visitor sending a photograph does not
 * care whether the owner uses Trello: a wrong key, an expired token, a deleted
 * list or Trello being down costs a card and nothing else. Every caller uses
 * `void sendCard(...)` and no caller awaits it. The queue on /admin is still the
 * truth and is still there.
 *
 * NOT IN THE ENVIRONMENT. A token is regenerated when somebody leaves the team,
 * and the list changes when the board is reorganised. Neither should need a
 * deploy.
 */

import { unstable_cache, updateTag } from "next/cache";
import {
  type CardKind,
  type TrelloSettings,
  CARD_KINDS,
  cardFor,
  cardUrl,
  describeSendFailure,
  memberFor,
  NO_TRELLO,
  sendsCardFor,
} from "@/lib/trello";

const KEY = "white-glove:trello";
export const TRELLO_TAG = "trello";

export function trelloStoreAvailable() {
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

function clean(stored: Partial<TrelloSettings> | null): TrelloSettings {
  const kinds = Array.isArray(stored?.kinds) ? stored.kinds : [];
  return {
    key: String(stored?.key ?? "").trim(),
    token: String(stored?.token ?? "").trim(),
    listId: String(stored?.listId ?? "").trim(),
    // Only kinds this site knows, so nothing unexpected can arrive through the
    // door and be sent as a card kind that has no screen behind it.
    kinds: CARD_KINDS.map((k) => k.kind).filter((k) => kinds.includes(k)),
    // Blank is the normal state and is not a fault: with no member id the card
    // still names its lane in the description.
    ownerMemberId: String(stored?.ownerMemberId ?? "").trim(),
    botMemberId: String(stored?.botMemberId ?? "").trim(),
  };
}

async function readStored(): Promise<TrelloSettings> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return NO_TRELLO;
  try {
    return clean(JSON.parse(raw) as Partial<TrelloSettings>);
  } catch {
    return NO_TRELLO;
  }
}

const cached = unstable_cache(readStored, ["trello"], { tags: [TRELLO_TAG], revalidate: 3600 });

/** Read on every submission, so it is cached. */
export async function readTrello(): Promise<TrelloSettings> {
  if (!trelloStoreAvailable()) return NO_TRELLO;
  return cached();
}

/** Uncached, for the admin screen and the test button. */
export async function readTrelloFresh(): Promise<TrelloSettings> {
  if (!trelloStoreAvailable()) return NO_TRELLO;
  return readStored();
}

export async function saveTrello(next: TrelloSettings): Promise<boolean> {
  if (!trelloStoreAvailable()) return false;
  if ((await redis(`set/${KEY}`, JSON.stringify(clean(next)))) === null) return false;
  updateTag(TRELLO_TAG);
  return true;
}

/* ---- sending ------------------------------------------------------------ */

export type SendOutcome = { ok: boolean; message: string };

/**
 * Put one card on the board. NEVER THROWS, and no caller should await it.
 *
 * Returns an outcome so the admin's "send a test card" button can say what
 * happened — because "Set" is not "working", and the only way to know a key,
 * a token and a list ID all agree is to make Trello answer.
 */
export async function sendCard(
  settings: TrelloSettings,
  input: { kind: CardKind; about?: string; siteUrl?: string },
): Promise<SendOutcome> {
  if (!sendsCardFor(settings, input.kind)) {
    return { ok: false, message: "Nothing is set up to send this kind of card." };
  }
  try {
    const response = await fetch(cardUrl(settings, cardFor(input), memberFor(settings, input.kind)), { method: "POST", cache: "no-store" });
    if (!response.ok) {
      // Trello's own words, which name the field it objected to. Read here
      // rather than guessed from the status, because the status alone sent
      // somebody looking at the one value that was right.
      const said = await response.text().catch(() => "");
      return { ok: false, message: describeSendFailure(response.status, said) };
    }
    return { ok: true, message: "Trello made the card." };
  } catch {
    return { ok: false, message: "Trello could not be reached. The card was not created; the item is still on the admin screen." };
  }
}

/**
 * The everyday call: read the settings and send, if this queue is switched on.
 *
 * One line at each call site, and it cannot throw into the request that a
 * visitor is waiting on.
 */
export async function cardIfWanted(input: { kind: CardKind; about?: string; siteUrl?: string }): Promise<void> {
  try {
    const settings = await readTrello();
    if (!sendsCardFor(settings, input.kind)) return;
    await sendCard(settings, input);
  } catch {
    /* a card is never worth failing a visitor's request over */
  }
}
