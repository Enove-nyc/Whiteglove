// Cached public reads, busted the moment a write happens.
//
// THE PROBLEM THIS SOLVES, and it is the same one lib/directory.ts already
// solved for the businesses. Half a dozen public pages were `force-dynamic`:
// /heritage, /map, /mikvaos, /hechsherim, /destinations. Every one of them
// reads whole tables — 176 batei hachaim, 341 kevarim, 150 attractions — and
// force-dynamic means running that read again for every single visit,
// including every hit from a crawler working through the sitemap. The owner's
// Neon project hit its monthly data-transfer quota and the setup button came
// back with "Your project has exceeded the data transfer quota".
//
// A plain `revalidate` window is NOT the fix, and this has been measured
// twice: several of these reads mix Prisma with a `cache: "no-store"` fetch to
// Redis, and a no-store fetch inside a page leaves the page frozen at its
// build-time render however long the window is. That is exactly why those
// pages were force-dynamic in the first place, and deleting the line without
// replacing the mechanism would take the site back to "a listing added on
// Tuesday is still missing on Friday".
//
// So the DATA is cached here rather than the page being timed. Each reader
// gets a tag; every write path calls updateTag on it; freshness stays
// instant-on-save, and the render is reused for every visit in between.
//
// `next/cache` is imported dynamically rather than at module scope, for the
// same reason lib/directory.ts does it: these modules are imported by plain
// Node tests with no Next.js request context, and a top-level import breaks
// module resolution for all of them even when nothing calls the function.

/** Batei hachaim and the kevarim in them. /heritage, /cemeteries, /stops, /map. */
export const CEMETERIES_PUBLIC_TAG = "cemeteries-public";
/** Attractions, kosher stays and quarters. /things-to-do, /hotels, /map, /destinations. */
export const ATTRACTIONS_PUBLIC_TAG = "attractions-public";
/** Mikvah listings. /mikvaos, and the town pages that count them. */
export const MIKVAOS_PUBLIC_TAG = "mikvaos-public";
/** Certifying agencies the owner has added. /hechsherim. */
export const HECHSHERIM_PUBLIC_TAG = "hechsherim-public";

/**
 * Every tag a content write can invalidate.
 *
 * A save in the admin can touch more than one of these — a PracticalPlace of
 * category MIKVAH is both a listing and a mikvah — and working out which is
 * more trouble than it saves. Busting all of them costs one extra read of a
 * table nobody changed; missing one costs an edit that never appears, which is
 * the failure this whole file exists to prevent.
 */
export const PUBLIC_CONTENT_TAGS = [
  CEMETERIES_PUBLIC_TAG,
  ATTRACTIONS_PUBLIC_TAG,
  MIKVAOS_PUBLIC_TAG,
  HECHSHERIM_PUBLIC_TAG,
] as const;

/**
 * Wrap a public read so it is served from cache until its tag is busted.
 *
 * The `revalidate` window underneath is a safety net and not the mechanism:
 * every write path calls bustPublicContent, so in practice an hour is never
 * what makes an edit appear. It only matters if a write path is ever added
 * that forgets to.
 */
export async function cachedPublicRead<T>(read: () => Promise<T>, key: string, tag: string): Promise<T> {
  const { unstable_cache } = await import("next/cache");
  return unstable_cache(read, [key], { tags: [tag], revalidate: 3600 })();
}

/**
 * Say that content changed, so the next visit reads it again.
 *
 * Safe to call from anywhere a write happens, including code paths that also
 * run outside a request — the import is dynamic and the failure is swallowed,
 * because a cache tag that could not be busted must never turn a successful
 * save into an error the owner sees.
 */
export async function bustPublicContent(): Promise<void> {
  try {
    const { updateTag } = await import("next/cache");
    for (const tag of PUBLIC_CONTENT_TAGS) updateTag(tag);
  } catch {
    /* Not in a context that can invalidate. The hourly window still covers it. */
  }
}
