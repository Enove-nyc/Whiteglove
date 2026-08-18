/**
 * Where a browser's "your policy would have blocked this" reports are kept.
 *
 * THE WHOLE POINT OF A REPORT-ONLY PHASE. A Content-Security-Policy names the
 * outside hosts a page may load, and getting that list wrong takes a booking
 * form or the card entry down without a sound. Report-Only mode blocks nothing
 * and instead sends a report here for every load the enforcing policy WOULD
 * have refused. Two hand-offs on this site — the Travelpayouts search widgets
 * and the Duffel card form — reach hosts that cannot be read off the source,
 * only watched. This is where the watching lands.
 *
 * AGGREGATED, NOT LOGGED ONE BY ONE. A single visitor on /book can generate
 * dozens of identical reports a second, and a raw log of them is unreadable
 * and unbounded. So a report is reduced to the one thing that matters — which
 * directive stopped which host — and counted. Ten thousand reports about
 * tp.media become one row saying "connect-src, tp.media, 10,000, last seen
 * just now". A short list of the newest raw examples is kept alongside, for
 * when the host alone does not explain it.
 *
 * IT NEEDS UPSTASH, and does nothing without it — the same store accounts and
 * the rate limiter already use. With no store the reports are dropped, which
 * is the right failure: a diagnostic that cannot save is not worth failing a
 * page over.
 */

const COUNTS_KEY = "white-glove:csp:counts";
const SAMPLES_KEY = "white-glove:csp:samples";
const SAMPLE_CAP = 40;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function cspReportStoreAvailable(): boolean {
  return Boolean(redisConfig());
}

/** The fields worth keeping from one browser report, whichever format it came in. */
export type CspViolation = {
  /** The directive that would have blocked it, e.g. "connect-src". */
  directive: string;
  /** The host that would have been blocked, reduced to scheme + host. */
  blocked: string;
  /** The page it happened on, path only — never the query. */
  documentPath: string;
};

/**
 * A blocked URL, reduced to the part a policy is written in.
 *
 * "https://tp.media/content?marker=123&..." is written in a policy as
 * "https://tp.media", so that is what is counted — otherwise every distinct
 * query string is a different row and the count that matters is lost in them.
 * Keywords the spec uses ("inline", "eval", "data") are kept as they are.
 */
export function blockedOrigin(raw: string): string {
  const value = (raw || "").trim();
  if (!value) return "unknown";
  if (!/^https?:\/\//i.test(value)) {
    // "inline", "eval", "data", "blob", "wasm-eval" and the like.
    return value.split(/[\s;]/)[0].slice(0, 40) || "inline";
  }
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "unknown";
  }
}

/** A path with any query and fragment removed. A report is not a place for a token. */
function pathOnly(raw: string): string {
  const value = (raw || "").trim();
  if (!value) return "/";
  try {
    return new URL(value, "https://x").pathname.slice(0, 200) || "/";
  } catch {
    return value.split(/[?#]/)[0].slice(0, 200) || "/";
  }
}

/**
 * Pull the fields out of a report body, in either format the browser may send.
 *
 * The old model posts `{ "csp-report": { "violated-directive", "blocked-uri",
 * "document-uri" } }`; the Reporting API posts an array of
 * `{ "type": "csp-violation", "body": { effectiveDirective, blockedURL,
 * ... } }`. Both are handled, so the endpoint does not care which the visitor's
 * browser speaks, and a shape it does not recognise is dropped rather than
 * guessed at.
 */
export function parseViolations(payload: unknown, referer: string): CspViolation[] {
  const out: CspViolation[] = [];
  const push = (directive: unknown, blocked: unknown, docUri: unknown) => {
    const dir = typeof directive === "string" ? directive.split(/\s/)[0].trim() : "";
    if (!dir) return;
    out.push({
      directive: dir.slice(0, 40),
      blocked: blockedOrigin(typeof blocked === "string" ? blocked : ""),
      documentPath: pathOnly(typeof docUri === "string" && docUri ? docUri : referer),
    });
  };

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const body = (entry as { body?: Record<string, unknown>; type?: string });
      if (body?.type && body.type !== "csp-violation") continue;
      const b = body?.body ?? {};
      push(b.effectiveDirective ?? b.violatedDirective, b.blockedURL ?? b.blockedURI, b.documentURL ?? b.documentURI);
    }
  } else if (payload && typeof payload === "object") {
    const legacy = (payload as { "csp-report"?: Record<string, unknown> })["csp-report"];
    if (legacy) push(legacy["violated-directive"], legacy["blocked-uri"], legacy["document-uri"]);
  }
  return out;
}

