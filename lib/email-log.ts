// A shared record of what happened to the last few outgoing emails.
//
// Why this exists: every send used to record its outcome in a module-level
// variable. On Vercel each route runs in its own serverless instance, so a
// failure inside /api/contact was written into that instance's memory and the
// admin dashboard — a different instance — never saw it. The owner could send a
// test successfully from the dashboard and still have contact-form messages
// disappear with nothing anywhere to say why.
//
// Writing the outcome to the shared store instead means the dashboard reports
// what actually happened to real messages, not just to its own test.

const KEY = "white-glove:email-log";
const KEEP = 25;

export type EmailLogEntry = {
  at: string;
  /** "contact form", "edit suggestion", "test", … */
  kind: string;
  to: string;
  ok: boolean;
  status?: number;
  error?: string;
  /** True when Resend refused the shared sandbox sender. */
  sandboxRestricted?: boolean;
};

function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function call<T>(command: string): Promise<{ result: T } | undefined> {
  const c = config();
  if (!c) return undefined;
  try {
    const res = await fetch(`${c.url}/${command}`, {
      headers: { Authorization: `Bearer ${c.token}` },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    return (await res.json()) as { result: T };
  } catch {
    return undefined;
  }
}

/** Records one send outcome. Never throws — logging must not break sending. */
export async function recordEmailAttempt(entry: EmailLogEntry): Promise<void> {
  try {
    const existing = await readLog();
    const next = [entry, ...existing].slice(0, KEEP);
    await call(`set/${encodeURIComponent(KEY)}/${encodeURIComponent(JSON.stringify(next))}`);
  } catch {
    /* the message still went out (or didn't); the log is best-effort */
  }
}

export async function readEmailLog(): Promise<EmailLogEntry[]> {
  return readLog();
}

async function readLog(): Promise<EmailLogEntry[]> {
  const res = await call<string>(`get/${encodeURIComponent(KEY)}`);
  if (!res?.result) return [];
  try {
    const parsed = JSON.parse(res.result);
    return Array.isArray(parsed) ? (parsed as EmailLogEntry[]) : [];
  } catch {
    return [];
  }
}

/** Whether the log can be kept at all — no Redis, no cross-instance history. */
export function emailLogAvailable() {
  return Boolean(config());
}
