import { CHECKS, type CheckId, type CheckResult } from "@/lib/health-checks";
import { redact } from "@/lib/redact";

/**
 * The requests that actually find out. Server only.
 *
 * EVERY ONE IS A READ, AND EVERY ONE IS FREE. Nothing here creates, sends or
 * charges anything: a Redis PING, a `SELECT 1`, Stripe's balance, Resend's
 * domain list. A health check that costs money is one somebody turns off, and
 * a health check that sends a real email to prove email works is worse than
 * the problem it detects.
 *
 * NOTHING HERE CAN THROW. Every probe answers with a result, including "this
 * is not configured", because a check that crashes the run takes the other
 * three with it — and the one night that matters is the night something is
 * already wrong.
 *
 * EVERY MESSAGE GOES THROUGH redact. These are provider error strings shown in
 * a browser, and Google is not the only one that quotes your request back at
 * you.
 */

const TIMEOUT_MS = 8000;

function configured(id: CheckId): boolean {
  const meta = CHECKS.find((check) => check.id === id);
  return Boolean(meta?.vars.every((name) => process.env[name]?.trim()));
}

function result(id: CheckId, ok: boolean, detail: string): CheckResult {
  return { id, ok, detail: redact(detail).slice(0, 300), at: new Date().toISOString() };
}

/** Not configured is not a failure — it is a thing nobody has set up yet. */
function unconfigured(id: CheckId): CheckResult {
  const meta = CHECKS.find((check) => check.id === id);
  return result(id, false, `Not set up — ${meta?.vars.join(" and ") ?? "its keys"} ${meta && meta.vars.length > 1 ? "are" : "is"} not set.`);
}

async function timed<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function checkRedis(): Promise<CheckResult> {
  if (!configured("redis")) return unconfigured("redis");
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, "");
    const res = await timed((signal) =>
      fetch(`${url}/ping`, { headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }, cache: "no-store", signal }),
    );
    if (!res.ok) return result("redis", false, `Answered HTTP ${res.status}.`);
    return result("redis", true, "Answered a ping.");
  } catch (error) {
    return result("redis", false, error instanceof Error ? error.message : "Could not be reached.");
  }
}

async function checkPostgres(): Promise<CheckResult> {
  if (!configured("postgres")) return unconfigured("postgres");
  try {
    const { prisma } = await import("@/lib/prisma");
    await timed(() => prisma.$queryRaw`SELECT 1`);
    return result("postgres", true, "Answered a query.");
  } catch (error) {
    return result("postgres", false, error instanceof Error ? error.message : "Could not be reached.");
  }
}

async function checkStripe(): Promise<CheckResult> {
  if (!configured("stripe")) return unconfigured("stripe");
  try {
    // The balance is a read and is not billed. Never a charge, never a
    // customer, never anything that leaves a record on the account.
    const res = await timed((signal) =>
      fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
        cache: "no-store",
        signal,
      }),
    );
    if (res.status === 401) return result("stripe", false, "The key was refused.");
    if (!res.ok) return result("stripe", false, `Answered HTTP ${res.status}.`);
    return result("stripe", true, "The key works.");
  } catch (error) {
    return result("stripe", false, error instanceof Error ? error.message : "Could not be reached.");
  }
}

async function checkResend(): Promise<CheckResult> {
  if (!configured("resend")) return unconfigured("resend");
  try {
    // Listing domains, not sending anything. A health check that emails
    // somebody to prove email works is worse than the fault it looks for.
    const res = await timed((signal) =>
      fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        cache: "no-store",
        signal,
      }),
    );
    if (res.status === 401 || res.status === 403) return result("resend", false, "The key was refused.");
    if (!res.ok) return result("resend", false, `Answered HTTP ${res.status}.`);
    return result("resend", true, "The key works.");
  } catch (error) {
    return result("resend", false, error instanceof Error ? error.message : "Could not be reached.");
  }
}

const PROBES: Record<CheckId, () => Promise<CheckResult>> = {
  redis: checkRedis,
  postgres: checkPostgres,
  stripe: checkStripe,
  resend: checkResend,
};

/** Run them all. One failing probe never stops the others. */
export async function runHealthChecks(): Promise<CheckResult[]> {
  return Promise.all(
    CHECKS.map(async (check) => {
      try {
        return await PROBES[check.id]();
      } catch (error) {
        return result(check.id, false, error instanceof Error ? error.message : "The check itself failed.");
      }
    }),
  );
}
