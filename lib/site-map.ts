/**
 * Every address on this site that a search engine should know about.
 *
 * THERE WAS NO SITEMAP AND NO robots.txt. Both addresses returned the "Destination
 * not found" page, because `/robots.txt` and `/sitemap.xml` fell through to the
 * `[city]` route and were treated as towns. So Google had no list of the three
 * hundred-odd towns, batei hachaim, tzaddikim and guides on here, and no
 * instruction about where not to go. Every one of them had to be stumbled
 * across.
 *
 * THE ONE RULE THIS FILE EXISTS TO KEEP: **nothing here may be a page that says
 * noindex.** A sitemap that submits a page the page itself refuses is not a
 * small mistake — Google reports it as an error against the whole site, and the
 * two are impossible to reconcile from the outside. So the private addresses are
 * named once, below, and both the sitemap and robots.txt read that same list.
 * A test walks the app directory and fails if a page starts refusing indexing
 * without being added here.
 *
 * PRIORITIES ARE A HINT AND NOTHING MORE. Google has said for years that it
 * largely ignores them. They are set so the ordering is at least honest — the
 * front page above a town, a town above a legal page — rather than every page
 * claiming to be the most important one on the site.
 */

import { cemeteries } from "@/data/cemeteries";
import { cityGuides } from "@/data/destinations-detailed";
import { bulkDestinations } from "@/data/destinations-bulk";
import { vacationDestinations } from "@/data/vacation-destinations";
import { heritageTownHref, vacationDestinationHref } from "@/lib/route-migration";
import { allTzaddikim } from "@/lib/tzaddikim";

/**
 * Addresses no search engine should index or list.
 *
 * Three kinds, and they are here for three different reasons:
 *  - **somebody's own** (`/account`, `/itinerary`, `/my-route`, `/i/`) — private
 *    by nature, and the pages already say noindex;
 *  - **the way in** (`/admin`, `/login`, `/access`) — no value in a search
 *    result, and an admin door in an index is an invitation;
 *  - **machinery** (`/api`, `/version`) — not pages at all.
 */
export const PRIVATE_PATHS = [
  "/admin",
  "/api",
  "/account",
  "/login",
  "/access",
  "/itinerary",
  "/my-route",
  "/command-center",
  "/book/review",
  "/i/",
  "/version",
] as const;

/** Is this address one a crawler should be kept away from? */
export function isPrivatePath(path: string): boolean {
  return PRIVATE_PATHS.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));
}

/**
 * The pages that are not generated from a list — written out, because there is
 * no single place in the app that knows them.
 *
 * `changeFrequency` is the honest answer for each: the directory really does
 * change weekly, and the terms really do not.
 */
const STATIC_PAGES: ReadonlyArray<{ path: string; priority: number; changeFrequency: ChangeFrequency }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/plan", priority: 0.9, changeFrequency: "monthly" },
  { path: "/kosher-travel", priority: 0.8, changeFrequency: "monthly" },
  // The heritage section's own landing page. Its contents — the towns, the
  // batei hachaim, the tzaddikim — are listed below as they always were.
  { path: "/heritage", priority: 0.8, changeFrequency: "weekly" },
  { path: "/stops", priority: 0.9, changeFrequency: "weekly" },
  { path: "/cemeteries", priority: 0.9, changeFrequency: "weekly" },
  { path: "/tzaddikim", priority: 0.9, changeFrequency: "weekly" },
  { path: "/directory", priority: 0.8, changeFrequency: "weekly" },
  { path: "/map", priority: 0.7, changeFrequency: "weekly" },
  { path: "/kosher", priority: 0.8, changeFrequency: "weekly" },
  { path: "/hotels", priority: 0.7, changeFrequency: "weekly" },
  { path: "/things-to-do", priority: 0.7, changeFrequency: "weekly" },
  { path: "/travel-guide", priority: 0.8, changeFrequency: "monthly" },
  { path: "/services", priority: 0.7, changeFrequency: "monthly" },
  // /getaways is gone and redirects here (next.config.ts). A redirecting
  // address must not be in the sitemap — Google reports that as an error
  // against the site, the same way a noindexed one is.
  { path: "/destinations", priority: 0.9, changeFrequency: "weekly" },
  // How the four labels on every practical detail are decided. Indexed
  // deliberately: it is the page that makes the rest of the site checkable.
  { path: "/hechsherim", priority: 0.6, changeFrequency: "monthly" },
  { path: "/verification", priority: 0.5, changeFrequency: "yearly" },
  { path: "/sample-itinerary", priority: 0.7, changeFrequency: "yearly" },
  { path: "/book", priority: 0.6, changeFrequency: "monthly" },
  { path: "/flight-booking-assistance", priority: 0.5, changeFrequency: "monthly" },
  { path: "/transfers", priority: 0.5, changeFrequency: "monthly" },
  { path: "/esim", priority: 0.5, changeFrequency: "monthly" },
  { path: "/travel-insurance", priority: 0.5, changeFrequency: "monthly" },
  { path: "/lizensk", priority: 0.6, changeFrequency: "monthly" },
  // Who is behind the site. Indexed for the same reason /verification is: it
  // is one of the two pages a cautious person reads before trusting the rest.
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
] as const;

export type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export type SitemapEntry = {
  path: string;
  priority: number;
  changeFrequency: ChangeFrequency;
};

/**
 * Every public address, in one list.
 *
 * Built from the SAME sources the pages themselves are built from —
 * `generateStaticParams` on each route reads these exact lists — so a town that
 * exists has a line here by construction, and one that is removed loses it
 * without anybody remembering to.
 */
export function publicPaths(): SitemapEntry[] {
  const entries: SitemapEntry[] = [...STATIC_PAGES];

  // The detailed city guides live at the root: /uman, /lizensk. Deliberately,
  // because that is what somebody types.
  for (const guide of cityGuides) {
    entries.push({ path: `/${guide.slug}`, priority: 0.8, changeFrequency: "monthly" });
  }
  for (const place of bulkDestinations) {
    entries.push({ path: heritageTownHref(place.slug), priority: 0.6, changeFrequency: "monthly" });
  }
  for (const cemetery of cemeteries) {
    entries.push({ path: `/cemeteries/${cemetery.slug}`, priority: 0.7, changeFrequency: "monthly" });
  }
  for (const destination of vacationDestinations) {
    entries.push({ path: vacationDestinationHref(destination.slug), priority: 0.8, changeFrequency: "monthly" });
  }
  for (const tzaddik of allTzaddikim()) {
    entries.push({ path: `/tzaddikim/${tzaddik.slug}`, priority: 0.7, changeFrequency: "monthly" });
  }

  // A guide and a bulk destination can share a slug — the detailed one wins on
  // the site, and two <loc> lines for one address is a duplicate either way.
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.path) || isPrivatePath(entry.path)) return false;
    seen.add(entry.path);
    return true;
  });
}
