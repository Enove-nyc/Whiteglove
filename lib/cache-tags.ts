/**
 * Every place in this codebase that caches a public read (getPublicProviders,
 * getAttractionList, listAgencies, listPublishedMikvaos, …) and every write
 * path that has to bust one of those caches goes through these two helpers,
 * rather than importing `unstable_cache`/`updateTag` from `next/cache`
 * directly.
 *
 * WHY. `next/cache` is not resolvable outside an actual Next.js build —
 * dynamically importing it does not help, it genuinely does not exist as a
 * package in this repo's dependency tree the way `next/headers` does not.
 * Plenty of this codebase's own logic is exercised by plain-Node tests that
 * import these files directly (`npx tsx --test`), with no Next.js runtime
 * present at all. A static `import { updateTag } from "next/cache"` at the
 * top of a widely-imported file — content-admin.ts had exactly this —
 * breaks module loading for every test that imports it, whether or not the
 * test ever calls the function that needed the tag.
 *
 * Both helpers fail safe: outside a real Next.js runtime, a read simply runs
 * uncached (which is correct — a test wants the real, current answer, not a
 * cached one) and a write's invalidation is a silent no-op (there was
 * nothing cached to invalidate in that environment in the first place).
 */

/** Read something through a tagged cache, or run it uncached if next/cache isn't available. */
import { PURGED_STORE } from "@/lib/cache-windows";

export async function cachedRead<T>(
  fn: () => Promise<T>,
  keyParts: string[],
  tags: string[],
  // A DAY, BECAUSE THE PURGE IS WHAT KEEPS THESE TRUE. Every tag that goes
  // through here is busted by its own write path — checked, all seven of them
  // — so this number never governed freshness. What it governed was the floor
  // under every page that reads one: Next takes the shortest cache lifetime in
  // a render as the route's own, so an hour here held /cemeteries/[cemetery]
  // at an hour no matter what the page itself asked for. See lib/cache-windows.ts.
  revalidateSeconds = PURGED_STORE,
): Promise<T> {
  try {
    const { unstable_cache } = await import("next/cache");
    return await unstable_cache(fn, keyParts, { tags, revalidate: revalidateSeconds })();
  } catch {
    return fn();
  }
}

/** Bust a tag written by cachedRead, or do nothing if next/cache isn't available. */
export async function bustTag(tag: string): Promise<void> {
  try {
    const { updateTag } = await import("next/cache");
    updateTag(tag);
  } catch {
    // Nothing cached to invalidate outside a Next.js runtime.
  }
}
