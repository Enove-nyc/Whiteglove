function toBase64Url(bytes: ArrayBuffer) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const input = new Uint8Array(bytes);
  let output = "";
  for (let index = 0; index < input.length; index += 3) {
    const a = input[index];
    const b = input[index + 1];
    const c = input[index + 2];
    output += chars[a >> 2];
    output += chars[((a & 3) << 4) | ((b ?? 0) >> 4)];
    output += index + 1 < input.length ? chars[((b! & 15) << 2) | ((c ?? 0) >> 6)] : "";
    output += index + 2 < input.length ? chars[c! & 63] : "";
  }
  return output.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function edgeAccessToken(scope: "admin" | "site") {
  const secret = process.env.WHITE_GLOVE_SESSION_SECRET || process.env.ADMIN_PASSWORD || "white-glove-development-secret";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`white-glove:${scope}`));
  return toBase64Url(signature);
}

export async function edgeSiteIsLocked() {
  if (process.env.SITE_LOCK_ENABLED === "true") return true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/get/white-glove:site-lock`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const payload = (await response.json()) as { result?: string };
    return payload.result === "on";
  } catch {
    return false;
  }
}
