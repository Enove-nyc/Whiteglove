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

export async function edgeLockedPaths(): Promise<string[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return [];
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/get/white-glove:locked-paths`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const payload = (await response.json()) as { result?: string };
    if (!payload.result) return [];
    const parsed = JSON.parse(payload.result);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
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

/**
 * The signed-in account's email, verified in the edge runtime.
 *
 * Mirrors lib/account-session.ts, which uses node's crypto and so cannot run
 * in middleware. Same secret, same input, same base64url output — a cookie
 * minted by one verifies against the other.
 */
export async function edgeAccountEmail(cookieValue?: string): Promise<string | null> {
  if (!cookieValue) return null;
  const separator = cookieValue.lastIndexOf(".");
  if (separator <= 0) return null;
  const encodedEmail = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  if (!encodedEmail || !signature) return null;

  let email: string;
  try {
    email = decodeURIComponent(encodedEmail).trim().toLowerCase();
  } catch {
    return null;
  }

  const secret = process.env.WHITE_GLOVE_SESSION_SECRET || process.env.ADMIN_PASSWORD || "white-glove-development-secret";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expectedBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  const expected = toBase64Url(expectedBytes);

  // Constant-time compare: a length check first, then every byte.
  if (signature.length !== expected.length) return null;
  let differences = 0;
  for (let i = 0; i < signature.length; i += 1) differences |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  return differences === 0 ? email : null;
}

/**
 * May this account see the site while it is closed?
 *
 * Reads the same roster the admin Team screen writes. The owner from
 * OWNER_EMAIL always passes, so a misconfigured store can never shut the owner
 * out of their own site.
 */
export async function edgeAccountHasSiteAccess(email: string | null): Promise<boolean> {
  if (!email) return false;
  const owner = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
  if (owner && email === owner) return true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/get/white-glove:team`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = (await response.json()) as { result?: string };
    if (!payload.result) return false;
    const members = JSON.parse(payload.result) as Array<{ email?: string; admin?: boolean; siteAccess?: boolean }>;
    return members.some((m) => (m.email || "").trim().toLowerCase() === email && (m.siteAccess || m.admin));
  } catch {
    return false;
  }
}
