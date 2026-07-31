// Who has been in, and from where.
//
// One line per successful entry: when, how they got in, and roughly where they
// were. Enough to answer "did the person I sent the code to actually look?" and
// "is somebody in who should not be", which is what the log is for.
//
// It deliberately does not keep a full IP address. The last part is dropped, so
// a line reads 203.0.x.x — that still tells one visitor from another and still
// tells you the network, without the site holding a record that identifies a
// specific person's connection. Country and town come from the CDN's own
// headers, which are already there on every request.
//
// Without Redis nothing is written and the screen says so, rather than showing
// an empty list that looks like nobody has visited.

export type SignInEntry = {
  at: string;
  /** How they got in. */
  /**
   * How they got in.
   *
   * "admin code" is the shared password and is anonymous by nature — it is the
   * same secret for everybody who has ever held it. "admin account" is a named
   * administrator opening the admin as themselves, and carries `email`.
   */
  how: "full code" | "five-minute code" | "admin code" | "admin account" | "account" | "invited";
  /** The account's email, when there was one. Codes are anonymous by nature. */
  email?: string;
  country?: string;
  region?: string;
  city?: string;
  /** The address with its last part removed. */
  ip?: string;
  /** What the browser said it was. Trimmed — the full string is noise. */
  device?: string;
  /** Where they were headed. */
  path?: string;
};

const KEY = "white-glove:signins";
const KEEP = 300;

export function signInLogAvailable() {
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

/** Drop the last part of an address, keeping enough to tell visitors apart. */
export function coarseIp(raw?: string | null): string | undefined {
  const first = raw?.split(",")[0]?.trim();
  if (!first) return undefined;
  if (first.includes(":")) {
    // IPv6 — keep the routing prefix, drop the interface half.
    const blocks = first.split(":").filter(Boolean).slice(0, 3);
    return blocks.length ? `${blocks.join(":")}:…` : undefined;
  }
  const octets = first.split(".");
  if (octets.length !== 4) return undefined;
  return `${octets[0]}.${octets[1]}.x.x`;
}

/** A short, readable name for the browser. */
export function shortDevice(userAgent?: string | null): string | undefined {
  if (!userAgent) return undefined;
  const os = /iPhone|iPad/i.test(userAgent)
    ? "iPhone"
    : /Android/i.test(userAgent)
      ? "Android"
      : /Macintosh|Mac OS/i.test(userAgent)
        ? "Mac"
        : /Windows/i.test(userAgent)
          ? "Windows"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : undefined;
  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)
      ? "Chrome"
      : /Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent)
        ? "Safari"
        : /Firefox\//i.test(userAgent)
          ? "Firefox"
          : undefined;
  return [os, browser].filter(Boolean).join(" · ") || undefined;
}

/**
 * Read where a request came from, out of the headers the CDN adds.
 *
 * Vercel sets x-vercel-ip-*; Cloudflare sets cf-ipcountry. Locally there is
 * nothing to read and the fields simply stay empty rather than being guessed.
 */
export function whereFrom(headers: { get(name: string): string | null }) {
  const decode = (value: string | null) => {
    if (!value) return undefined;
    // Vercel percent-encodes non-ASCII city names — "Krak%C3%B3w".
    try {
      return decodeURIComponent(value).trim() || undefined;
    } catch {
      return value.trim() || undefined;
    }
  };
  return {
    country: decode(headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry")),
    region: decode(headers.get("x-vercel-ip-country-region")),
    city: decode(headers.get("x-vercel-ip-city")),
    ip: coarseIp(headers.get("x-forwarded-for") || headers.get("x-real-ip")),
    device: shortDevice(headers.get("user-agent")),
  };
}

/** Write one line. Never throws — a failed log must not fail a sign-in. */
export async function recordSignIn(entry: SignInEntry): Promise<void> {
  if (!signInLogAvailable()) return;
  try {
    await redis(`lpush/${KEY}`, JSON.stringify(entry));
    await redis(`ltrim/${KEY}/0/${KEEP - 1}`);
  } catch {
    /* the sign-in already happened; losing the line is the lesser problem */
  }
}

/** The most recent entries, newest first. */
export async function readSignIns(limit = 100): Promise<SignInEntry[]> {
  if (!signInLogAvailable()) return [];
  const rows = await redis<string[]>(`lrange/${KEY}/0/${Math.max(0, limit - 1)}`);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      try {
        return JSON.parse(row) as SignInEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is SignInEntry => Boolean(e?.at));
}

/** Forget the log. */
export async function clearSignIns(): Promise<boolean> {
  if (!signInLogAvailable()) return false;
  return (await redis(`del/${KEY}`)) !== null;
}

// ---- Revoking everybody at once ---------------------------------------

const GENERATION_KEY = "white-glove:access-generation";

/**
 * Which round of access cookies is current.
 *
 * Every cookie is signed against this number. Raising it is what "revoke
 * access" means — every code already handed out, and every browser already
 * carrying a cookie, stops working at once.
 */
export async function accessGeneration(): Promise<number> {
  const raw = await redis<string>(`get/${GENERATION_KEY}`);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Revoke everybody. Returns the new generation. */
export async function revokeAllAccess(): Promise<number | null> {
  if (!signInLogAvailable()) return null;
  const next = await redis<number>(`incr/${GENERATION_KEY}`);
  return typeof next === "number" ? next : null;
}
