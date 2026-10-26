/**
 * HOW LONG A PAGE MAY BE SERVED WITHOUT BEING BUILT AGAIN.
 *
 * The site's content pages were set to rebuild every sixty seconds. That was
 * never about freshness — every one of them is purged by name the moment the
 * admin saves it (revalidatePath in the editors' actions), so an edit shows up
 * at once however long this number is. Sixty seconds only governed how often a
 * page nobody had changed was built again for nothing.
 *
 * AND SOMETHING IS ALWAYS ASKING. In the last seven days the kosher site took
 * 43,851 requests, almost all of them crawlers walking the 809 addresses in the
 * sitemap, around the clock. At sixty seconds that is a rebuild for nearly
 * every one of them, which is what kept the database from ever going idle —
 * and Neon bills for being awake, not for queries. The bill, not the browser,
 * is what this number was costing.
 *
 * THE CONTRACT THIS DEPENDS ON: a page may use this window ONLY if every write
 * that changes it calls revalidatePath for its address. A page that is not
 * purged on write must not use it — it would go a day out of date. The test
 * beside this file names the pages that use it and checks the purge exists.
 */
export const PURGED_ON_WRITE = 86_400; // a day

/**
 * For pages built entirely from the files in data/ — no database, nothing an
 * editor can change. They move when a deploy moves them, and a deploy rebuilds
 * everything, so the window is a formality.
 */
export const BUILT_IN_CONTENT = 86_400; // a day

/**
 * For a store whose cache entry is dropped by name when it is written —
 * updateTag(TAG) in its own write path.
 *
 * THESE SET THE FLOOR UNDER EVERY PAGE THAT READS THEM. Next takes the
 * SHORTEST cache lifetime anywhere in a render as the route's own, so an hour
 * here capped /cemeteries/[cemetery] and /tzaddikim/[person] at an hour however
 * long their own window said. That hour was never buying freshness: the purge
 * does that, the instant something is saved.
 *
 * NOT FOR A CACHE THAT REFRESHES BY TIME ALONE. lib/travel-advisories.ts reads
 * somebody else's data, which changes without anybody writing here, so nothing
 * can purge it and the clock is the only thing keeping it true. A day-old
 * travel advisory is a traveller's problem, so it keeps the short window.
 */
export const PURGED_STORE = 86_400; // a day
