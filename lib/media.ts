// Small media store for admin-uploaded advertisement images and PDFs. Files are
// base64-encoded into a single Redis value (Upstash REST) and served back to
// visitors through /api/media. Kept out of any list so lookups stay fast.

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]);

// Cap uploads so a single base64 value stays within Upstash's request limit.
export const MAX_MEDIA_BYTES = 900 * 1024;

export function isAllowedMediaType(type: string) {
  return ALLOWED_TYPES.has(type);
}

const mediaKey = (id: string) => `white-glove:media:${id}`;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function mediaStoreAvailable() {
  return Boolean(redisConfig());
}

type StoredMedia = { contentType: string; data: string };

async function redisSetBody(key: string, value: string): Promise<boolean> {
  const config = redisConfig();
  if (!config) return false;
  try {
    const res = await fetch(`${config.url}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}` },
      body: value,
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function redisGet(key: string): Promise<string | undefined> {
  const config = redisConfig();
  if (!config) return undefined;
  try {
    const res = await fetch(`${config.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    return ((await res.json()) as { result?: string }).result;
  } catch {
    return undefined;
  }
}

/** Store a file and return its id, or null on failure. */
export async function putMedia(contentType: string, base64: string): Promise<string | null> {
  if (!mediaStoreAvailable()) return null;
  const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ok = await redisSetBody(mediaKey(id), JSON.stringify({ contentType, data: base64 } satisfies StoredMedia));
  return ok ? id : null;
}

export async function getMedia(id: string): Promise<StoredMedia | null> {
  const raw = await redisGet(mediaKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredMedia;
    return parsed?.data ? parsed : null;
  } catch {
    return null;
  }
}
