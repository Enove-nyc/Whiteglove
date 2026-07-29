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
 * The environment variables this app treats as secret. Anything listed here has
 * its value struck out of every diagnostic message, whatever produced it.
 */
const SECRET_ENV_VARS = [
  "GOOGLE_MAPS_API_KEY",
  "GEMINI_API_KEY",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "DATABASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "WHITE_GLOVE_SESSION_SECRET",
  "ADMIN_PASSWORD",
  "SITE_ACCESS_PASSWORD",
  "SITE_PREVIEW_TOKEN",
  // DUFFEL_ACCESS_TOKEN is the name the code actually reads; DUFFEL_API_KEY was
  // listed here and is not set anywhere, so until now a Duffel error quoting
  // the token back would have gone to the browser unstruck. Both are listed
  // rather than one swapped for the other, in case an older deployment still
  // carries the old name.
  "DUFFEL_ACCESS_TOKEN",
  "DUFFEL_API_KEY",
  "BOOKING_AFFILIATE_ID",
  "TRAVELPAYOUTS_MARKER",
] as const;

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
