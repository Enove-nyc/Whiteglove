// Where a boarding pass actually lives.
//
// ITS OWN STORE, not the media store the advertisements use. That one is
// served by a public route, cached for a year, and its whole access model is
// "the id is unguessable". That is right for a banner image and wrong for a
// document carrying somebody's name and booking reference — a link pasted into
// a group chat would hand a stranger the means to change a flight.
//
// So each file is stored WITH THE EMAIL OF THE ACCOUNT THAT UPLOADED IT, and
// reading one is a question with two parts: which file, and who is asking.

import { randomUUID } from "node:crypto";
import { type Attachment, type AttachmentKind, dataUrlBytes, dataUrlType } from "@/lib/attachments";

const key = (id: string) => `white-glove:attachment:${id}`;

export function attachmentStoreAvailable() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

type Stored = {
  /** Lowercased, the way accounts are compared everywhere else. */
  owner: string;
  contentType: string;
  name: string;
  kind: AttachmentKind;
  addedAt: string;
  /** base64, without the data: prefix. */
  data: string;
};

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

function normalize(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Keep a file, and answer with the reference that goes into the itinerary.
 *
 * The reference carries no data — a name, a size and an id. The itinerary is
 * saved, shared and printed as ordinary JSON, and a pass baked into it would
 * travel everywhere the trip travels.
 */
export async function putAttachment(input: {
  owner: string;
  name: string;
  kind: AttachmentKind;
  dataUrl: string;
  note?: string;
}): Promise<Attachment | null> {
  if (!attachmentStoreAvailable()) return null;
  const owner = normalize(input.owner);
  if (!owner) return null;

  const contentType = dataUrlType(input.dataUrl);
  const base64 = input.dataUrl.slice(input.dataUrl.indexOf(",") + 1);
  const id = randomUUID();
  const addedAt = new Date().toISOString();

  const stored: Stored = { owner, contentType, name: input.name.trim(), kind: input.kind, addedAt, data: base64 };
  const wrote = await redis(`set/${key(id)}`, JSON.stringify(stored));
  if (wrote === null) return null;

  return {
    id,
    kind: input.kind,
    name: stored.name,
    contentType,
    bytes: dataUrlBytes(input.dataUrl),
    addedAt,
    note: input.note?.trim() || undefined,
  };
}

/**
 * One file, for the person asking.
 *
 * Null when it does not exist AND when it belongs to somebody else — the same
 * answer on purpose, so that asking for a file tells nobody whether it is
 * there. Every id is a UUID, so this is not a lockout risk for the owner.
 */
export async function getAttachmentFor(
  id: string,
  asker: string,
): Promise<{ contentType: string; name: string; data: string } | null> {
  if (!attachmentStoreAvailable() || !id || !asker) return null;
  const raw = await redis<string>(`get/${key(id)}`);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as Stored;
    if (!stored?.owner || stored.owner !== normalize(asker)) return null;
    return { contentType: stored.contentType, name: stored.name, data: stored.data };
  } catch {
    return null;
  }
}

/**
 * Throw one away.
 *
 * Checked against the owner for the same reason reading is. Returns true when
 * it is gone, including when it was never there — the caller's next step is
 * the same either way.
 */
export async function deleteAttachmentFor(id: string, asker: string): Promise<boolean> {
  if (!attachmentStoreAvailable() || !id || !asker) return false;
  const raw = await redis<string>(`get/${key(id)}`);
  if (!raw) return true;
  try {
    const stored = JSON.parse(raw) as Stored;
    if (stored?.owner !== normalize(asker)) return false;
  } catch {
    // Unreadable: nobody can prove it is theirs, so nobody may remove it.
    return false;
  }
  return (await redis(`del/${key(id)}`)) !== null;
}