async function redis(path: string, config: { url: string; token: string }, body?: unknown) {
  return fetch(`${config.url}/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${config.token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
}

/**
 * Record a batch of violations: bump the per-host counters, keep a few samples.
 *
 * `now` is passed in rather than read here so the caller owns the clock — the
 * same discipline the rest of the codebase keeps around Date.now().
 */
export async function recordViolations(violations: CspViolation[], now: number): Promise<void> {
  const config = redisConfig();
  if (!config || violations.length === 0) return;

  // One HINCRBY per distinct directive|host in the batch, folded first so a
  // burst of identical reports is one write with a count, not a write each.
  const bumps = new Map<string, number>();
  for (const v of violations) {
    const field = `${v.directive}|${v.blocked}`;
    bumps.set(field, (bumps.get(field) ?? 0) + 1);
  }

  await Promise.all(
    [...bumps].map(([field, by]) =>
      redis(`hincrby/${encodeURIComponent(COUNTS_KEY)}/${encodeURIComponent(field)}/${by}`, config).catch(() => undefined),
    ),
  );

  // A capped list of the newest raw examples, for when the host is not enough.
  const sample = violations[violations.length - 1];
  await redis(`lpush/${encodeURIComponent(SAMPLES_KEY)}`, config, [
    JSON.stringify({ ...sample, at: now }),
  ]).catch(() => undefined);
  await redis(`ltrim/${encodeURIComponent(SAMPLES_KEY)}/0/${SAMPLE_CAP - 1}`, config).catch(() => undefined);
}

export type CspSummaryRow = { directive: string; blocked: string; count: number };
export type CspSample = { directive: string; blocked: string; documentPath: string; at: number };
export type CspSummary = { available: boolean; rows: CspSummaryRow[]; samples: CspSample[]; total: number };

/** Everything the admin viewer shows: the counted rows, worst first, and the raw tail. */
export async function readCspSummary(): Promise<CspSummary> {
  const config = redisConfig();
  if (!config) return { available: false, rows: [], samples: [], total: 0 };

  const countsRes = await redis(`hgetall/${encodeURIComponent(COUNTS_KEY)}`, config).catch(() => null);
  const samplesRes = await redis(`lrange/${encodeURIComponent(SAMPLES_KEY)}/0/${SAMPLE_CAP - 1}`, config).catch(() => null);

  const rows: CspSummaryRow[] = [];
  if (countsRes?.ok) {
    const flat = ((await countsRes.json().catch(() => null)) as { result?: string[] } | null)?.result ?? [];
    // hgetall returns [field, value, field, value, …].
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const [directive, blocked] = flat[i].split("|");
      rows.push({ directive: directive ?? "?", blocked: blocked ?? "?", count: Number(flat[i + 1]) || 0 });
    }
  }
  rows.sort((a, b) => b.count - a.count);

  const samples: CspSample[] = [];
  if (samplesRes?.ok) {
    const list = ((await samplesRes.json().catch(() => null)) as { result?: string[] } | null)?.result ?? [];
    for (const raw of list) {
      try {
        const parsed = JSON.parse(raw) as CspSample;
        if (parsed && parsed.directive) samples.push(parsed);
      } catch {
        // A malformed sample is skipped, not fatal — it is a diagnostic tail.
      }
    }
  }

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return { available: true, rows, samples, total };
}

/** Wipe the collected reports — for starting a clean watch after a policy change. */
export async function clearCspReports(): Promise<void> {
  const config = redisConfig();
  if (!config) return;
  await redis(`del/${encodeURIComponent(COUNTS_KEY)}/${encodeURIComponent(SAMPLES_KEY)}`, config).catch(() => undefined);
}
