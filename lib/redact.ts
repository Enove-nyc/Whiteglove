import { CONNECTIONS } from "@/lib/connections";

// Keep secrets out of anything a browser can see.
//
// The admin diagnostics exist to say why a key is not working, which means they
// pass through error text written by somebody else's server. Google, in
// particular, will happily quote the request back at you — and a key that
// reaches the browser has to be treated as burned, whoever it was shown to.
//
// So nothing goes out of a diagnostic without passing through here first. Two
// passes: every secret this deployment actually holds, then anything shaped
// like a credential in case a provider invents a new way to echo one.

/**
 * Values that are MEANT to be public, and must not be struck out.
 *
 * NEXT_PUBLIC_* is inlined into pages by Next.js by definition. The VAPID
 * public key is handed to every browser that subscribes to a notification —
 * that is what it is for. Redacting either would mangle honest output while
 * protecting nothing.
 */
const PUBLIC_ENV_VARS = new Set(["VAPID_PUBLIC_KEY"]);

/**
 * Secrets this deployment holds that lib/connections.ts does not name.
 *
 * Everything a person would call a connection is listed there. These are the
 * few that are not connections to anywhere: the session signing key, the site's
 * own passwords, an old variable name a deployment might still carry.
 */
const EXTRA_SECRET_ENV_VARS = [
  "WHITE_GLOVE_SESSION_SECRET",
  "ADMIN_PASSWORD",
  "SITE_ACCESS_PASSWORD",
  "SITE_PREVIEW_PASSWORD",
  "SITE_PREVIEW_TOKEN",
  "CRON_SECRET",
  // DUFFEL_ACCESS_TOKEN is the name the code actually reads. DUFFEL_API_KEY
  // was once the only one listed and is not set anywhere, so a Duffel error
  // quoting the token back went to the browser unstruck until somebody
  // noticed. Kept in case an older deployment still carries the old name —
  // and kept as the reason this list is no longer maintained by hand.
  "DUFFEL_API_KEY",
] as const;

/**
 * The environment variables this app treats as secret.
 *
 * DERIVED, NOT MAINTAINED. This was a hand-written list and it went stale in
 * both directions at once: it named DUFFEL_API_KEY, which nothing sets, while
 * missing DUFFEL_ACCESS_TOKEN, which everything reads — so a Duffel error
 * quoting the token back reached the browser unstruck. Fixing that one entry
 * fixed one entry. A cross-check afterwards found eighteen more, including the
 * Stripe secret key, the Google client secret and the Twilio auth token.
 *
 * So the list is now read off lib/connections.ts — which already has a test
 * failing when a variable the code reads is not named there — and anything
 * credential-shaped in it is treated as secret. A new integration is protected
 * the moment somebody adds it to the screen that says what breaks without it,
 * which is a thing they cannot forget to do, rather than a second list they
 * can.
 *
 * Shape, not judgement: a name ending in _KEY, _TOKEN, _SECRET or _PASSWORD.
 * Over-inclusion costs a struck-out string in a diagnostic. Under-inclusion
 * costs a live credential in a browser, and those are not the same mistake.
 */
export const SECRET_ENV_VARS: readonly string[] = [
  ...new Set([
    ...CONNECTIONS.flatMap((connection) => connection.vars).filter(
      (name) => /(_KEY|_TOKEN|_SECRET|_PASSWORD)$/.test(name) && !name.startsWith("NEXT_PUBLIC_") && !PUBLIC_ENV_VARS.has(name),
    ),
    ...EXTRA_SECRET_ENV_VARS,
  ]),
];

const MASK = "[redacted]";

/**
 * Credential shapes, for secrets this deployment does not hold — a key quoted
 * back from a misconfigured provider, or one pasted into a form by mistake.
 */
const PATTERNS: Array<[RegExp, string]> = [
  // Google API keys.
  [/AIza[0-9A-Za-z_-]{10,}/g, MASK],
  // Anthropic.
  [/sk-ant-[0-9A-Za-z_-]{10,}/g, MASK],
  // OpenAI-style.
  [/\bsk-[0-9A-Za-z]{20,}/g, MASK],
  // Resend.
  [/\bre_[0-9A-Za-z_-]{10,}/g, MASK],
  // Duffel, both modes. Its errors quote the request back on some failures.
  [/\bduffel_(?:test|live)_[0-9A-Za-z_-]{10,}/g, MASK],
  // Stripe: secret, restricted and webhook signing keys. Underscore-separated,
  // so the OpenAI `sk-` rule above never matched one.
  [/\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{10,}/g, MASK],
  [/\bwhsec_[0-9A-Za-z]{10,}/g, MASK],
  // A Google OAuth client secret.
  [/\bGOCSPX-[0-9A-Za-z_-]{10,}/g, MASK],
  // A key handed over in a query string, whatever it is called.
  [/([?&](?:key|api_?key|token|access_token|password|secret)=)[^&\s"']+/gi, `$1${MASK}`],
  // Authorization / api-key headers quoted back in an error.
  [/((?:authorization|x-api-key|x-goog-api-key|api-key)\s*[:=]\s*)(?:bearer\s+)?[^\s,;"']+/gi, `$1${MASK}`],
  // A connection string with credentials in it.
  [/\b([a-z+]+:\/\/)[^:@/\s]+:[^@/\s]+@/gi, `$1${MASK}@`],
];

/** Every secret value this deployment actually holds, longest first. */
function knownSecrets(): string[] {
  const values: string[] = [];
  for (const name of SECRET_ENV_VARS) {
    const value = process.env[name]?.trim();
    // Very short values are words, not secrets — striking them would mangle
    // ordinary prose.
    if (value && value.length >= 8) values.push(value);
  }
  return values.sort((a, b) => b.length - a.length);
}

/**
 * Strike every secret out of a string.
 *
 * Safe to call on anything, including text that holds no secret at all.
 */
export function redact(text: string): string {
  if (!text) return text;
  let out = text;
  for (const secret of knownSecrets()) {
    out = out.split(secret).join(MASK);
  }
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** The message of an unknown thrown value, with secrets struck out. */
export function redactError(error: unknown): string {
  return redact(error instanceof Error ? error.message : String(error));
}

/**
 * Strike secrets out of every string in a payload, however deeply nested.
 *
 * Diagnostics return objects, and it is easier to guarantee this at the point
 * of response than to remember which field came from where.
 */
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redact(value) as unknown as T;
  if (Array.isArray(value)) return value.map(redactDeep) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactDeep(v);
    return out as T;
  }
  return value;
}
