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
import { EDGE_CACHE_SECONDS, edgeCacheKey, edgeCacheable } from "./lib/edge-page-cache";

type Env = {
  CRON_SECRET?: string;
  /** Which deploy is running; keys the page cache so a release never serves an old page. */
  CF_VERSION_METADATA?: { id?: string };
  WORKER_SELF_REFERENCE: { fetch(input: string, init?: RequestInit): Promise<Response> };
};

type ScheduledContext = { waitUntil(promise: Promise<unknown>): void };
type EdgeCache = { match(key: string): Promise<Response | undefined>; put(key: string, response: Response): Promise<void> };

const worker = {
  /**
   * The pages that are the same for every signed-out visitor come from a
   * five-minute copy at the edge (lib/edge-page-cache.ts); everything else,
   * and anybody signed in, goes to the app exactly as before.
   */
  async fetch(request: Request, env: Env, ctx: ScheduledContext): Promise<Response> {
    const key = edgeCacheKey(request, env.CF_VERSION_METADATA?.id ?? "");
    const cache = key ? (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default : undefined;
    if (!key || !cache) return openNextWorker.fetch(request, env, ctx);
    try {
      const hit = await cache.match(key);
      if (hit) {
        const served = new Response(hit.body, hit);
        served.headers.set("x-edge-cache", "hit");
        // The browser keeps nothing: somebody who signs in a minute later must
        // get their own page from the app, not this copy from their own cache.
        served.headers.set("cache-control", "private, no-cache");
        return served;
      }
    } catch {
      /* a cache that cannot be read is simply a miss */
    }
    const response: Response = await openNextWorker.fetch(request, env, ctx);
    if (edgeCacheable(response)) {
      const copy = new Response(response.clone().body, response);
      copy.headers.set("cache-control", `public, max-age=${EDGE_CACHE_SECONDS}`);
      ctx.waitUntil(cache.put(key, copy).catch(() => undefined));
    }
    return response;
  },

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
