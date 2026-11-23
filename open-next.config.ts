import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

/**
 * How the site runs on Cloudflare Workers (wrangler.jsonc).
 *
 * THE CACHE IS KEPT, NOT DROPPED. The site's settings and content reads are
 * cached by tag and refreshed when the admin saves (lib/cache-tags.ts —
 * AGENTS.md, "Database cost changes"). Pages and data are cached in R2; the
 * tags that expire them live in D1, so a save in the admin still refreshes
 * what visitors see straight away, and an unchanged page costs no database
 * read at all.
 */
export default defineCloudflareConfig(process.env.WG_ISOLATED_PREVIEW === "1" ? {} : {
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: memoryQueue,
});
