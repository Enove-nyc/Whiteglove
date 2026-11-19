import { createHash } from "node:crypto";

/**
 * The travel wallet's account copy (owner, 19 November 2026: wallet files are
 * "also saved to the account", not only to the phone). Each file is one R2
 * object, private to the signed-in account that saved it, under
 * wallet/<hash of the account email>/<trip scope>/<file id>. It is never an
 * attachment on the shared trip and nobody else on the trip can read it.
 *
 * Only on Cloudflare (MEDIA_STORE=r2). Anywhere else the wallet stays
 * device-only and says so, rather than pretending to sync.
 */
export const MAX_WALLET_FILE_BYTES = 15 * 1024 * 1024;
/** Per account, across all trips — R2's free 10 GB stays far away. */
export const MAX_WALLET_FILES = 60;
export const WALLET_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const WALLET_KINDS = ["Boarding pass", "Hotel confirmation", "Entry ticket", "Other travel document"] as const;

export type WalletFile = { id: string; name: string; kind: string; type: string; size: number; savedAt: string };

type R2Object = { key: string; size: number; customMetadata?: Record<string, string> };
type R2Body = R2Object & { arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } };
type WalletBucket = {
  get(key: string): Promise<R2Body | null>;
  put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string }; customMetadata: Record<string, string> }): Promise<unknown>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string; limit?: number; cursor?: string; include?: string[] }): Promise<{ objects: R2Object[]; truncated: boolean; cursor?: string }>;
};

export const SCOPE_SHAPE = /^[a-f0-9]{64}$/;
export const FILE_ID_SHAPE = /^[a-f0-9-]{36}$/;

export function walletAvailable(): boolean {
  return process.env.MEDIA_STORE === "r2";
}
async function bucket(): Promise<WalletBucket | null> {
  if (!walletAvailable()) return null;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return (getCloudflareContext().env as unknown as { MEDIA?: WalletBucket }).MEDIA ?? null;
  } catch { return null; }
}
function accountPrefix(email: string): string {
  return `wallet/${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}/`;
}
function key(email: string, scope: string, id: string): string {
  return `${accountPrefix(email)}${scope}/${id}`;
}

/** What a file's first bytes say it is — never the name or the browser's word. */
export function sniffWalletType(bytes: Uint8Array): (typeof WALLET_TYPES)[number] | null {
  if ([37, 80, 68, 70, 45].every((n, i) => bytes[i] === n)) return "application/pdf";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}
export function cleanFileName(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Travel document";
}

async function listPrefix(store: WalletBucket, prefix: string): Promise<R2Object[]> {
  const out: R2Object[] = [];
  let cursor: string | undefined;
  do {
    const page = await store.list({ prefix, cursor, limit: 500, include: ["customMetadata"] });
    out.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor && out.length < 2000);
  return out;
}
function toFile(object: R2Object): WalletFile {
  const meta = object.customMetadata ?? {};
  return { id: object.key.slice(object.key.lastIndexOf("/") + 1), name: meta.name || "Travel document", kind: meta.kind || "Other travel document", type: meta.type || "application/pdf", size: object.size, savedAt: meta.savedAt || "" };
}

export async function listWalletFiles(email: string, scope: string): Promise<WalletFile[] | null> {
  const store = await bucket();
  if (!store) return null;
  const rows = await listPrefix(store, `${accountPrefix(email)}${scope}/`);
  return rows.map(toFile).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
export async function readWalletFile(email: string, scope: string, id: string): Promise<{ file: WalletFile; body: ArrayBuffer } | null> {
  const store = await bucket();
  if (!store) return null;
  const object = await store.get(key(email, scope, id));
  return object ? { file: toFile(object), body: await object.arrayBuffer() } : null;
}
export async function saveWalletFile(email: string, scope: string, file: Omit<WalletFile, "size">, body: ArrayBuffer): Promise<{ ok: true } | { error: string }> {
  const store = await bucket();
  if (!store) return { error: "Saving to your account is not available right now." };
  const existing = await listPrefix(store, accountPrefix(email));
  const target = key(email, scope, file.id);
  if (existing.length >= MAX_WALLET_FILES && !existing.some(object => object.key === target)) {
    return { error: `Your account holds up to ${MAX_WALLET_FILES} wallet files. Remove one to add another.` };
  }
  await store.put(target, body, {
    httpMetadata: { contentType: file.type },
    customMetadata: { name: file.name, kind: file.kind, type: file.type, savedAt: file.savedAt },
  });
  return { ok: true };
}
export async function deleteWalletFile(email: string, scope: string, id: string): Promise<boolean> {
  const store = await bucket();
  if (!store) return false;
  await store.delete(key(email, scope, id));
  return true;
}
