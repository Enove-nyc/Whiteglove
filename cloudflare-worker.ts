/**
 * The site's Cloudflare Worker: OpenNext's built worker for every request, plus
 * a timer (owner, 18 November 2026).
 *
 * THE TIMER. On Railway an in-process scheduler (lib/cron-scheduler.ts) checked
 * followed flights every 30 minutes. A Worker has no process to keep a timer
 * in, so Cloudflare's own cron trigger (wrangler.jsonc, "triggers") calls the
 * existing /api/cron/flight-status route instead — through the Worker's own
 * service binding, behind the same CRON_SECRET as ever. Trip reminders are not
 * here: the daily GitHub workflow (.github/workflows/daily-notifications.yml)
 * already sends them, with a failure alert.
 */

// Built by `opennextjs-cloudflare build` before Wrangler bundles this file.
import openNextWorker from "./.open-next/worker.js";

type Env = {
  CRON_SECRET?: string;
  WORKER_SELF_REFERENCE: { fetch(input: string, init?: RequestInit): Promise<Response> };
};

type ScheduledContext = { waitUntil(promise: Promise<unknown>): void };

const worker = {
  fetch: openNextWorker.fetch,

  async scheduled(_controller: unknown, env: Env, ctx: ScheduledContext): Promise<void> {
    if (!env.CRON_SECRET) {
      console.error("[cron] flight-status timer fired but CRON_SECRET is not set.");
      return;
    }
    ctx.waitUntil(
      env.WORKER_SELF_REFERENCE.fetch("https://www.whitegloveitineraries.com/api/cron/flight-status", {
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      }).then(async (response) => {
        if (!response.ok) console.error(`[cron] flight-status answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }),
    );
  },
};

export default worker;
